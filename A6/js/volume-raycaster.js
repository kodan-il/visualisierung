import { vec3 } from 'gl-matrix';
import { vec4 } from 'gl-matrix';
import { mat3 } from 'gl-matrix';
import { mat4 } from 'gl-matrix';
import { FramerateCalculator } from "./webgl-util.js"
import { ArcballCamera } from "./webgl-util.js"
import { Controller } from "./webgl-util.js"
import { Shader } from "./webgl-util.js"

var cubeStrip = [
	1, 1, 0,
	0, 1, 0,
	1, 1, 1,
	0, 1, 1,
	0, 0, 1,
	0, 1, 0,
	0, 0, 0,
	1, 1, 0,
	1, 0, 0,
	1, 1, 1,
	1, 0, 1,
	0, 0, 1,
	1, 0, 0,
	0, 0, 0
];

var takeScreenShot = false;
var canvas = null;
var transferFunctionCanvas = null;
var transferFunctionStops = null;

var transferFunctionUIWidth = 500;
var transferFunctionUIHeight = 100;
var transferFunctionUIMargin = 20;
var transferFunctionUISVG = null;

var gl = null;
var shader = null;
var transferFunctionShader = null;
var volumeTexture = null;
var transferFunctionTextureHandle = null;
var fileRegex = /.*\/(\w+)_(\d+)x(\d+)x(\d+)_(\w+)\.*/;
var proj = null;
var camera = null;
var projView = null;
var tabFocused = true;
var newVolumeUpload = true;
var samplingRate = 1.0;
var WIDTH = 640;
var HEIGHT = 480;
var volScale = null;
var volDims = null;
var isoValue1 = 0.25;
var isoValue2 = 0.5;
var samplingDistance = 0.02;
var illuminationActive = true;
var binarySearch = false;
var lightPosition = vec3.fromValues(0.0, 2.0, 2.0);
var specularReflectionConstant = 0.5;
var diffuseReflectionConstant = 0.5;
var ambientReflectionConstant = 0.2;
var shininessConstant = 5;
var specularLightIntensity = vec3.fromValues(1.0, 1.0, 1.0);
var diffuseLightIntensity = vec3.fromValues(1.0, 1.0, 1.0);
var ambientLightIntensity = vec3.fromValues(1.0, 1.0, 1.0);
var backgroundColour = vec3.fromValues(0.75, 0.75, 0.75);



var desiredFrameRate = 1000;
var targetFrameTime = 1000.0 / desiredFrameRate;
var lastFrameEndTime = 0;
var lastRenderTime = 0;

const defaultEye = vec3.set(vec3.create(), 0.5, 0.5, 1.5);
const center = vec3.set(vec3.create(), 0.5, 0.5, 0.5);
const up = vec3.set(vec3.create(), 0.0, 1.0, 0.0);

const framerateCalculator = new FramerateCalculator(60); // Use a window size of 60 frames for a 1-second window

const TRANSFER_FUNCTION_TEX_SIZE = 255;

var volumes = {
	"Fuel": "7d87jcsh0qodk78/fuel_64x64x64_uint8.raw",
	"Neghip": "zgocya7h33nltu9/neghip_64x64x64_uint8.raw",
	"Hydrogen Atom": "jwbav8s3wmmxd5x/hydrogen_atom_128x128x128_uint8.raw",
	"Teapot": "w4y88hlf2nbduiv/boston_teapot_256x256x178_uint8.raw",
	// "Engine": "ld2sqwwd3vaq4zf/engine_256x256x128_uint8.raw",
	"Bonsai": "rdnhdxmxtfxe0sa/bonsai_256x256x256_uint8.raw",
	"Foot": "ic0mik3qv4vqacm/foot_256x256x256_uint8.raw",
	"Skull": "5rfjobn0lvb7tmo/skull_256x256x256_uint8.raw",
	"Aneurysm": "3ykigaiym8uiwbp/aneurism_256x256x256_uint8.raw",
};

const canvasSizes = ["1280x720", "640x360", "426x240"];
var shaders = {
	"Direct Volume Rendering": "direct-volume-rendering",
	"Iso-surface Ray Casting": "isosurface-raycasting"
};

