/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/webworker-promise/src/index.js":
/*!*****************************************************!*\
  !*** ./node_modules/webworker-promise/src/index.js ***!
  \*****************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const TinyEmitter = __webpack_require__(/*! ./tiny-emitter */ "./node_modules/webworker-promise/src/tiny-emitter.js");

const MESSAGE_RESULT = 0;
const MESSAGE_EVENT = 1;

const RESULT_ERROR = 0;
const RESULT_SUCCESS = 1;

class Worker extends TinyEmitter {
  /**
   *
   * @param worker {Worker}
   */
  constructor(worker) {
    super();

    this._messageId = 1;
    this._messages = new Map();

    this._worker = worker;
    this._worker.onmessage = this._onMessage.bind(this);
    this._id = Math.ceil(Math.random() * 10000000);
  }

  terminate() {
    this._worker.terminate();
  }

  /**
   * return true if there is no unresolved jobs
   * @returns {boolean}
   */
  isFree() {
    return this._messages.size === 0;
  }

  jobsLength() {
    return this._messages.size;
  }

  /**
   * @param operationName string
   * @param data any
   * @param transferable array
   * @param onEvent function
   * @returns {Promise}
   */
  exec(operationName, data = null, transferable = [], onEvent) {
    return new Promise((res, rej) => {
      const messageId = this._messageId++;
      this._messages.set(messageId, [res, rej, onEvent]);
      this._worker.postMessage([messageId, data, operationName], transferable || []);
    });
  }

  /**
   *
   * @param data any
   * @param transferable array
   * @param onEvent function
   * @returns {Promise}
   */
  postMessage(data = null, transferable = [], onEvent) {
    return new Promise((res, rej) => {
      const messageId = this._messageId++;
      this._messages.set(messageId, [res, rej, onEvent]);
      this._worker.postMessage([messageId, data], transferable || []);
    });
  }

  emit(eventName, ...args) {
    this._worker.postMessage({eventName, args});
  }

  _onMessage(e) {
    //if we got usual event, just emit it locally
    if(!Array.isArray(e.data) && e.data.eventName) {
      return super.emit(e.data.eventName, ...e.data.args);
    }

    const [type, ...args] = e.data;

    if(type === MESSAGE_EVENT)
      this._onEvent(...args);
    else if(type === MESSAGE_RESULT)
      this._onResult(...args);
    else
      throw new Error(`Wrong message type '${type}'`);
  }

  _onResult(messageId, success, payload) {
    const [res, rej] = this._messages.get(messageId);
    this._messages.delete(messageId);

    return success === RESULT_SUCCESS ? res(payload) : rej(payload);
  }

  _onEvent(messageId, eventName, data) {
    const [,,onEvent] = this._messages.get(messageId);

    if(onEvent) {
      onEvent(eventName, data);
    }
  }

}

module.exports = Worker;


/***/ }),

/***/ "./node_modules/webworker-promise/src/tiny-emitter.js":
/*!************************************************************!*\
  !*** ./node_modules/webworker-promise/src/tiny-emitter.js ***!
  \************************************************************/
/***/ ((module) => {

class TinyEmitter {
  constructor() {
    Object.defineProperty(this, '__listeners', {
      value: {},
      enumerable: false,
      writable: false
    });
  }

  emit(eventName, ...args) {
    if(!this.__listeners[eventName])
      return this;

    for(const handler of this.__listeners[eventName]) {
      handler(...args);
    }

    return this;
  }

  once(eventName, handler) {
    const once = (...args) => {
      this.off(eventName, once);
      handler(...args);
    };

    return this.on(eventName, once);
  }

  on(eventName, handler) {
    if(!this.__listeners[eventName])
      this.__listeners[eventName] = [];

    this.__listeners[eventName].push(handler);

    return this;
  }

  off(eventName, handler) {
    if(handler)
      this.__listeners[eventName] = this.__listeners[eventName].filter(h => h !== handler);
    else
      this.__listeners[eventName] = [];

    return this;
  }
}

module.exports = TinyEmitter;


/***/ }),

