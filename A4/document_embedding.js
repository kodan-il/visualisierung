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

    const genreCounts = new Map();
    const genreTotals = new Map();
    const genreLevelLinks = new Map();

    movie_corpus.forEach((movie) => {
        if (!Array.isArray(movie.genres)) return;
        const genres = movie.genres.map((g) => g.trim());
        const count = genres.length;

        genreCounts.set(count, (genreCounts.get(count) || 0) + 1);

        if (!genreLevelLinks.has(count)) {
            genreLevelLinks.set(count, new Map());
        }

        genres.forEach((g) => {
            genreTotals.set(g, (genreTotals.get(g) || 0) + 1);
            const map = genreLevelLinks.get(count);
            map.set(g, (map.get(g) || 0) + 1);
        });
    });

    const allLevels = Array.from(genreCounts.keys()).sort((a, b) => a - b);
    const allGenres = Array.from(genreTotals.keys()).sort();

    const width = 1400;
    const height = 900;
    const margin = { top: 120, right: 100, bottom: 180, left: 100 };

    svg.attr("width", width).attr("height", height);
    svg.selectAll("*").remove();
    const g = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);

    const color = d3.scaleOrdinal(d3.schemeTableau10);

    const yBarScale = d3.scaleLinear()
        .domain([0, d3.max(allLevels.map((l) => genreCounts.get(l)))])
        .range([0, 100]);

    const xLevelScale = d3.scaleBand()
        .domain(allLevels.map((l) => l.toString()))
        .range([0, width - margin.left - margin.right])
        .padding(0.2);

    const xGenreScale = d3.scalePoint()
        .domain(allGenres)
        .range([0, width - margin.left - margin.right])
        .padding(1);

    // Bar chart
    g.append("g")
        .selectAll("rect")
        .data(allLevels)
        .join("rect")
        .attr("x", (d) => xLevelScale(d.toString()))
        .attr("y", (d) => -yBarScale(genreCounts.get(d)))
        .attr("width", xLevelScale.bandwidth())
        .attr("height", (d) => yBarScale(genreCounts.get(d)))
        .attr("fill", "steelblue");

    // Bar labels
    g.append("g")
        .selectAll("text.bar")
        .data(allLevels)
        .join("text")
        .attr("class", "bar")
        .attr("x", (d) => xLevelScale(d.toString()) + xLevelScale.bandwidth() / 2)
        .attr("y", (d) => -yBarScale(genreCounts.get(d)) - 8)
        .attr("text-anchor", "middle")
        .attr("font-size", 12)
        .attr("font-weight", "bold")
        .text((d) => genreCounts.get(d));

    // Level labels
    g.append("g")
        .selectAll("text.level")
        .data(allLevels)
        .join("text")
        .attr("class", "level-label")
        .attr("x", (d) => xLevelScale(d.toString()) + xLevelScale.bandwidth() / 2)
        .attr("y", 10)
        .attr("text-anchor", "middle")
        .attr("font-weight", "bold")
        .attr("font-size", 14)
        .text((d) => `${d} genre`);

    // Genre labels below
    g.append("g")
        .selectAll("text.genre")
        .data(allGenres)
        .join("text")
        .attr("class", "genre")
        .attr("x", (d) => xGenreScale(d))
        .attr("y", height - margin.top - margin.bottom + 40)
        .attr("text-anchor", "middle")
        .attr("font-size", 12)
        .attr("transform", (d) => `rotate(-45, ${xGenreScale(d)}, ${height - margin.top - margin.bottom + 40})`)
        .text((d) => d);

    const line = d3.line()
        .x((d) => d[0])
        .y((d) => d[1])
        .curve(d3.curveBundle.beta(0.85));

    allLevels.forEach((lvl) => {
        const x = xLevelScale(lvl.toString()) + xLevelScale.bandwidth() / 2;
        const map = genreLevelLinks.get(lvl);
        if (!map) return;

        map.forEach((val, genre) => {
            const xG = xGenreScale(genre);
            const yTop = +25;
            const yBottom = height - margin.top - margin.bottom - 20;

            g.append("path")
                .attr("class", "genre-link")
                .attr("data-genre", genre)
                .attr("data-level", lvl)
                .attr("d", line([
                    [x, yTop],
                    [x, yBottom - 30],
                    [xG, yBottom]
                ]))
                .attr("fill", "none")
                .attr("stroke", color(genre))
                .attr("stroke-width", Math.max(0.5, Math.sqrt(val) * 0.7))
                .attr("stroke-opacity", 0.5);

            // Interactivity: on click genre label
            g.selectAll("text.genre")
                .style("cursor", "pointer")
                .on("click", function (event, selectedGenre) {
                    g.selectAll(".genre-link")
                        .transition()
                        .duration(300)
                        .style("stroke-opacity", function () {
                            return d3.select(this).attr("data-genre") === selectedGenre ? 0.9 : 0.1;
                        });
//                })
//                .on("click", function () {
//                    g.selectAll(".genre-link")
//                        .transition()
//                        .duration(300)
//                        .style("stroke-opacity", 0.5);
                });

            // Interactivity: on click level label
            g.selectAll("text.level-label")
                .style("cursor", "pointer")
                .on("click", function (event, selectedLevel) {
                    g.selectAll(".genre-link")
                        .transition()
                        .duration(300)
                        .style("stroke-opacity", function () {
                            return +d3.select(this).attr("data-level") === selectedLevel ? 0.9 : 0.1;
                        });
//                })
//                .on("click", function () {
//                    g.selectAll(".genre-link")
//                        .transition()
//                        .duration(300)
//                        .style("stroke-opacity", 0.5);
                });
        });
    });
    svg.on("click", function(event) {
      // Jika klik terjadi langsung di SVG, bukan pada child element
      if (event.target === this) {
        g.selectAll(".genre-link")
          .transition()
          .duration(300)
          .style("stroke-opacity", 0.5);
      }
    });
    console.log("✅ Horizontal Set Membership Tree rendered.");
}