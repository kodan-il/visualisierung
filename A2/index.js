import * as d3 from "d3";


// load and filter the dataset (option 2, see A1 for option 1)
const penguins = await d3.csv("data/penguins.csv", d3.autoType)
    .then(penguins => penguins.filter(penguin => d3.every(Object.values(penguin), value => value !== 'NA')))

console.log(penguins)

const svg = d3.select('#visualization');
// Setup SVG
const width = 1000;
const height = 600;

svg.attr('viewBox', [0, 0, width, height]);

const menuOptions = [
    "Q1: Species on Islands",
    "Q2: Distinguish Species",
    "Q3: Attributes vs Island",
    "Q4: Gender Differences"
];

let currentView = null;

// Draw menu as clickable text
svg.selectAll('.menu-option')
    .data(menuOptions)
    .join('text')
    .attr('class', 'menu-option')
    .attr('x', 30)
    .attr('y', (d, i) => 40 + i * 30)
    .text(d => d)
    .style('font-size', '14px')
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
        currentView = d;
        updateVisualization(currentView);  // fungsi utama
    });

// ------------------
// update every chart clicked
// ------------------

function updateVisualization(view) {
    // clear old chart transition -> following the SVG declared at the start of function
    svg.selectAll('.chart')
        .transition()
        .duration(500)
        .style('opacity', 0)
        .remove();

    setTimeout(() => {
        if (view.includes("Q1")) {
            drawQuestion_Q1();        // species vs island
        } else if (view.includes("Q2")) {
            drawQuestion_Q2();         // bill_length vs bill_depth colored by species
        } else if (view.includes("Q3")) {
            drawQuestion_Q3();         // heatmap of body mass/flipper length vs island
        } else if (view.includes("Q4")) {
            drawQuestion_Q4();      // grouped bar: gender vs attribute, split by species
        }

    }, 300);
}

function drawQuestion_Q1() {
    const width = 800;
    const height = 500;
    const margin = {top: 250, right: 50, bottom: 10, left: 150};


    const nested = d3.rollup(
        penguins,
        v => v.length,
        d => d.island,
        d => d.species
    );

    // Groupping and object flattening
    const grouped = [];
    for (const [island, speciesMap] of nested.entries()) {
        for (const [species, count] of speciesMap.entries()) {
            grouped.push({island, species, count});
        }
    }

    // scales
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

    const chartGroup = svg.append('g').classed('chart', true);
    // --- bar charts ---
    chartGroup.selectAll('g.bar-group')
        .data(grouped.reduce((acc, d) => {
            let group = acc.find(g => g.island === d.island);
            if (!group) {
                group = {island: d.island, values: []};
                acc.push(group);
            }
            group.values.push(d);
            return acc;
        }, []))
        .join('g')
        .attr('transform', d => `translate(${x0(d.island)},0)`)
        .selectAll('rect')
        .data(d => d.values)
        .join('rect')
        .attr('x', d => x1(d.species))
        .attr('y', d => y(d.count))
        .attr('width', x1.bandwidth())
        .attr('height', d => y(0) - y(d.count))
        .attr('fill', d => color(d.species))
        .on("click", function (event, d) {
            showQ1ScatterBreakdown(d.island, d.species);
        });
    ;

    // --- labels ---
    chartGroup.selectAll('g.label-group')
        .data(grouped.reduce((acc, d) => {
            let group = acc.find(g => g.island === d.island);
            if (!group) {
                group = {island: d.island, values: []};
                acc.push(group);
            }
            group.values.push(d);
            return acc;
        }, []))
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
    chartGroup.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x0));

    chartGroup.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    // --- Legends ---
    const legend = chartGroup.append("g")
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
}

function drawQuestion_Q2() {

}