/***/ "./src/cities.dict":
/*!*************************!*\
  !*** ./src/cities.dict ***!
  \*************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
module.exports = __webpack_require__.p + "model/cities.dict";

/***/ }),

/***/ "./src/cities.gram":
/*!*************************!*\
  !*** ./src/cities.gram ***!
  \*************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
module.exports = __webpack_require__.p + "model/cities.gram";

/***/ }),

/***/ "./src/numbers.gram":
/*!**************************!*\
  !*** ./src/numbers.gram ***!
  \**************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
module.exports = __webpack_require__.p + "model/numbers.gram";

/***/ }),

/***/ "./src/pizza.gram":
/*!************************!*\
  !*** ./src/pizza.gram ***!
  \************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
module.exports = __webpack_require__.p + "model/pizza.gram";

/***/ }),

/***/ "./src/soundswallower-processor.js":
/*!*****************************************!*\
  !*** ./src/soundswallower-processor.js ***!
  \*****************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
module.exports = __webpack_require__.p + "a1069556b139d8ae8268.js";

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		var scriptUrl;
/******/ 		if (__webpack_require__.g.importScripts) scriptUrl = __webpack_require__.g.location + "";
/******/ 		var document = __webpack_require__.g.document;
/******/ 		if (!scriptUrl && document) {
/******/ 			if (document.currentScript)
/******/ 				scriptUrl = document.currentScript.src
/******/ 			if (!scriptUrl) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				if(scripts.length) scriptUrl = scripts[scripts.length - 1].src
/******/ 			}
/******/ 		}
/******/ 		// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration
/******/ 		// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.
/******/ 		if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");
/******/ 		scriptUrl = scriptUrl.replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
/******/ 		__webpack_require__.p = scriptUrl;
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		__webpack_require__.b = document.baseURI || self.location.href;
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			"main": 0
/******/ 		};
/******/ 		
/******/ 		// no chunk on demand loading
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		// no on chunks loaded
/******/ 		
/******/ 		// no jsonp function
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
// Copyright (c) 2022 David Huggins-Daines <dhdaines@gmail.com>
// Originally based on index.html from pocketsphinx.js, which is:
// Copyright © 2013-2017 Sylvain Chevalier
// MIT license, see LICENSE for details

const WebworkerPromise = __webpack_require__(/*! webworker-promise */ "./node_modules/webworker-promise/src/index.js");

// Package these with Webpack
var grammars = {Numbers: __webpack_require__(/*! ./numbers.gram */ "./src/numbers.gram"),
		Cities: __webpack_require__(/*! ./cities.gram */ "./src/cities.gram"),
		Pizza: __webpack_require__(/*! ./pizza.gram */ "./src/pizza.gram")}
var dicts = {Cities: __webpack_require__(/*! ./cities.dict */ "./src/cities.dict")};

// These will be initialized later
var outputContainer, context, ssjs, recognizer, media_source, worklet_node;
// Only when both recorder and recognizer do we have a ready application
var isRecorderReady = isRecognizerReady = false;
// Do not feed data to the recorder if not ready
var recording = false;

// To display the hypothesis sent by the recognizer
function updateHyp(hyp) {
    if (outputContainer)
	outputContainer.innerHTML = hyp;
};

// This updates the UI when the app might get ready
function updateUI() {
    if (isRecorderReady && isRecognizerReady)
	startBtn.disabled = stopBtn.disabled = false;
};

// This is just a logging window where we display the status
function updateStatus(newStatus) {
    document.getElementById('current-status').innerHTML += "<br/>" + newStatus;
};

// A not-so-great recording indicator
function displayRecording(display) {
    if (display)
	document.getElementById('recording-indicator').innerHTML = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
    else
	document.getElementById('recording-indicator').innerHTML = "";
    recording = display;
};

