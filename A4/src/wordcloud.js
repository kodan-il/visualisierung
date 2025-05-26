import * as d3 from "d3";
import { cloud } from "./cloudgenerator";
/* Function to draw a word cloud
 * svg: d3 selection of an svg element
 * wordsPerGenre: Map of form {group =>  [[word, frequency], [word, frequency], ...], ...}
 * selection: d3 selection of select element
 */
export function wordcloud(svg, word_counts) {
  const width = 600;
  const height = 600;
  svg.attr("viewBox", [0, 0, width, height]);

  // group element, translated such that the origin is in the middle of the svg
  let g = svg.select('g');
  if(g.empty()) 
    g = svg.append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

  // word size scale, you can play around with the range if you like
  const size = d3.scaleLinear().range([5, 100]);

  const layout = cloud()
    .size([width, height])
    .padding(5)
    .font("Impact")
    .fontSize(function (d) {
      return d.size;
    })
    .on("end", draw);

  // get the 100 most frequent words 
  const words = word_counts.slice(0, 500);

  // console.log(words);

  //adjust the domain of the word size scale
  size.domain(d3.extent(words, (d) => d[1]));
  // call the layout with the words -> layout.words(....)
  layout.words(words.map((d) => ({ text: d[0], size: size(d[1]) })));
  layout.start();

  function draw(words) {
    g.selectAll("text")
      .data(words)
      .join("text") // enter + append
      .style("font-size", function (d) {
        return d.size + "px";
      })
      .style("font-family", "Impact")
      .attr("text-anchor", "middle")
      .attr("transform", function (d) {
        return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
      })
      .text(function (d) {
        return d.text;
      });
  }

}