var loadVolume = function(file, onload) {
	var m = file.match(fileRegex);
	volDims = [parseInt(m[2]), parseInt(m[3]), parseInt(m[4])];
	
	var url = "https://www.dl.dropboxusercontent.com/s/" + file + "?dl=1";
	var req = new XMLHttpRequest();
	var loadingProgressText = document.getElementById("loadingText");
	var loadingProgressBar = document.getElementById("loadingProgressBar");

	loadingProgressText.innerHTML = "Loading Volume";
	loadingProgressBar.setAttribute("style", "width: 0%");

	req.open("GET", url, true);
	req.responseType = "arraybuffer";
	req.onprogress = function(evt) {
		var vol_size = volDims[0] * volDims[1] * volDims[2];
		var percent = evt.loaded / vol_size * 100;
		loadingProgressBar.setAttribute("style", "width: " + percent.toFixed(2) + "%");
	};
	req.onerror = function(evt) {
		loadingProgressText.innerHTML = "Error Loading Volume";
		loadingProgressBar.setAttribute("style", "width: 0%");
	};
	req.onload = function(evt) {
		loadingProgressText.innerHTML = "Loaded Volume";
		loadingProgressBar.setAttribute("style", "width: 100%");
		var dataBuffer = req.response;
		if (dataBuffer) {
			dataBuffer = new Uint8Array(dataBuffer);
			onload(file, dataBuffer);
		} else {
			alert("Unable to load buffer properly from volume?");
			console.log("no buffer?");
		}
	};
	req.send();
}

window.selectVolume = function() {
	var selection = document.getElementById("volumeList").value;
	history.replaceState(history.state, "#" + selection, "#" + selection);

	loadVolume(volumes[selection], function(file, dataBuffer) {
		var m = file.match(fileRegex);

		var tex = gl.createTexture();
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_3D, tex);
		gl.texStorage3D(gl.TEXTURE_3D, 1, gl.R8, volDims[0], volDims[1], volDims[2]);
		gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0,
			volDims[0], volDims[1], volDims[2],
			gl.RED, gl.UNSIGNED_BYTE, dataBuffer);

		var longestAxis = Math.max(volDims[0], Math.max(volDims[1], volDims[2]));
		volScale = [volDims[0] / longestAxis, volDims[1] / longestAxis,
			volDims[2] / longestAxis];

		if (shader){
			uploadVolumeUniforms();
		}


		newVolumeUpload = true;
		if (!volumeTexture) {
			volumeTexture = tex;

			setInterval(function() {
				// Save them some battery if they're not viewing the tab
				if (document.hidden) {
					return;
				}
				var startTime = performance.now();

				// background color
				gl.clearColor(backgroundColour[0], backgroundColour[1], backgroundColour[2], 1.0);
				gl.clear(gl.COLOR_BUFFER_BIT);

				if (shader){
					uploadViewUniforms();
				}

				gl.drawArrays(gl.TRIANGLE_STRIP, 0, cubeStrip.length / 3);
				// Wait for rendering to actually finish
				gl.finish();
				var endTime = performance.now();
				var frameTime = endTime - lastFrameEndTime;
				var frameRate = frameTime == 0.0 ? 0.0 : 1000.0 / frameTime;
				framerateCalculator.addFrameRate(frameRate);

				document.getElementById("frameRateText").value = framerateCalculator.getAverageFrameRate().toFixed(0);

				newVolumeUpload = false;
				lastFrameEndTime = endTime;
			}, targetFrameTime);
		} else {
			gl.deleteTexture(volumeTexture);
			volumeTexture = tex;
		}
	});
}

window.selectCanvasSize = function() {

	var newSizeStr = document.getElementById("canvasSizeList").value;
	const sizeArray = newSizeStr.split("x");

	canvas = document.getElementById("glcanvas");
	canvas.width = Number(sizeArray[0]);
	canvas.height = Number(sizeArray[1]);
	
	WIDTH = canvas.getAttribute("width");
	HEIGHT = canvas.getAttribute("height");

	proj = mat4.perspective(mat4.create(), 60 * Math.PI / 180.0,
		WIDTH / HEIGHT, 0.1, 100);

	camera = new ArcballCamera(defaultEye, center, up, 2, [WIDTH, HEIGHT]);
	projView = mat4.create();

	gl.viewport(0, 0, WIDTH, HEIGHT);

}

window.selectShader = function() {
	var selection = document.getElementById("shaderList").value;
	console.log("Shader selected: " + selection)
	setupRenderingShader("general-raycasting", shaders[selection]);

	localStorage.setItem('shaderSelected', selection);
}

window.changeIsoValue1 = function() {
	isoValue1 = document.getElementById("isoValue1Slider").value;
	uploadInteractableUniforms();
	updateUI();
}
window.changeIsoValue2 = function() {
	isoValue2 = document.getElementById("isoValue2Slider").value;
	uploadInteractableUniforms();
	updateUI();
}

