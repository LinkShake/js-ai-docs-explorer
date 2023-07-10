import * as dotenv from "dotenv";
dotenv.config();
import fetch from "node-fetch";
import LanguageDetect from "languagedetect";
import { Configuration, OpenAIApi } from "openai";
import { Server } from "socket.io";
import { doMaxTokensCalc } from "../../helpers";

interface GptMessage {
  role: "assistant" | "user" | "function" | "system";
  content: string;
}

const io = new Server({
  cors: {
    origin: [
      "http://localhost:3000",
      "https://silwa-ai-docs-explorer.vercel.app",
    ],
  },
});

const config = new Configuration({
  organization: "org-JhTBz8SPoOJ4KHpwSAGwWqXz",
  apiKey: process.env.OPENAI_KEY,
});

const openai = new OpenAIApi(config);

let msgs: GptMessage[] = [];

io.on("connection", (socket) => {
  socket.on("askChatGPT", async (data) => {
    console.log("enpoint hit");
    const { query, temperature, model, variant, index, possibleIndexes } = data;
    const threshold = model ? doMaxTokensCalc(model) : 16000;
    console.log("index: ", index);
    //console.log("msg: ", ms);
    //const msgs: GptMessage[] = [] as GptMessage[];
    try {
      if (typeof query !== "string" || query === "") {
        socket.emit("err", { msg: "Not valid query" });
      }
      const langDetector = new LanguageDetect();
      const prob = langDetector.detect(query);
      const res = await fetch(
        `http://localhost:4000/cognitive/${query
          .replaceAll("/", ",")
          .replaceAll("?", "")}/${index}`,
        {
          method: "POST",
          body: JSON.stringify({
            possibleIndexes,
          }),
        }
      );
      console.log(res);
      if (res.ok === false) {
        socket.emit("err", { msg: "No data", originalQuery: query });
      } else {
        /*if (!res.ok) {
        //socket.emit("err", { msg: "No data", originalQuery: query });
      } else {*/
        const apiData = await res.json();
        console.log("apiData: ");
        let { data: parsedData }: { data: string[] } = apiData;
        //checking if parsedData does not goes over the max token limit for gpt model
        if (parsedData.length > 0) {
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

        console.log(newQuery);

        msgs.push({ role: "user", content: newQuery });

        let cont = msgs.map((x) => x.content + x.role).join();
        //msgs.forEach((x) => (cont += x.role + x.content));
        while (cont.length > threshold) {
          msgs = msgs.splice(1);
          cont = "";
          cont = msgs.map((x) => x.role + x.content).join();
        }

        //console.log(msgs.filter(({ role }) => role === "system"));
        const { data } = await openai.createChatCompletion(
          {
            model: model || "gpt-3.5-turbo-16k",
            messages: msgs,
            temperature: temperature || 0.1,
            stream: true,
          },
          {
            responseType: "stream",
          }
        );

        socket.emit("askChatGPTResponse", {
          data: `${
            prob[0][0] === "italian"
              ? "Secondo la documentazione: "
              : "The documentation says: "
          }`,
          originalQuery: query,
          variant,
        });

        let gptRes = `${
          prob[0][0] === "italian"
            ? "Secondo la documentazione: "
            : "The documentation says: "
        }`;

        //@ts-ignore
        data.on("data", (text) => {
          const lines = text
            .toString()
            .split("\n")
            //@ts-ignore
            .filter((line) => line.trim() !== "");
          for (const line of lines) {
            const message = line.replace(/^data: /, "");
            if (message === "[DONE]") {
              msgs.push({ role: "system", content: gptRes });
              //console.log(msgs.filter(({ role }) => role === "system"));
              socket.emit("askChatGPTResponse", { data: "DONE" });
              return;
            }
            try {
              const { choices } = JSON.parse(message);
              //console.log(choices);
              const progressiveData = choices[0]?.delta?.content;
              gptRes += progressiveData;
              socket.emit("askChatGPTResponse", {
                data: progressiveData,
                originalQuery: query,
                finishReason: choices[0]?.finish_reason,
              });
            } catch (err) {
              socket.emit("err", { msg: err });
            }
          }
        });

        //@ts-ignore
        data.on("close", () => {});
        //}
      }
    } catch (err) {
      socket.emit("err", { msg: err });
    }
  });
});

io.listen(8000);