// We get the grammars defined below and fill in the input select tag
var updateGrammars = function() {
    var selectTag = document.getElementById('grammars');
    for (const name in grammars) {
        var newElt = document.createElement('option');
        newElt.innerHTML = name;
        selectTag.appendChild(newElt);
    }                          
    selectTag.onchange = async function() {
	var name = this.options[this.selectedIndex].innerText;
	var was_recording;
	if (recording) {
	    was_recording = true;
	    await recognizer.postMessage({
		command: "stop"
	    });
	    displayRecording(false);
	}
	await recognizer.postMessage({
	    command: "loadGrammar", data: grammars[name]
	});
	if (was_recording) {
	    try {
		await recognizer.postMessage({
		    command: "start"
		});
	    }
	    catch (e) {
		updateStatus("Error starting recognition: " + e.message);
	    }
	    displayRecording(true);
	}
    }
    // Load the first grammar
    selectTag.onchange();
};

// This adds words to the recognizer. When it calls back, we are ready
var feedWords = function() {
    for (const name in dicts) {
	recognizer.postMessage({command: 'loadDict', data: dicts[name]});
    }
};

// When the page is loaded, we spawn a new recognizer worker and
// call getUserMedia to request access to the microphone
window.onload = async function() {
    // Wiring JavaScript to the UI
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    startBtn.disabled = true;
    stopBtn.disabled = true;
    outputContainer = document.getElementById("output");
    updateStatus("Initializing web audio, waiting for approval to access the microphone");
    try {
	const AudioContext = window.AudioContext || window.webkitAudioContext;
	context = new AudioContext();
	await context.suspend();
	const stream = await navigator.mediaDevices.getUserMedia({audio: true});
        media_source = context.createMediaStreamSource(stream);
	const workletURL = new URL(/* asset import */ __webpack_require__(/*! ./soundswallower-processor.js */ "./src/soundswallower-processor.js"), __webpack_require__.b);
	await context.audioWorklet.addModule(workletURL);
	worklet_node = new AudioWorkletNode(context, 'soundswallower-processor');
	media_source.connect(worklet_node).connect(context.destination);
        isRecorderReady = true;
        updateUI();
        updateStatus("Audio recorder ready");
    }
    catch (e) {
	updateStatus("Error initializing Web Audio browser: " + e.message);
    }
    updateStatus("Initializing speech recognizer");
    try {
	const worker = new Worker(new URL(/* worker import */ __webpack_require__.p + __webpack_require__.u("src_recognizer_js"), __webpack_require__.b));
	recognizer = new WebworkerPromise(worker);
	let ready = await recognizer.postMessage({
	    command: "initialize",
	    data: {loglevel: "DEBUG", samprate: context.sampleRate}
	});
	updateGrammars();
	feedWords();
	updateStatus("Speech recognizer ready");
    }
    catch (e) {
	updateStatus("Error initializing speech recognizer: " + e.message);
    }
    worklet_node.port.onmessage = async function(event) {
	if (!recording)
	    return true;
	if (event.data == "ERROR") {
	    updateStatus("AudioWorkletNode got disconnected somehow?!?!?!");
	    worklet_node = new AudioWorkletNode(context, 'soundswallower-processor');
	    media_source.connect(worklet_node).connect(context.destination);
	    return true;
	}
	try {
	    const { hyp, hypseg } = await recognizer.postMessage({
		command: "process",
		data: event.data
	    });
	    if (hyp !== undefined)
		updateHyp(hyp);
	}
	catch (e) {
	    updateStatus("Error processing data: " + e.message);
	}
	return true;
    };
    startBtn.onclick = async function() {
	if (recording) {
	    await recognizer.postMessage({
		command: "stop"
	    });
	}
	try {
	    await recognizer.postMessage({
		command: "start"
	    });
	}
	catch (e) {
	    updateStatus("Error starting recognition: " + e.message);
	}
	await context.resume();
	displayRecording(true);
	return true;
    };
    stopBtn.onclick = async function() {
	await context.suspend();
	if (!recording)
	    return;
	try {
	    await recognizer.postMessage({
		command: "stop"
	    });
	}
	catch (e) {
	    updateStatus("Error stopping recognition: " + e.message);
	}
	const { hyp, hypseg } = await recognizer.postMessage({
	    command: "process",
	    data: event.data
	});
	if (hyp !== undefined)
	    updateHyp(hyp);
	displayRecording(false);
	return true;
    };
    startBtn.disabled = false;
    stopBtn.disabled = false;
};


})();

/******/ })()
;
//# sourceMappingURL=main.js.map