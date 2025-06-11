import * as d3 from "d3"
import {loadMoviesDataset} from "./src/movies.js";
import {document_embedding} from "./document_embedding.js";
import cloud from "d3-cloud";

function renderWordCloud(words, color) {

    //console.log(words)
    const width = 500;
    const height = 500;

    // Select the SVG container for the word cloud
    const svg = d3
        .select(`#wordcloud`)
        .attr("width", width)
        .attr("height", height)
        .style("margin", "0 auto")
        .style("visibility", "visible");

    svg.selectAll("*").remove();

    // Select the tooltip div
    const tooltip = d3.select("#tooltip");

    const maxFrequency = Math.max(...words.map(([_, frequency]) => frequency));

    const minFontSize = 10;
    const maxFontSize = 90;
    const layout = cloud()
        .size([width, height])
        .words(
            words.map(([text, frequency]) => {
              const size = minFontSize + (Math.sqrt(frequency) / Math.sqrt(maxFrequency)) * (maxFontSize - minFontSize);
              return {
                text,
                size: minFontSize + (frequency / maxFrequency) * (maxFontSize - minFontSize),
              };
            }))
        .padding(5)
        .rotate(() => (Math.random() > 0.5 ? 0 : 90)) // Randomly rotate words
        .font("Arial")
        .fontSize((d) => d.size)
        .on("end", (drawData) => {
            svg
                .append("g")
                .attr("transform", `translate(${width / 2}, ${height / 2})`)
                .selectAll("text")
                .data(drawData)
                .enter()
                .append("text")
                .style("font-family", "Impact")
                .style("font-size", (d) => `${d.size}px`)
                .style("fill", () =>
                    color
                )
                .attr("text-anchor", "middle")
                .attr("transform", (d) => `translate(${d.x}, ${d.y}) rotate(${d.rotate})`)
                .text((d) => d.text)
                .on("mouseenter", function (event, d) {
                    const wordData = words.find((word) => word[0] === d.text);

                    if (wordData) {
                        const [text, frequency] = wordData;
                        tooltip
                            .style("display", "block")
                            .html(`<strong>${text}</strong><br>Frequency: ${frequency}`);
                    }

                })
                .on("mousemove", function (event) {
                    // Update tooltip position
                    tooltip
                        .style("left", event.pageX + 10 + "px")
                        .style("top", event.pageY + 10 + "px");
                })
                .on("mouseleave", function () {
                    // Hide the tooltip
                    tooltip.style("display", "none");
                });
        });

    layout.start();
}

export function updateWordCloud(movies, targetGenre, duplicateThreshold, maxWordCount, color) {
    const uniqueGenres = new Set();
    movies.forEach(movie => {
        if (Array.isArray(movie.genres)) {
            movie.genres.forEach(genre => uniqueGenres.add(genre));
        } else if (typeof movie.genres === "string") {
            uniqueGenres.add(movie.genres);
        }
    });

    const uniqueGenresList = Array.from(uniqueGenres);
    //console.log(uniqueGenresList);

    const topSortedWordFrequencies = {};

    uniqueGenresList.forEach(genre => {

        let genreOverview = movies.filter((item) => item.genres.includes(genre)).map((item) => item.overview);

        const wordFrequencies = {};

        genreOverview.forEach(sentence => {
            const words = sentence.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/);
            words.forEach(word => {
                wordFrequencies[word] = (wordFrequencies[word] || 0) + 1;
            });
        });

        topSortedWordFrequencies[genre] = Object.entries(wordFrequencies).sort((a, b) => b[1] - a[1]).slice(0, 100);
    })

    const allTopWords = Object.values(topSortedWordFrequencies).map(genreList =>
        genreList.map(pair => pair[0])
    );

    const wordOccurrences = {};
    allTopWords.forEach(genreWords => {
        genreWords.forEach(word => {
            wordOccurrences[word] = (wordOccurrences[word] || 0) + 1;
        });
    });

    const commonWords = Object.keys(wordOccurrences).filter(word => wordOccurrences[word] >= duplicateThreshold);

    const updatedTopSortedWordFrequencies = {};
    for (const [genre, wordList] of Object.entries(topSortedWordFrequencies)) {
        updatedTopSortedWordFrequencies[genre] = wordList.filter(([word]) => !commonWords.includes(word)).slice(0, maxWordCount);
    }
    //console.log(updatedTopSortedWordFrequencies);

    renderWordCloud(updatedTopSortedWordFrequencies[targetGenre], color);
}

