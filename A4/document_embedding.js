import {
    documentToWords,
    inverseDocumentFrequency,
    tfidf,
  } from "./src/wordvector.js";
import { wordcloud } from "./src/wordcloud.js";

import * as d3 from "d3"

export function document_embedding({svg, movie_corpus}) {
    // log the corpus, so that you can analyse its stucture in the browser
    console.log(movie_corpus);

 
}