window.changeSamplingDistance = function() {
	samplingDistance = document.getElementById("samplingDistanceSlider").value;
	uploadInteractableUniforms();
	updateUI();
}

window.changeBinarySearch = function() {
	binarySearch = document.getElementById("binarySearchCheckbox").checked;
	uploadInteractableUniforms();
	updateUI();
}

window.changeIllumination = function() {
	illuminationActive = document.getElementById("illuminationCheckbox").checked;

	specularReflectionConstant = document.getElementById("specularConstantSlider").value;
	diffuseReflectionConstant = document.getElementById("diffuseConstantSlider").value;
	ambientReflectionConstant = document.getElementById("ambientConstantSlider").value;
	
	shininessConstant = document.getElementById("shininessConstantSlider").value;
	
	var specularRgba = strToRGBA( document.getElementById("specularLightIntensityPicker").value );
	var diffuseRgba = strToRGBA( document.getElementById("diffuseLightIntensityPicker").value );
	var ambientRgba = strToRGBA( document.getElementById("ambientLightIntensityPicker").value );

	specularLightIntensity = vec3.fromValues(specularRgba.r / 255.0, specularRgba.g / 255.0, specularRgba.b / 255.0);
	diffuseLightIntensity = vec3.fromValues(diffuseRgba.r / 255.0, diffuseRgba.g / 255.0, diffuseRgba.b / 255.0);
	ambientLightIntensity = vec3.fromValues(ambientRgba.r / 255.0, ambientRgba.g / 255.0, ambientRgba.b / 255.0);
	
	uploadInteractableUniforms();
	updateUI();
}

window.changeBackgroundColour = function() {
	var bgRgba = strToRGBA( document.getElementById("backgroundColorPicker").value );
	backgroundColour = vec3.fromValues(bgRgba.r / 255.0, bgRgba.g / 255.0, bgRgba.b / 255.0);
}

window.changeLightPosition = function(){
	var x = document.getElementById("lightPosX").value;
	var y = document.getElementById("lightPosY").value;
	var z = document.getElementById("lightPosZ").value;
	lightPosition = vec3.fromValues(x, y, z);
	uploadInteractableUniforms();
	updateUI();
}

window.newTransferFunctionStopSliderChanged = function() {
	var value = document.getElementById("newTransferFunctionStopDataValueInput").value;
	document.getElementById("newTransferFunctionStopDataValueText").value = value;


}

window.resetTransferFunction = function() {
	localStorage.removeItem('transferFunction');
	initializeTransferFunction();

	updateTransferFunctionTexture();
	updateTransferFunctionUI();
	saveTransferFunction();
}

window.addTransferFunctionStopFromButtonClick = function() {

	// get value and color to add to transfer function
	var newStopValue = document.getElementById("newTransferFunctionStopDataValueInput").value;
	newStopValue = Math.min(newStopValue, 255);
	newStopValue = Math.max(newStopValue, 0);

	var newStopColourRgba = strToRGBA( document.getElementById("newTransferFunctionStopColourInput").value);
	var newStopColourVec4 = vec4.fromValues(newStopColourRgba.r / 255.0, newStopColourRgba.g / 255.0, newStopColourRgba.b / 255.0, newStopColourRgba.a);

	transferFunctionStops.set(newStopValue, newStopColourVec4);

	updateTransferFunctionTexture();
	updateTransferFunctionUI();
	saveTransferFunction();
}



/**
 * From Coloris library
 */
var wrapColorField = function(field) {
const parentNode = field.parentNode;

if (!parentNode.classList.contains('clr-field')) {
	const wrapper = document.createElement('div');
	let classes = 'clr-field';

	wrapper.innerHTML = '<button type="button" aria-labelledby="clr-open-label"></button>';
	parentNode.insertBefore(wrapper, field);
	wrapper.className = classes;
	wrapper.style.color = field.value;
	wrapper.id = "wrapper" + field.id;
	wrapper.appendChild(field);
}
}

window.saveTransferFunction = function() {


	const tfEntries = Array.from(transferFunctionStops.entries());

	const correctedEntries = tfEntries.map(([key, value]) => {
		const intKey = Math.round(key);
		return [intKey, value];
	});


	localStorage.setItem('transferFunction', JSON.stringify(tfEntries));

}

