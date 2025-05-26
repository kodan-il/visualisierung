import * as d3 from "d3"
import { loadMoviesDataset } from "./src/movies.js";
import { document_embedding } from "./document_embedding.js";


loadMoviesDataset().then((movies) => {
  document_embedding({
    svg: d3.select("svg#embedding"),
    movie_corpus: movies,
  })
});
