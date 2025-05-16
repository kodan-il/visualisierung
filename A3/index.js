import * as d3 from 'd3';

// Load data
// With this code you could load mutliple files at once using Promises
const base_path = 'data/'
const files = ['reduced_daily_climate_summary.csv'];//'ABBV.csv', 'AZN.csv', 'BNTX.csv', 'JNJ.csv', 'MRK.csv', 'MRNA.csv', 'NVS.csv', 'PFE.csv', 'SNY.csv'

// We load each file and wait until all files are loaded
Promise.all(files.map(d => d3.csv(base_path+d, d3.autoType)))
.then(data => {
    console.log(data);

    // SVG for showing a color legend, should you use colors
    const legend = d3.select('#legend');

    // SVG for plotting the parallel coordinates into
    const pcp = d3.select('#parallel_coordinates');

    // SVG for plotting your time visualization
    const time_vis = d3.select('#timeseries');
})