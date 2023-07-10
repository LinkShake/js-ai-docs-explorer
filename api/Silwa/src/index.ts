import * as dotenv from "dotenv";
dotenv.config();
import fastify, { FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import { AzureKeyCredential, SearchClient } from "@azure/search-documents";
import { doCognitiveQuery, optimizeQuery } from "../../helpers";
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

  app.post(
    "/cognitive/:query/:index",
    async function (req: FastifyRequest, reply) {
      console.log("endpoint hit");
      try {
        //@ts-ignore
        const { query, index } = req.params;
        //@ts-ignore
        const possibleIndexes = req?.body.possibleIndexes;
        if (
          Array.isArray(possibleIndexes) &&
          possibleIndexes.every((currIdx) => currIdx)
        ) {
          const res: any[] = await Promise.all(
            possibleIndexes.map(async (currIdx: string) => {
              return await doCognitiveQuery(query, currIdx);
            })
          );

          if (
            res.every((i) => {
              console.log(i);
              return i.length === 0;
            })
          )
            reply.status(404).send({ ok: false });

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
          console.log("GUARDA QUI PROGRAMMATORE: ", optimizedQuery);
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
            const r = optimizeQuery(query, false);
            console.log(r);
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
                console.log("no results: ", res);
                console.log("no results: ", res.length);
                reply.status(404).send({ ok: false });
              }

              return JSON.stringify({ data: res });
            }

            console.log(res);

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
