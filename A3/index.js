import * as d3 from 'd3';
// Load data
// With this code you could load mutliple files at once using Promises
const base_path = 'data/'
const files = ['reduced_daily_climate_summary.csv'];//'ABBV.csv', 'AZN.csv', 'BNTX.csv', 'JNJ.csv', 'MRK.csv', 'MRNA.csv', 'NVS.csv', 'PFE.csv', 'SNY.csv'

// We load each file and wait until all files are loaded
Promise.all(files.map(d => d3.csv(base_path+d, d3.autoType)))
.then(loadedData => {
    const data = loadedData[0];
    console.log(data);

    // SVG for showing a color legend, should you use colors
    const legend = d3.select('#legend');
    legend.attr('viewBox', [0, 0, 800, 250]);

    // SVG for plotting the parallel coordinates into
    const pcp = d3.select('#parallel_coordinates');

    // SVG for plotting your time visualization
    const time_vis = d3.select('#timeseries');

    time_vis.attr('viewBox', [0, 0, 800, 500]);

    const width = 800;
    const height = 500;
    const margin = { top: 20, right: 30, bottom: 30, left: 50 };

    // Ensure DATE is parsed
    data.forEach(d => {
      d.DATE = new Date(d.DATE);
    });

    // Extract unique station IDs
    const stations = Array.from(new Set(data.map(d => d.STATION_ID)));

    // Create scales
    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.DATE))
      .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
      .domain(d3.extent(data, d => d.TEMPERATURE_AIR))
      .range([height - margin.bottom, margin.top]);

    const color = d3.scaleOrdinal()
      .domain(stations)
      .range(d3.schemeCategory10);

    // Line generator
    const line = d3.line()
      .x(d => x(d.DATE))
      .y(d => y(d.TEMPERATURE_AIR));

    // Group data by station
    const stationData = stations.map(station => ({
      station: station,
      values: data.filter(d => d.STATION_ID === station)
    }));

    const lines = time_vis.selectAll('.line')
        .data(stationData)
        .join('path')
        .attr('class', 'line')
        .attr('fill', 'none')
        .attr('stroke', d => color(d.station))
        .attr('stroke-width', 1.5)
        .attr('d', d => line(d.values));

    // Draw lines
    time_vis.selectAll('.line')
      .data(stationData)
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', d => color(d.station))
      .attr('stroke-width', 1.5)
      .attr('d', d => line(d.values));

    // Draw axes
    time_vis.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x));

    time_vis.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    const activeStations = new Set(stations);
    // Optional: Add legend
    const legendGroup = legend.selectAll('g')
      .data(stations)
      .join('g')
      .attr('transform', (d, i) => `translate(0,${i * 20})`)
      .style('cursor', 'pointer')
      .on('click', function(event, d) {
        const lineToToggle = time_vis.selectAll('.line')
          .filter(l => l.station === d);

        const currentlyVisible = lineToToggle.style('display') !== 'none';
        lineToToggle.style('display', currentlyVisible ? 'none' : null);

        // Update legend rectangle fill color
        d3.select(this).select('rect')
          .attr('fill', currentlyVisible ? '#eee' : color(d));

        // Update legend text color
        d3.select(this).select('text')
          .style('fill', currentlyVisible ? '#ccc' : '#000');
      });

    legendGroup.append('rect')
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', d => color(d));

    legendGroup.append('text')
      .attr('x', 20)
      .attr('y', 12)
      .text(d => `Station ${d}`)
      .style('font-size', '12px');

    const initialDomain = x.domain();


    // Brushing & Linking
    const brush = d3.brushX()
      .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
      .on('end', event => {
        const selection = event.selection;
        if (!selection){

          x.domain(initialDomain);

          time_vis.selectAll('.line')
            .transition()
            .duration(750)
            .attr('d', d=> line(d.values))

          time_vis.select('.x-axis')
            .transition()
            .duration(750)
            .call(d3.axisBottom(x));
          return;
        }

        const [x0, x1] = selection.map(x.invert);

        x.domain([x0,x1]);

        time_vis.selectAll('.line')
          .transition()
          .duration(750)
          .attr('d',d => line(d.values));

        time_vis.select('.x-axis')
          .transition()
          .duration(750)
          .call(d3.axisBottom(x))
      });

    time_vis.append('g')
        .attr('class','brush')
        .call(brush);
});