window.updateTransferFunctionUI = function(){

	// draw function background
	if (transferFunctionUISVG == null){

		transferFunctionUIWidth = document.getElementById('newTransferFunctionStopDataValueInput').offsetWidth;

		transferFunctionUISVG = d3.select('#tfUIContainer').append('svg')
			.attr('width', transferFunctionUIWidth + (2 * transferFunctionUIMargin))
			.attr('height', transferFunctionUIHeight + (2 * transferFunctionUIMargin));

		// draw function outline
		transferFunctionUISVG.append('rect')
			.attr('x', transferFunctionUIMargin)
			.attr('y', transferFunctionUIMargin)
			.attr('width', transferFunctionUIWidth)
			.attr('height', transferFunctionUIHeight)
			.style('fill', 'none')
			.style('stroke-width', 2)
			.style('stroke', 'grey');

		// add labels
		transferFunctionUISVG.append('text')
			.text("Opacity")
			.attr("fill", "grey")
			.attr("x", transferFunctionUIMargin * 0.7)
			.attr("y", transferFunctionUIHeight * 0.75 + transferFunctionUIMargin)
			.attr("transform", "rotate(-90," + (transferFunctionUIMargin * 0.7) + "," + (transferFunctionUIHeight * 0.75 + transferFunctionUIMargin) + ")");

		transferFunctionUISVG.append('text')
			.text("Data Value")
			.attr("fill", "grey")
			.attr("x", transferFunctionUIMargin + 0.4 * transferFunctionUIWidth)
			.attr("y", transferFunctionUIMargin * 2 + transferFunctionUIHeight);
		transferFunctionUISVG.append('text')
			.text("0")
			.attr("fill", "grey")
			.attr("x", transferFunctionUIMargin - 4)
			.attr("y", transferFunctionUIMargin * 2 + transferFunctionUIHeight);
		transferFunctionUISVG.append('text')
			.text("255")
			.attr("fill", "grey")
			.attr("x", transferFunctionUIMargin + transferFunctionUIWidth - 12)
			.attr("y", transferFunctionUIMargin * 2 + transferFunctionUIHeight);


		transferFunctionUISVG.on("click", function(event) {
			if (event.target !== this) return; // Ignore clicks on child elements

			const [x, y] = d3.pointer(event);

			if (x >= transferFunctionUIMargin && x < transferFunctionUIMargin + transferFunctionUIWidth 
				&& y >= transferFunctionUIMargin && y < transferFunctionUIMargin + transferFunctionUIHeight) {
				addTransferFunctionStopFromUIClick(x, y)
			}
		});
	}

	// draw / redraw function
	// remove all circles and lines from existing UI before redrawing
	d3.selectAll('.tfuiElement').remove();
	var lines = transferFunctionUISVG.append("g").attr("class", "tfuiElement");
	var circles = transferFunctionUISVG.append("g").attr("class", "tfuiElement");

	// sort the map entries from the TF by key
	const tf_entries = Array.from(transferFunctionStops.entries());
	tf_entries.sort((a, b) => a[0] - b[0]);


	// populate visual list of stops
	d3.selectAll('.tfStopRow').remove();
	var tfStopEditorContainer = d3.select('#tfStopEditor');
	tf_entries.forEach((element) => {
		let e_value = element[0];
		var row = tfStopEditorContainer.append('div')
			.attr("class", "row mb-2 tfStopRow");

		var col1 = row.append('div').attr("class", "col-sm");
		col1.append('input')
			.attr("id", "tfStopInput" + element[0])
			.attr("type", "number")
			.attr("min", "0")
			.attr("max", "255")
			.attr("value", element[0])
			.on("change",  (event) => changeTransferFunctionStopValue(event));
		
		var col2 = row.append('div').attr("class", "col-sm");
		col2.append('input')
			.attr("id", "tfStop" + element[0])
			.attr("type", "text")
			.attr("class", "colorisRGBATF")
			.attr("value", vec4ToRGBAStr(element[1]))
			.attr("data-coloris", "");

		var f = document.getElementById("tfStop" + e_value);
		wrapColorField(f);

	});


	circles.selectAll("circle")
		.data(tf_entries)
		.enter()
		.append("circle")
			.attr("cx", d => tfuiStopDataValueToXPosition(d[0]) )
			.attr("cy", d => tfuiStopOpacityToYPosition(d[1][3]) )
			.attr("r", 8)
			.attr('class', 'tfuiElement')
			.style('stroke', 'gray')
			.style('stroke-width', '3')
			.style('fill', d => vec3ToRGBStr(d[1]) )
			.call(d3.drag().on("start", tfUIDragstarted).on("drag", tfUIDragged).on("end", tfUIDragended));

	// add start and end entries 
	if (tf_entries[0][0] != 0){
		tf_entries.unshift([0, tf_entries[0][1] ]);
	}
	if (tf_entries[tf_entries.length - 1][0] != 255){
		tf_entries.push([255, tf_entries[tf_entries.length - 1][1] ]);
	}

	const points = tf_entries.map((d, i) => ({
        x: tfuiStopDataValueToXPosition(d[0]),
        y: tfuiStopOpacityToYPosition(d[1][3]),
    }));

	const line = d3.line()
		.x(d => d.x)
		.y(d => d.y);

	lines.append("path")
        .datum(points)
        .attr("fill", "none")
		.style('stroke', 'gray')
        .attr("stroke-width", 3)
        .attr("d", line);

}


