# SciVis WebGL Framework

## Installation

To run this framework, it is necessary to run a local web server.

Ensure [Node.js](https://nodejs.org/en) is installed.

Then, in the command line window, execute the following commands

```
npm install
npm run start
```
This will open the assignment web page.


For Visual Studio Code, you can install `WebGL GLSL Editor` extension for syntax highlighting of GLSL code.

## Troubleshooting

* "Unable to initialize WebGL2. Your browser may not support it". The browser may have blacklisted WebGL after a crash. Creating a new tab/window, restarting the browser, or restarting the machine may fix this.
* WebGL context lost: can be caused by GPU hanging during rendering - is there an infinite loop in your shader?


