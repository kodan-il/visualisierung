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
        .style("border", "1px solid #ddd")
        .style("margin", "0 auto")
        .style("visibility", "visible");

    svg.selectAll("*").remove(); // Clear previous contents of the SVG

    // Select the tooltip div
    const tooltip = d3.select("#tooltip");

    const maxFrequency = Math.max(...words.map(([_, frequency]) => frequency));

    const minFontSize = 1; // Set the smallest font size
    const maxFontSize = 50; // Set the largest font size
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
                // Add event listeners for tooltip
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
                    // Update tooltip position based on mouse movement
                    tooltip
                        .style("left", event.pageX + 10 + "px") // Offset to the right of the mouse
                        .style("top", event.pageY + 10 + "px"); // Offset slightly below the mouse
                })
                .on("mouseleave", function () {
                    // Hide the tooltip when the mouse leaves the word
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
});