function drawQuestion_Q3() {
    const width = 800;
    const height = 500;
    const margin = {top: 120, right: 50, bottom: 100, left: 100};

    // Groupingg
    const numericVars = ["bill_length_mm", "bill_depth_mm", "flipper_length_mm", "body_mass_g"];

    const chartGroup = svg.append("g").classed("chart", true).attr("transform", `translate(${margin.left},${margin.top})`);


    // group by "species_sex"
    const grouped = d3.rollups(
        penguins,
        rows => {
            const avg = {};
            numericVars.forEach(attr => {
                avg[attr] = d3.mean(rows, r => r[attr]);
            });
            return avg;
        },
        d => `${d.island}`
    );

    // flat array transformation
    const flatData = [];
    grouped.forEach(([groupKey, avgVals]) => {
        numericVars.forEach(variable => {
            flatData.push({
                group: groupKey,
                variable: variable,
                value: avgVals[variable]
            });
        });
    });

    console.log("Flat data:");
    console.table(flatData);

    // normalized all value
    const normalized = [];
    numericVars.forEach(variable => {
        const vals = flatData.filter(d => d.variable === variable);
        const [minVal, maxVal] = d3.extent(vals, d => d.value);
        vals.forEach(d => {
            const normVal = maxVal === minVal ? 0 : (d.value - minVal) / (maxVal - minVal);
            normalized.push({...d, normalized: normVal});
        });
    });

    console.log("Normalized data:");
    console.table(normalized);

    // scales
    const x = d3.scaleBand()
        .range([margin.left, width - margin.right])
        .domain([...new Set(normalized.map(d => d.group))])
        .padding(0.05);

    const y = d3.scaleBand()
        .range([height - margin.bottom, margin.top])
        .domain(numericVars)
        .padding(0.05);

    const color = d3.scaleSequential()
        .domain([0, 1])
        .interpolator(d3.interpolateReds);

    // Axes
    chartGroup.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(20)")
        .style("text-anchor", "start");

    chartGroup.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    // Rectangles
    chartGroup.selectAll()
        .data(normalized)
        .join("rect")
        .attr("x", d => x(d.group))
        .attr("y", d => y(d.variable))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", d => color(d.normalized))
        .on("click", function (event, d) {
            scatterPlotQ3(d.group, d.variable);
        });
    ;

    // text labels
    chartGroup.selectAll()
        .data(normalized)
        .join("text")
        .attr("class", "cell")
        .attr("x", d => x(d.group) + x.bandwidth() / 2)
        .attr("y", d => y(d.variable) + y.bandwidth() / 2 + 5)
        .attr("text-anchor", "middle")
        .style("fill", "#000")
        .style("font-size", "10px")
        .text(d => d3.format(".1f")(d.value));
}

function drawQuestion_Q4() {
    const width = 800;
    const height = 500;
    const margin = {top: 100, right: 50, bottom: 150, left: 100};

    // Groupingg
    const numericVars = ["bill_length_mm", "bill_depth_mm", "flipper_length_mm", "body_mass_g"];

    const chartGroup = svg.append("g").classed("chart", true).attr("transform", `translate(${margin.left},${margin.top})`);


    // group by "species_sex"
    const grouped = d3.rollups(
        penguins,
        rows => {
            const avg = {};
            numericVars.forEach(attr => {
                avg[attr] = d3.mean(rows, r => r[attr]);
            });
            return avg;
        },
        d => `${d.species}_${d.sex}`
    );

    // flat array transformation
    const flatData = [];
    grouped.forEach(([groupKey, avgVals]) => {
        numericVars.forEach(variable => {
            flatData.push({
                group: groupKey,
                variable: variable,
                value: avgVals[variable]
            });
        });
    });

    console.log("Flat data:");
    console.table(flatData);


    const zoom = d3.zoom()
        .scaleExtent([1, 6])
        .on("zoom", (event) => {
            chartGroup.attr("transform", event.transform);
        });
    svg.call(zoom);

    // normalized all value
    const normalized = [];
    numericVars.forEach(variable => {
        const vals = flatData.filter(d => d.variable === variable);
        const [minVal, maxVal] = d3.extent(vals, d => d.value);
        vals.forEach(d => {
            const normVal = maxVal === minVal ? 0 : (d.value - minVal) / (maxVal - minVal);
            normalized.push({...d, normalized: normVal});
        });
    });

    console.log("Normalized data:");
    console.table(normalized);

    // scales
    const x = d3.scaleBand()
        .range([margin.left, width - margin.right])
        .domain([...new Set(normalized.map(d => d.group))])
        .padding(0.05);

    const y = d3.scaleBand()
        .range([height - margin.bottom, margin.top])
        .domain(numericVars)
        .padding(0.05);

    const color = d3.scaleSequential()
        .domain([0, 1])
        .interpolator(d3.interpolateReds);

    // Axes
    chartGroup.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(20)")
        .style("text-anchor", "start");

    chartGroup.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    // Rectangles
    chartGroup.selectAll()
        .data(normalized)
        .join("rect")
        .attr("x", d => x(d.group))
        .attr("y", d => y(d.variable))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", d => color(d.normalized));

    // text labels
    chartGroup.selectAll()
        .data(normalized)
        .join("text")
        .attr("class", "cell")
        .attr("x", d => x(d.group) + x.bandwidth() / 2)
        .attr("y", d => y(d.variable) + y.bandwidth() / 2 + 5)
        .attr("text-anchor", "middle")
        .style("fill", "#000")
        .style("font-size", "10px")
        .text(d => d3.format(".1f")(d.value));

}