export function hideWorldCloud(){
    d3.select("#wordcloud").style("visibility", "hidden");
}


loadMoviesDataset().then((movies) => {
    document_embedding({
        svg: d3.select("svg#embedding"),
        movie_corpus: movies,
    })

    const uniqueGenres = new Set();
    movies.forEach(movie => {
        if (Array.isArray(movie.genres)) {
            movie.genres.forEach(genre => uniqueGenres.add(genre));
        } else if (typeof movie.genres === "string") {
            uniqueGenres.add(movie.genres);
        }
    });

    const genreColors = {};
    Array.from(uniqueGenres).forEach((genre, index) => {
      genreColors[genre] = d3.schemeCategory10[index % 10];
    });
    //console.log(genreColors);

    //const targetGenre = "Action";
    //updateWordCloud(movies, targetGenre, 15, 15, genreColors[targetGenre]);

    showEmbeddingScatterplot();

});


async function showEmbeddingScatterplot(){
    const width = 800;
    const height = 500;
    const margin = { top: 50, right: 50, bottom: 50, left: 50 };

    const embedding_data = await d3.csv("data/movies-embedding.csv", d3.autoType)
    const movies_data = await d3.csv("data/movies.csv", d => ({
        imdbId: d.imdbId,
        genres: d.genres.split(",").map(g => g.trim()), // Transform genres into an array
    }));

    const genreLookup = new Map();
    movies_data.forEach(movie => {
        genreLookup.set(movie.imdbId, movie.genres);
    });
    const uniqueGenres = Array.from(
        new Set(movies_data.flatMap(movie => movie.genres)) // Get all unique genres
    );
    const colorScale = d3.scaleOrdinal(d3.schemeTableau10).domain(uniqueGenres);

    const scatterData = embedding_data.map(d => ({
        x: d.x,
        y: d.y,
        genres: genreLookup.get(d.imdbId) || [], // Fetch genres for each imdbId
        imdbId: d.imdbId,
    }));

    const svg = d3
        .select("#embeding_plot")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3
        .scaleLinear()
        .domain(d3.extent(scatterData, d => d.x))
        .range([0, width - margin.left - margin.right]);

    const yScale = d3
        .scaleLinear()
        .domain(d3.extent(scatterData, d => d.y))
        .range([height - margin.top - margin.bottom, 0]);

    svg.selectAll("circle")
        .data(scatterData)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))
        .attr("r", 3)
        .attr("fill", "blue")
        .attr("opacity", 0.7)
        .attr("stroke-width", 0.5)
        .on("mouseenter", (event, d) => {
            // Tooltip to show imdbId and genres
            const tooltip = d3.select("#tooltip");
            tooltip.style("display", "block")
                .html(
                    `<strong>IMDB ID:</strong> ${d.imdbId}<br>` +
                    `<strong>Genres:</strong> ${d.genres.join(", ")}`
                )
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY + 10 + "px");
        })
        .on("mousemove", (event) => {
            d3.select("#tooltip")
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY + 10 + "px");
        })
        .on("mouseleave", () => {
            d3.select("#tooltip").style("display", "none");
        });

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    svg.append("g")
        .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
        .call(xAxis);

    svg.append("g").call(yAxis);

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - 10)
        .attr("text-anchor", "middle")
        .text("X");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 20)
        .attr("text-anchor", "middle")
        .text("Y");
}

export function filterGenre(genre){
    d3.selectAll("circle")
        .transition()
        .duration(500)
        .attr("opacity", d => (d.genres && d.genres.includes(genre) ? 0.7 : 0.1));
}

export function resetGenreFilter(){
    d3.selectAll("circle")
        .transition()
        .duration(500)
        .attr("opacity", 0.7);
}