function tfUIDragstarted(event, d) {
	d3.select(this).style("stroke", "black");
	d.startX = event.x;
    d.startY = event.y;
}

function tfUIDragged(event, d) {
	var clamped_x = Math.max(transferFunctionUIMargin, Math.min(transferFunctionUIMargin + transferFunctionUIWidth, event.x));
	var clamped_y = Math.max(transferFunctionUIMargin, Math.min(transferFunctionUIMargin + transferFunctionUIHeight, event.y));

	d3.select(this).raise().attr("cx", d.x = clamped_x).attr("cy", d.y = clamped_y);
}

function tfUIDragended(event, d) {
	
	d3.select(this).style("stroke", "gray");

	const dx = event.x - d.startX;
    const dy = event.y - d.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
	if (distance < 2){
		console.log("click")
		transferFunctionStops.delete(d[0]);

	}
	else {

		var initialVal = d[0]
		var initialColor = transferFunctionStops.get(d[0])

		var newVal = tfuiStopXPositionToDataValue(event.x);
		var newOpacity = tfuiStopYPositionToOpacity(event.y);

		var newColor = initialColor
		newColor[3] = newOpacity;

		if (initialVal != newVal){
			transferFunctionStops.delete(initialVal);
		}
		transferFunctionStops.set(newVal, newColor);
	}

	updateTransferFunctionTexture();
	updateTransferFunctionUI();
	saveTransferFunction();

}

function tfuiStopDataValueToXPosition(val) {
	return transferFunctionUIMargin + (val / 255.0) * transferFunctionUIWidth;
}
function tfuiStopXPositionToDataValue(x) {
	var x = Math.floor(((x - transferFunctionUIMargin) / transferFunctionUIWidth) * 255.0);
	return Math.min(Math.max(x, 0), 255)

}
function tfuiStopOpacityToYPosition(alpha) {
	return (transferFunctionUIHeight + transferFunctionUIMargin) - (alpha * transferFunctionUIHeight);
}

function tfuiStopYPositionToOpacity(y) {
	var alpha = ((transferFunctionUIHeight + transferFunctionUIMargin) - y) / transferFunctionUIHeight;
	return Math.min(Math.max(alpha, 0.0), 1.0)
}


function addTransferFunctionStopFromUIClick(x,y) {

	// get value and color to add to transfer function
	var newStopValue = tfuiStopXPositionToDataValue(x)
	var newStopOpacity = tfuiStopYPositionToOpacity(y);

	var newStopColourRgba = strToRGBA( document.getElementById("newTransferFunctionStopColourInput").value);
	var newStopColourVec4 = vec4.fromValues(newStopColourRgba.r / 255.0, newStopColourRgba.g / 255.0, newStopColourRgba.b / 255.0, newStopOpacity);

	transferFunctionStops.set(newStopValue, newStopColourVec4);

	updateTransferFunctionTexture();
	updateTransferFunctionUI();
	saveTransferFunction();
}


window.changeTransferFunctionStopColour = function(color, input) {
	var objectId = input.id;
	var stopValue = Number(objectId.replace('tfStop',''));
	var newStopColourRgba = strToRGBA(color);
	var newStopColourVec4 = vec4.fromValues(newStopColourRgba.r / 255.0, newStopColourRgba.g / 255.0, newStopColourRgba.b / 255.0, newStopColourRgba.a);

	// if only an RGB value is given, take existing opacity value from TF stops
	if (!color.includes("rgba")){
		newStopColourVec4[3] = transferFunctionStops.get(stopValue)[3];
	}	

	transferFunctionStops.set(stopValue, newStopColourVec4);

	updateTransferFunctionTexture();
	updateTransferFunctionUI();
	saveTransferFunction();

}