function showQ1ScatterBreakdown(island, species) {
    // Add this for the transition so everytime the chart changes, it changes smoothly
    svg.selectAll('.chart').transition().duration(500).style('opacity', 0).remove();

    const width = 800;
    const height = 500;
    const margin = {top: 100, right: 50, bottom: 150, left: 100};

    // Grouping
    const numericVars = ["bill_length_mm", "bill_depth_mm", "flipper_length_mm", "body_mass_g"];
    const chartGroup = svg.append("g").classed("chart", true).attr("transform", `translate(${margin.left},${margin.top})`);

    const zoom = d3.zoom()
        .scaleExtent([1, 6])
        .on("zoom", (event) => {
            chartGroup.attr("transform", event.transform);
        });
    svg.call(zoom);

    const filtered = penguins.filter(p => p.island === island && p.species === species);

    // Scales
    const x = d3.scaleLinear()
        .domain(d3.extent(filtered, d => d.bill_depth_mm)).nice()
        .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
        .domain(d3.extent(filtered, d => d.bill_length_mm)).nice()
        .range([height - margin.bottom, margin.top]);

    const color = d3.scaleOrdinal()
        .domain(["male", "female"])
        .range(["#5DADE2", "#F1948A"]);

    // Axis
    chartGroup.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x));

    chartGroup.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    // Labels
    chartGroup.append("text")
        .attr("x", width / 2)
        .attr("y", height - 10)
        .style("text-anchor", "middle")
        .text("Bill Depth (mm)");

    chartGroup.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", 20)
        .style("text-anchor", "middle")
        .text("Bill Length (mm)");

    // Circles
    chartGroup.selectAll("circle")
        .data(filtered)
        .join("circle")
        .attr("cx", d => x(d.bill_depth_mm))
        .attr("cy", d => y(d.bill_length_mm))
        .attr("r", 5)
        .attr("fill", d => color(d.sex))
        .attr("opacity", 0.7);

    // Legend
    const legend = chartGroup.append("g")
        .attr("transform", `translate(${width - 150},${margin.top})`);

    ["male", "female"].forEach((sex, i) => {
        const g = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
        g.append("rect").attr("width", 15).attr("height", 15).attr("fill", color(sex));
        g.append("text").attr("x", 20).attr("y", 12).text(sex).style("font-size", "12px");
    });

}

function scatterPlotQ3(selectedIsland, selectedVar) {

    // Bersihkan chart lama (jika ada)
    svg.selectAll(".scatter-group").remove();

    const width = 200;
    const height = 100;
    const margin = {top: 90, right: -650, bottom: 0, left: 550};

    const chartGroup = svg.append("g")
        .attr("class", "scatter-group chart")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Filters based on islands
    const filtered = penguins.filter(d => d.island === selectedIsland);

    // species (categorical)
    const x = d3.scalePoint()
        .domain([...new Set(filtered.map(d => d.species))])
        .range([0, width - margin.left - margin.right])
        .padding(0.5);

    // Chosen variable
    const y = d3.scaleLinear()
        .domain(d3.extent(filtered, d => d[selectedVar])).nice()
        .range([height - margin.bottom, 0]);

    const color = d3.scaleOrdinal()
        .domain([...new Set(filtered.map(d => d.species))])
        .range(d3.schemeSet2);

    // Axis
    chartGroup.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x));

    chartGroup.append("g")
        .call(d3.axisLeft(y));

    // Points
    chartGroup.selectAll("circle")
        .data(filtered)
        .join("circle")
        .attr("cx", d => x(d.species))
        .attr("cy", d => y(d[selectedVar]))
        .attr("r", 5)
        .attr("fill", d => color(d.species))
        .attr("opacity", 0.8);

    /**
     const zoom = d3.zoom()
     .scaleExtent([1, 6])
     .on("zoom", (event) => {
     chartGroup.attr("transform", event.transform);
     });
     svg.call(zoom);
     */
    // Label
    chartGroup.append("text")
        .attr("x", 10)
        .attr("y", -20)
        .style("font-size", "16px")
        .text(`Distribution of "${selectedVar}" in "${selectedIsland}"`);
}
