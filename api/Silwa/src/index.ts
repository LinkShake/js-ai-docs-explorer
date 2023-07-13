import * as dotenv from "dotenv";
dotenv.config();
import fastify, { FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import { AzureKeyCredential, SearchClient } from "@azure/search-documents";
import { doCognitiveQuery, optimizeQuery } from "../../helpers";
import { clerkClient, clerkPlugin } from "@clerk/fastify";
import * as sql from "mssql";

async function start() {
  const app = fastify();

  await app.register(cors, {
    origin: [
      "http://localhost:3000",
      "http://localhost:8000/api/AskChatGPT/*",
      "*",
      "https://silwa-ai-docs-explorer.vercel.app",
      "https://askchatgpt.onrender.com/api/AskChatGPT/*",
    ],
    allowedHeaders: ["Authorization", "Content-Type"],
  });

  await app.register(clerkPlugin);

  app.post(
    "/cognitive/:query/:index",
    async function (req: FastifyRequest, reply) {
      try {
        //@ts-ignore
        const { query, index } = req.params;
        const possibleIndexes = JSON.parse(req?.body as string).possibleIndexes;
        const useAllIndexes = JSON.parse(req?.body as string).useAllIndexes;
        const userId = JSON.parse(req?.body as string).userId;
        if (!userId) {
          reply.status(401).send({ msg: "User not authenticated" });
          return;
        }
        //retrieve user data from clerk
        const user = await clerkClient.users.getUser(userId);
        if (!user) {
          reply.status(401).send({ msg: "User not authenticated" });
          return;
        }
        //if the user wants to search all indexes and the possibleIndexes array is not empty, we retrieve data from each index of cognitive search
        if (
          Array.isArray(possibleIndexes) &&
          possibleIndexes.every((currIdx) => currIdx) &&
          useAllIndexes
        ) {
          const res: any[] = await Promise.all(
            possibleIndexes.map(async (currIdx: string) => {
              return await doCognitiveQuery(query, currIdx);
            })
          );

          //checking if array is not empty
          if (res.every((i) => i.length === 0))
            reply.status(404).send({ ok: false });

          //sorting results based on score
          return JSON.stringify({
            data: res
              .sort((a, b) => b.score - a.score)
              .map(({ content }: { content: string }) => content),
          });
        } else {
          const idx = process.env.INDEX as string;
          const endpoint = process.env.SEARCH_ENDPOINT as string;
          const api_key = process.env.API_KEY as string;

          const optimizedQuery = optimizeQuery(query);
          const credentials = new AzureKeyCredential(api_key);
          const client = new SearchClient(endpoint, index || idx, credentials);

          let results = await client.search(optimizedQuery, {
            highlightFields: "content",
            top: 1,
          });

          let res = [];

          for await (const result of results.results) {
            //@ts-ignore
            for (const curr_highlight of result.highlights?.content) {
              res.push(curr_highlight);
            }
          }

          //if there some cognitive search data return them
          if (res.length) return JSON.stringify({ data: res });
          //if not redo the process without stemming (sometimes this can be the issue)
          else {
            results = await client.search(optimizeQuery(query, false), {
              highlightFields: "content",
              top: 1,
            });

            for await (const result of results.results) {
              //@ts-ignore
              for (const curr_highlight of result.highlights?.content) {
                res.push(curr_highlight);
              }
            }

            if (!res.length) {
              results = await client.search(query, {
                highlightFields: "content",
                top: 1,
              });

              for await (const result of results.results) {
                //@ts-ignore
                for (const curr_highlight of result.highlights?.content) {
                  res.push(curr_highlight);
                }
              }

              if (!res.length) {
                reply.status(404).send({ ok: false });
              }

              return JSON.stringify({ data: res });
            }

            return JSON.stringify({ data: res });
          }
        }
      } catch (err) {
        return new Error(`Err: ${err}`);
      }
    }
  );

  app.get("/sql/:id", async (req, reply) => {
    try {
      //@ts-ignore
      const { id } = req.params;
      const config: sql.config = {
        user: "Nicola",
        password: process.env.PASS,
        //prettier-ignore
        server: "stesi-sql-server.database.windows.net",
        database: "SilwaAiDocsExplorer",
        options: {
          encrypt: true,
        },
      };

      await sql.connect(config);

      const result = await sql.query(
        `SELECT IndexId FROM CognitiveIndexConfiguration WHERE UserId=\'${id}\'`
      );

      return JSON.stringify({ data: result.recordset });
    } catch (err) {
      reply.status(404).send({ ok: false });
    }
  });

  app.listen({ port: 4000 });
}

start()
  .then(() => console.log("Silwa api running"))
  .catch((err) => console.error(err));