window.changeTransferFunctionStopValue = function(event){

	// get value of input
	var objectId = event.target.id;
	var previousStopValue = Number(objectId.replace('tfStopInput',''));
	var newStopValue = Number(document.getElementById(objectId).value);

	// check that no stop with that value already exists
	if (!transferFunctionStops.has(newStopValue)) {

		// get colour associated with input
		var col = transferFunctionStops.get(previousStopValue);

		// remove existing stop
		transferFunctionStops.delete(previousStopValue);

		// add new stop with same colour value
		transferFunctionStops.set(newStopValue, col);

		// update input id
		document.getElementById(objectId).id = "tfStopInput" + newStopValue;

		updateTransferFunctionTexture();
		updateTransferFunctionUI();
		saveTransferFunction();
	}
}

var updateUI = function() {

	// sampling distance
	document.getElementById("samplingDistanceText").value = samplingDistance;
	document.getElementById("samplingDistanceSlider").value = samplingDistance;

	// iso value 1
	document.getElementById("isoValue1TextNormalized").value = isoValue1;
	document.getElementById("isoValue1Text").value = Number.parseInt(isoValue1 * 255);
	document.getElementById("isoValue1Slider").value = isoValue1;

	// iso value 2
	document.getElementById("isoValue2TextNormalized").value = isoValue2;
	document.getElementById("isoValue2Text").value = Number.parseInt(isoValue2 * 255);
	document.getElementById("isoValue2Slider").value = isoValue2;


	// illumination
	document.getElementById("illuminationCheckbox").checked = illuminationActive;

	// binary search
	document.getElementById("binarySearchCheckbox").checked = binarySearch;

	// light pos
	document.getElementById("lightPosX").value = lightPosition[0];
	document.getElementById("lightPosY").value = lightPosition[1];
	document.getElementById("lightPosZ").value = lightPosition[2];

	// reflection constants
	document.getElementById("specularConstantSlider").value = specularReflectionConstant;
	document.getElementById("diffuseConstantSlider").value = diffuseReflectionConstant;
	document.getElementById("ambientConstantSlider").value = ambientReflectionConstant;
	document.getElementById("shininessConstantSlider").value = shininessConstant;
	
	// reflection constants text
	document.getElementById("specularConstantOutput").value = specularReflectionConstant;
	document.getElementById("diffuseConstantOutput").value = diffuseReflectionConstant;
	document.getElementById("ambientConstantOutput").value = ambientReflectionConstant;
	document.getElementById("shininessConstantOutput").value = shininessConstant;
	// colors
	document.getElementById("specularLightIntensityPicker").value = vec3ToRGBStr(specularLightIntensity);
	document.getElementById("diffuseLightIntensityPicker").value = vec3ToRGBStr(diffuseLightIntensity);
	document.getElementById("ambientLightIntensityPicker").value = vec3ToRGBStr(ambientLightIntensity);
}


var uploadInteractableUniforms = function() {
	gl.uniform1f(shader.uniforms["sampling_distance"], samplingDistance);
	gl.uniform1f(shader.uniforms["iso_value1"], isoValue1);
	gl.uniform1f(shader.uniforms["iso_value2"], isoValue2);
	gl.uniform1i(shader.uniforms["illumination_active"], illuminationActive);
	gl.uniform3fv(shader.uniforms["light_position"], lightPosition);
	gl.uniform1i(shader.uniforms["binary_search_active"], binarySearch);

	gl.uniform1f(shader.uniforms["specular_reflection_constant"], specularReflectionConstant);
	gl.uniform1f(shader.uniforms["diffuse_reflection_constant"], diffuseReflectionConstant);
	gl.uniform1f(shader.uniforms["ambient_reflection_constant"], ambientReflectionConstant);
	gl.uniform1f(shader.uniforms["shininess_constant"], shininessConstant);

	gl.uniform3fv(shader.uniforms["specular_light_intensity"], specularLightIntensity);
	gl.uniform3fv(shader.uniforms["diffuse_light_intensity"], diffuseLightIntensity);
	gl.uniform3fv(shader.uniforms["ambient_light_intensity"], ambientLightIntensity);

}

var uploadConstantUniforms = function(){

	gl.uniform1i(shader.uniforms["volume"], 0);
	gl.uniform1i(shader.uniforms["transfer_function"], 1);
}

var uploadVolumeUniforms = function(){

	gl.uniform3iv(shader.uniforms["volume_dims"], volDims);
	gl.uniform3fv(shader.uniforms["volume_scale"], volScale);
	gl.uniform1f(shader.uniforms["dt_scale"], samplingRate);
}

