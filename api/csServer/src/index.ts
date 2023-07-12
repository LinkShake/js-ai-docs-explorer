import * as dotenv from "dotenv";
dotenv.config();
import { fastify } from "fastify";
import cors from "@fastify/cors";
import fetch from "node-fetch";
import { Configuration, OpenAIApi } from "openai";
import LanguageDetect from "languagedetect";
import { open } from "fs";
import { dot } from "node:test/reporters";

let msgs = [] as any[];

async function start() {
  const app = fastify();

  const config = new Configuration({
    organization: "org-JhTBz8SPoOJ4KHpwSAGwWqXz",
    apiKey: process.env.OPENAI_KEY,
  });

  const openai = new OpenAIApi(config);

  await app.register(cors, {
    origin: "*",
    allowedHeaders: ["Authorization", "Content-Type"],
  });

  app.post("/askChatGPT", async (req, reply) => {
    console.log("endpoint hit");
    console.log(typeof req?.body);
    //@ts-ignore
    const query: string = req?.body.query;
    //@ts-ignore
    const userId = req?.body.userId;
    //@ts-ignore
    const possibleIndexes = req?.body.possibleIndexes;
    //@ts-ignore
    const index = req?.body.index;
    //@ts-ignore
    const useAllIndexes = req?.body.useAllIndexes;
    console.log("done parsing");

    const threshold = 16000;
    try {
      if (typeof query !== "string" || query === "") {
        console.log("Not valid query");
        reply.status(401).send({ err: "No auth" });
        //return JSON.stringify({ err: "No auth" });
      }
      const langDetector = new LanguageDetect();
      const prob = langDetector.detect(query);
      const res = await fetch(
        `http://localhost:4000/cognitive/${query
          //@ts-ignore
          .replaceAll("/", ",")
          .replaceAll("?", "")}/${index}`,
        {
          method: "POST",
          body: JSON.stringify({
            possibleIndexes,
            userId,
            useAllIndexes,
          }),
        }
      );
      if (res.status === 401) {
        reply.status(401).send({ err: "No auth" });
      }

      const apiData = await res.json();
      let { data: parsedData }: { data: string[] } = apiData;
      if (parsedData)
        //checking if parsedData does not goes over the max token limit for gpt model
        while (parsedData.toString().length >= threshold) {
          let delta = parsedData.toString().length - threshold;
          if (parsedData[parsedData.length - 1] === "") {
            parsedData = parsedData.slice(0, parsedData.length - 1);
          }

          parsedData[parsedData.length - 1] = parsedData[
            parsedData.length - 1
          ].slice(
            0,
            parsedData[parsedData.length - 1].length - delta > 0
              ? parsedData[parsedData.length - 1].length - delta
              : 0
          );
        }
      //possibility of having a response either in italian (if your query matches italian) or english in any other case
      const newQuery = `${
        parsedData?.length
          ? `${query}, ${
              prob[0][0] === "italian" ? "sapendo che" : "knowing that"
            }: ${parsedData?.slice(
              0,
              parsedData?.length < 18 ? parsedData?.length : 18
            )}`
          : query
      }`;

      //updating chat history with user query
      msgs.push({ role: "user", content: newQuery });

      let cont = msgs.map((x) => x.content + x.role).join();
      //checking if the content goes over the max token limit for gpt model
      while (cont.length > threshold) {
        msgs = msgs.slice(1);
        cont = "";
        cont = msgs.map((x) => x.role + x.content).join();
      }

      const gptRes = await openai.createChatCompletion({
        model: "gpt-3.5-turbo-16k",
        messages: msgs,
      });
      console.log("got gptRes");

      reply.status(200).send({ data: gptRes.data.choices[0].message?.content });
      //ts-ignore
      //return JSON.stringify({ data: gptRes.data.choices[0].message?.content });
    } catch (err) {
      console.log(err);
    }
  });

  app.listen({ port: 5000 });
}

start()
  .then(() => console.log("csServer started"))
  .catch((err) => console.log("err: ", err));
