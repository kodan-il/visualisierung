import * as d3 from "d3";
import winkNLP from "wink-nlp";
import model from "wink-eng-lite-web-model";

const nlp = new winkNLP(model);

export function documentToWords(text) {
  // tokenize  
  const tokens = nlp.readDoc(text.replaceAll('.', '').replaceAll(",","").replaceAll("'s", "").replaceAll('-', '').replaceAll(':', '').replaceAll('/', '').replaceAll('–', '').replaceAll('—', '')).tokens();
  // remove stop words
  const stopwords = tokens.out(nlp.its.stopWordFlag);
  // lemmatize (has the same use as stemming)
  return tokens.out(nlp.its.lemma).filter((_, i) => !stopwords[i]);
}

// wordsPerDocument: array of documents, which are arrays of single words => [[word, word, ...], [word, word, ...], ...]
// RETURN: Map of words matching their idf score
export function inverseDocumentFrequency(wordsPerDocument) {
  const idf = new Map();
  // count documents per word
  wordsPerDocument.forEach((doc) =>
    Array.from(new Set(doc)).forEach((word) =>
      idf.has(word) ? idf.set(word, idf.get(word) + 1) : idf.set(word, 1)
    )
  );
  // normalize to get frequency [0, 1]
  idf.forEach((value, key) => {
    idf.set(key, Math.log(wordsPerDocument.length / value));
  });
  return idf;
}

// words: array of single words => [word, word, word,...]
// idf: Map of words and their idf scores
// RETURN: array of form [[word, score], [word, score], ...]
//        -> sorted in descending order of score (best score first)
export function tfidf(words, idf) {
  //Tip: d3.rollups might help your here
  return d3
    .rollups(
      words,
      (v) => v.length / words.length * idf.get(v[0]),
      (word) => word
    )
    .sort((a, b) => d3.descending(a[1], b[1]));

}