var uploadViewUniforms = function () {
	projView = mat4.mul(projView, proj, camera.camera);
	gl.uniformMatrix4fv(shader.uniforms["proj_view"], false, projView);

	var eye_pos_ws = [camera.invCamera[12], camera.invCamera[13], camera.invCamera[14]];
	gl.uniform3fv(shader.uniforms["eye_pos_ws"], eye_pos_ws);
}


async function setupRenderingShader(vertexShaderFilename, fragmentShaderFilename) {

	const vertFetchResponse = await fetch("shaders/" + vertexShaderFilename + ".vert");
	const vertShader = await vertFetchResponse.text();

	const fragFetchResponse = await fetch("shaders/" + fragmentShaderFilename + ".frag");
	const fragShader = await fragFetchResponse.text();

	shader = new Shader(gl, vertShader, fragShader);
	shader.use(gl);

	uploadConstantUniforms();
	uploadInteractableUniforms();
	if (volumeTexture) {
		uploadVolumeUniforms();
	}
}

var createTransferFunctionTexture = function () {
	const tf_data = getTransferFunctionTextureData();
	transferFunctionTextureHandle = gl.createTexture();
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, transferFunctionTextureHandle);
	gl.texStorage2D(gl.TEXTURE_2D, 1, gl.SRGB8_ALPHA8, TRANSFER_FUNCTION_TEX_SIZE, 1);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TRANSFER_FUNCTION_TEX_SIZE, 1,
	 	gl.RGBA, gl.UNSIGNED_BYTE, tf_data);
}

var updateTransferFunctionTexture = function () {
	const tf_data = getTransferFunctionTextureData();
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, transferFunctionTextureHandle);
	gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TRANSFER_FUNCTION_TEX_SIZE, 1,
		gl.RGBA, gl.UNSIGNED_BYTE, tf_data);
}

function lerp( a, b, alpha ) {
	return a + alpha * ( b - a );
}

var getTransferFunctionTextureData = function () {
	const tf_data = new Uint8Array(TRANSFER_FUNCTION_TEX_SIZE * 4);

	let data_value_f = 0;
	let data_value_b = TRANSFER_FUNCTION_TEX_SIZE;
	let e_value = 0;
	let color_f = vec4.fromValues(0,0,0,0);
	let color_b = vec4.fromValues(0,0,0,0);
	let e_color = vec4.fromValues(0,0,0,0);
	
	// sort the map entries from the TF by key
	const tf_entries = Array.from(transferFunctionStops.entries());
	tf_entries.sort((a, b) => a[0] - b[0]);

	// add start and end entries if required 
	if (tf_entries[0][0] != 0){
		tf_entries.unshift([0, tf_entries[0][1] ]);
	}
	if (tf_entries[tf_entries.length - 1][0] != 255){
		tf_entries.push([255, tf_entries[tf_entries.length - 1][1] ]);
	}

	for (let i = 0; i < tf_entries.length; i++){
		
		let e = tf_entries[i];
		e_value = e[0];
		e_color = e[1];

		data_value_b = e_value;
		color_b = e_color;

		if (i > 0){
			let data_value_d = data_value_b - data_value_f;
			let step_size = 1.0 / data_value_d;
			let step = 0.0;

			for (let i = data_value_f; i < data_value_b; ++i){
				tf_data[(i * 4) + 0] = 255.0 * lerp(color_f[0], color_b[0], step);
				tf_data[(i * 4) + 1] = 255.0 * lerp(color_f[1], color_b[1], step);
				tf_data[(i * 4) + 2] = 255.0 * lerp(color_f[2], color_b[2], step);
				tf_data[(i * 4) + 3] = 255.0 * lerp(color_f[3], color_b[3], step);
				step += step_size;
			}
		}

		data_value_f = data_value_b;
		color_f = color_b;
	}

	return tf_data;
}

