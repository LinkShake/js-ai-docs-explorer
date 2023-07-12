import * as dotenv from "dotenv";
dotenv.config();
import LanguageDetect from "languagedetect";
//@ts-ignore
import { StemmerIt, StopwordsIt } from "@nlpjs/lang-it";
//@ts-ignore
import { StemmerEn, StopwordsEn } from "@nlpjs/lang-en";
import { AzureKeyCredential, SearchClient } from "@azure/search-documents";

interface QueryResult {
  score: number;
  content?: string;
}

//takes the natural language query and remove all stopping words
//OLD FUNCTION
/*export const formatQueryForSearch = (nlQuery: string) => {
  const nlQueryArr = nlQuery
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]'/g, "")
    .split(" ");

  let optimizedQuery = "";
  for (const item of nlQueryArr) {
    if (!(itStoppingWords.includes(item) || enStoppingWords.includes(item)))
      optimizedQuery += `${item} `;
  }

  return optimizedQuery;
};*/

//new function: does remove of stopping words and, in case, stemming
//this should optimized the query string for cognitive search
export const optimizeQuery = (nlQuery: string, useStemming: boolean = true) => {
  const langDetector = new LanguageDetect();
  const prob = langDetector.detect(nlQuery);
  let optimizedQuery = "";
  if (prob[0][0] == "italian") {
    const stemmer = new StemmerIt();
    stemmer.stopwords = new StopwordsIt();
    if (useStemming) {
      //does stemming and removes stopping words
      const arr = stemmer.tokenizeAndStem(nlQuery, false);
      arr.forEach((item: string) => {
        optimizedQuery += `${item} `;
      });
    } else {
      //only removes stopping words
      const stopwords = new StopwordsIt();
      const arr = stopwords.removeStopwords(nlQuery.split(" "));
      arr.forEach((item: string) => {
        optimizedQuery += `${item} `;
      });
    }
    return optimizedQuery;
  } else if (prob[0][0] == "english") {
    const stemmer = new StemmerEn();
    stemmer.stopwords = new StopwordsEn();
    if (useStemming) {
      const arr = stemmer.tokenizeAndStem(nlQuery, false);
      arr.forEach((item: string) => {
        optimizedQuery += `${item} `;
      });
    } else {
      const stopwords = new StopwordsEn();
      const arr = stopwords.removeStopwords(nlQuery.split(" "));
      arr.forEach((item: string) => {
        optimizedQuery += `${item} `;
      });
    }
    return optimizedQuery;
  } else {
    return nlQuery;
  }
};

//cognitive query helper
export const doCognitiveQuery = async (query: string, currIndex: string) => {
  const endpoint = process.env.SEARCH_ENDPOINT as string;
  const api_key = process.env.API_KEY as string;

  const optimizedQuery = optimizeQuery(query);
  const credentials = new AzureKeyCredential(api_key);
  const client = new SearchClient(endpoint, currIndex, credentials);

  let results = await client.search(optimizedQuery, {
    highlightFields: "content",
    top: 1,
  });

  let res: QueryResult[] = [];

  for await (const result of results.results) {
    res.push({ score: result.score });
    //@ts-ignore
    for (const curr_highlight of result.highlights?.content) {
      res[0].content += curr_highlight;
    }
  }

  //if there some cognitive search data return them
  if (res.length) return res[0];
  //if not redo the process without stemming (sometimes this can be the issue)
  else {
    results = await client.search(optimizeQuery(query, false), {
      highlightFields: "content",
      top: 1,
    });

    for await (const result of results.results) {
      res.push({ score: result.score });
      //@ts-ignore
      for (const curr_highlight of result.highlights?.content) {
        res[0].content += curr_highlight;
      }
    }

    if (!res.length) {
      results = await client.search(query, {
        highlightFields: "content",
        top: 1,
      });

      for await (const result of results.results) {
        res.push({ score: result.score });
        //@ts-ignore
        for (const curr_highlight of result.highlights?.content) {
          res[0].content += curr_highlight;
        }
      }

      if (!res.length) return [];

      return res[0];
    }

    return res[0];
  }
};

//max tokens calc for gpt model
export const doMaxTokensCalc = (model: string) => {
  if (model === "gpt-3.5-turbo-16k") {
    return 16000;
  } else {
    return 4000;
  }
};
