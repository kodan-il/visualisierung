import {
    documentToWords,
    inverseDocumentFrequency,
    tfidf,
  } from "./src/wordvector.js";
import { wordcloud } from "./src/wordcloud.js";

import * as d3 from "d3"
import { updateWordCloud } from './index.js';
import { hideWorldCloud } from "./index.js";

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

    const width = 1000;
    const height = 800;
    const margin = { top: 120, right: 0, bottom: 100, left: 0 };

    svg.attr("width", 1000) // Example
   .attr("height", 800)
   .style("margin", "0 auto");
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
        .attr("class", "level")
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
        .text((d) => d)
        .style('cursor', 'pointer')
        .on("click", function(event, d) {
            const fontWeight = window.getComputedStyle(this).fontWeight;
            const genreText = this.textContent;

            if (fontWeight === "700" || fontWeight === "bold") {
                this.style.fontWeight = "normal";
                hideWorldCloud();

                //TODO: unfilter target genre in set visualization

            } else {
                d3.selectAll("text.genre").style("font-weight", "normal");
                d3.select(this).style("font-weight", "bold");

                updateWordCloud(
                    movie_corpus,
                    genreText,
                    15,
                    15,
                    color(genreText)
                );

                //TODO: filter target genre in set visualization
            }
        });

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
                .attr("d", line([
                    [x, yTop],
                    [x, yBottom - 30],
                    [xG, yBottom]
                ]))
                .attr("fill", "none")
                .attr("stroke", color(genre))
                .attr("stroke-width", Math.max(0.5, Math.sqrt(val) * 0.7))
                .attr("stroke-opacity", 0.5);
        });
    });



    console.log("✅ Horizontal Set Membership Tree rendered.");
}