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

var gl = null;
var shader = null;
var volumeTexture = null;
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
var isoValue = 0.5;
var samplingDistance = 0.02;
var illuminationActive = true;
var binarySearch = false;
var lightPosition = vec3.fromValues(0.0, 2.0, 2.0);
var specularReflectionConstant = 0.5;
var diffuseReflectionConstant = 0.5;
var ambientReflectionConstant = 0.2;
var shininessConstant = 5;
var specularLightIntensity = vec3.fromValues(1.0, 1.0, 1.0);
var diffuseLightIntensity = vec3.fromValues(1.0, 0.0, 0.0);
var ambientLightIntensity = vec3.fromValues(1.0, 0.0, 0.0);
var backgroundColour = vec3.fromValues(0.75, 0.75, 0.75);



var desiredFrameRate = 1000;
var targetFrameTime = 1000.0 / desiredFrameRate;
var lastFrameEndTime = 0;
var lastRenderTime = 0;

const defaultEye = vec3.set(vec3.create(), 0.5, 0.5, 1.5);
const center = vec3.set(vec3.create(), 0.5, 0.5, 0.5);
const up = vec3.set(vec3.create(), 0.0, 1.0, 0.0);

const framerateCalculator = new FramerateCalculator(60); // Use a window size of 60 frames for a 1-second window


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
	"Show Volume": "show-volume",
	"X-Ray": "x-ray",
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

window.changeIsoValue = function() {
	isoValue = document.getElementById("isoValueSlider").value;
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



var updateUI = function() {

	// sampling distance
	document.getElementById("samplingDistanceText").value = samplingDistance;
	document.getElementById("samplingDistanceSlider").value = samplingDistance;

	// iso value
	document.getElementById("isoValueTextNormalized").value = isoValue;
	document.getElementById("isoValueText").value = Number.parseInt(isoValue * 255);
	document.getElementById("isoValueSlider").value = isoValue;

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
	gl.uniform1f(shader.uniforms["iso_value"], isoValue);
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


function lerp( a, b, alpha ) {
	return a + alpha * ( b - a );
}


window.onload = function(){
	fillVolumeSelector();
	fillShaderSelector();
	fillCanvasSizeList();

	// call update UI functions so that slider values correspond to initial script values
	updateUI();
	
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
