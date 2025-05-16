// load all the modules from d3
import * as d3 from 'd3'

// load the csv data
// d3.autoType loads true to type, such that numbers are loaded as numbers not strings. 
d3.csv('penguins.csv', d3.autoType)
.then(penguins => {
    // remove all entries with NA (no answer/unknown) in any attribute value
    penguins = penguins.filter(penguin => d3.every(Object.values(penguin), value => value != 'NA'));

    // prints the data to the console
    console.log(penguins);

    // selecting the svg
    // here all visual elements should be shown then
    const svg = d3.select('#visualization');

    // TODO: insert your implementation here.

    const width = 800;
    const height = 500;
    const margin = { top: 50, right: 50, bottom: 50, left: 50 };

    svg.attr('viewBox', [0,0,width,height]);

    const nested = d3.rollup(
      penguins,
      v => v.length,
      d => d.island,
      d => d.species
    );

    // --- Groupping and object flattening ---
    const grouped = [];
    for(const[island, speciesMap] of nested.entries()){
        for(const[species, count] of speciesMap.entries()){
            grouped.push({island, species, count});
        }
    }

    // --- scales ---
    const islands = Array.from(new Set(grouped.map(d => d.island)));
    const species = Array.from(new Set(grouped.map(d => d.species)));

    const x0 = d3.scaleBand()
        .domain(islands)
        .range([margin.left, width - margin.right])
        .paddingInner(0.2);

    const x1 = d3.scaleBand()
        .domain(species)
        .range([0, x0.bandwidth()])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(grouped, d => d.count)]).nice()
        .range([height - margin.bottom, margin.top]);

    const color = d3.scaleOrdinal()
        .domain(species)
        .range(d3.schemeSet2);

    // --- bar charts ---
    svg.append('g')
        .selectAll('g')
        .data(grouped.reduce((acc, d) =>{
            let group = acc.find(g => g.island === d.island);
            if(!group){
                group = {island: d.island, values:[]};
                acc.push(group);
            }
            group.values.push(d);
            return acc;
        },[]))
        .join('g')
            .attr('transform', d => `translate(${x0(d.island)},0)`)
        .selectAll('rect')
        .data(d=> d.values)
        .join('rect')
            .attr('x', d => x1(d.species))
            .attr('y', d => y(d.count))
            .attr('width', x1.bandwidth())
            .attr('height', d => y(0) - y(d.count))
            .attr('fill', d => color(d.species));

    // --- labels ---
    svg.append('g')
        .selectAll('g')
        .data(grouped.reduce((acc, d) =>{
            let group = acc.find(g => g.island === d.island);
            if(!group){
                group = {island: d.island, values:[]};
                acc.push(group);
            }
            group.values.push(d);
            return acc;
        },[]))
        .join('g')
            .attr('transform', d => `translate(${x0(d.island)},0)`)
        .selectAll('text')
        .data(d => d.values)
        .join('text')
            .attr('x', d => x1(d.species) + x1.bandwidth() / 2)
            .attr('y', d => y(d.count) - 5)
            .attr('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('fill', '#333')
            .text(d => d.count);

    // --- Axis ---
    svg.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x0));

    svg.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    // --- Legends ---
    const legend = svg.append("g")
        .attr("transform", `translate(${width - 100},${margin.top})`);

    species.forEach((s, i) => {
        const g = legend.append("g").attr("transform", `translate(0,${i * 20})`);

    g.append("rect")
        .attr("width", 15).attr("height", 15)
        .attr("fill", color(s));
    g.append("text")
        .attr("x", 20).attr("y", 12)
        .text(s)
        .style("font-size", "12px");
    });
});