window.onload = function(){
	fillVolumeSelector();
	fillShaderSelector();
	fillCanvasSizeList();

	initializeTransferFunction();

	// call update UI functions so that slider values correspond to initial script values
	updateUI();
	updateTransferFunctionUI();
	
	Coloris({
		format: 'rgb',
		alpha: true
	  });

	Coloris.setInstance('.colorisRGB', {
		format: 'rgb',
		alpha: false
	});
	
	Coloris.setInstance('.colorisRGBA', {
		format: 'rgb',
		alpha: true
	});
	Coloris.setInstance('.colorisRGBATF', {
		format: 'rgb',
		alpha: true,
		onChange: changeTransferFunctionStopColour
	});

	canvas = document.getElementById("glcanvas");
	gl = canvas.getContext("webgl2");
	if (!gl) {
		alert("Unable to initialize WebGL2. Your browser may not support it");
		return;
	}
	WIDTH = canvas.getAttribute("width");
	HEIGHT = canvas.getAttribute("height");

	proj = mat4.perspective(mat4.create(), 60 * Math.PI / 180.0,
		WIDTH / HEIGHT, 0.1, 100);

	camera = new ArcballCamera(defaultEye, center, up, 2, [WIDTH, HEIGHT]);
	projView = mat4.create();

	var selectedShader = localStorage.getItem('shaderSelected');
	if (!selectedShader){
		selectedShader = Object.values(shaders)[0];
		setupRenderingShader("general-raycasting", Object.values(shaders)[0]);
	}
	else {
		setupRenderingShader("general-raycasting", shaders[selectedShader] );
		document.getElementById("shaderList").value = selectedShader;
	}


	// Register mouse and touch listeners
	var controller = new Controller();
	controller.mousemove = function(prev, cur, evt) {
		if (evt.buttons == 1) {
			camera.rotate(prev, cur);

		} else if (evt.buttons == 2) {
			camera.pan([cur[0] - prev[0], prev[1] - cur[1]]);
		}
	};
	controller.wheel = function(amt) { camera.zoom(amt); };
	controller.pinch = controller.wheel;
	controller.twoFingerDrag = function(drag) { camera.pan(drag); };

	document.addEventListener("keydown", function(evt) {
		if (evt.key == "p") {
			takeScreenShot = true;
		}
	});

	controller.registerForCanvas(canvas);

	// Setup VAO and VBO to render the cube to run the raymarching shader
	var vao = gl.createVertexArray();
	gl.bindVertexArray(vao);

	var vbo = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeStrip), gl.STATIC_DRAW);

	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);


	// Setup required OpenGL state for drawing the back faces and
	// composting with the background color
	gl.enable(gl.CULL_FACE);
	gl.cullFace(gl.FRONT);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

	// See if we were linked to a datset
	if (window.location.hash) {
		var linkedDataset = decodeURI(window.location.hash.substr(1));
		if (linkedDataset in volumes) {
			document.getElementById("volumeList").value = linkedDataset;
		}
	}

	createTransferFunctionTexture();
	
	selectVolume();
}

var fillVolumeSelector = function() {
	var selector = document.getElementById("volumeList");
	for (var v in volumes) {
		var opt = document.createElement("option");
		opt.value = v;
		opt.innerHTML = v;
		selector.appendChild(opt);
	}
}

var fillCanvasSizeList = function() {
	var list = document.getElementById("canvasSizeList");
	for (var r of canvasSizes){
		var opt = document.createElement("option");
		opt.value = r;
		opt.innerHTML = r;
		list.appendChild(opt);
	}
}

var fillShaderSelector = function() {
	var selector = document.getElementById("shaderList");
	for (var s in shaders) {
		var opt = document.createElement("option");
		opt.value = s;
		opt.innerHTML = s;
		selector.appendChild(opt);
	}
}

var initializeTransferFunction = function() {

	let loadedTransferFunction = localStorage.getItem('transferFunction');
	if (loadedTransferFunction) {
		loadedTransferFunction = JSON.parse(loadedTransferFunction);
		transferFunctionStops = new Map(loadedTransferFunction);
	}
	else {
		transferFunctionStops = new Map();
		transferFunctionStops.set(0, vec4.fromValues(0,0,0,0));	
		transferFunctionStops.set(255, vec4.fromValues(1,1,1,1));
	}

}

window.strToRGBA = function(str) {
    var regex = /^((rgba)|rgb)[\D]+([\d.]+)[\D]+([\d.]+)[\D]+([\d.]+)[\D]*?([\d.]+|$)/i;
    var match, rgba;
    match = regex.exec(str);
    if (match) {
      rgba = {
        r: match[3] * 1,
        g: match[4] * 1,
        b: match[5] * 1,
        a: match[6] * 1 };
    } 
    return rgba;
}

var vec3ToRGBStr = function(vec) {
	return "rgb(" + parseInt(vec[0] * 255) + "," + parseInt(vec[1] * 255) + "," + parseInt(vec[2] * 255) + ")";  
}

var vec4ToRGBAStr = function(vec) {
	return "rgba(" + parseInt(vec[0] * 255) + "," + parseInt(vec[1] * 255) + "," + parseInt(vec[2] * 255) + "," + (vec[3]) + ")";  
}
