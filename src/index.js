"use strict";
// Copyright (c) 2022 David Huggins-Daines <dhdaines@gmail.com>
// Originally based on index.html from pocketsphinx.js, which is:
// Copyright © 2013-2017 Sylvain Chevalier
// MIT license, see LICENSE for details

require("purecss");
require("./index.css");

const WebworkerPromise = require("webworker-promise");

// Wait 1s after input to update grammar
const INPUT_TIMEOUT = 1000;

// Package these with Webpack
var grammars = {Pizza: require("./pizza.gram"),
		Numbers: require("./numbers.gram"),
		Cities: require("./cities.gram")}
var dicts = {Cities: require("./cities.dict")};

// These will be initialized later
var outputContainer, context, ssjs, recognizer, media_source, worklet_node;
// Only when both recorder and recognizer do we have a ready application
var isRecorderReady = false;
var isRecognizerReady = false;
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
    document.getElementById('current-status').innerHTML = newStatus;
};

// A not-so-great recording indicator
function displayRecording(display) {
    if (display)
	document.getElementById('recording-indicator').innerHTML = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
    else
	document.getElementById('recording-indicator').innerHTML = "";
    recording = display;
};

// This adds words to the recognizer. When it calls back, we are ready
async function feedWords() {
    for (const name in dicts) {
	await recognizer.exec("loadDict", dicts[name]);
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

    // Set up grammar menu and JSGF area
    var selectTag = document.getElementById('grammars');
    for (const name in grammars) {
        var newElt = document.createElement('option');
        newElt.innerHTML = name;
        selectTag.appendChild(newElt);
    }                          
    var jsgfArea = document.getElementById('jsgf');
    async function loadGrammar(name) {
	let grammar_url = grammars[name];
	let response = await fetch(grammar_url);
	if (response.ok) {
	    let jsgf_string = await response.text();
	    jsgfArea.value = jsgf_string;
	}
	else {
	    updateStatus("Failed to fetch " + grammar_url + " :"
			 + response.statusText);
	}
    }
    selectTag.addEventListener("change", function() {
	var name = this.options[this.selectedIndex].innerText;
	loadGrammar(name);
    });
    // Load the first grammar
    await loadGrammar(selectTag.options[selectTag.selectedIndex].innerText);

    outputContainer = document.getElementById("output");
    updateStatus("Initializing web audio, waiting for approval to access the microphone");
    try {
	const AudioContext = window.AudioContext || window.webkitAudioContext;
	context = new AudioContext();
	await context.suspend();
	const stream = await navigator.mediaDevices.getUserMedia({audio: true});
        media_source = context.createMediaStreamSource(stream);
	const workletURL = new URL("./soundswallower-processor.js", import.meta.url);
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
	recognizer = new WebworkerPromise(
	    new Worker(new URL("./recognizer.js", import.meta.url)));
	await recognizer.exec("initialize",
			      {loglevel: "DEBUG", samprate: context.sampleRate});
	await feedWords();
	updateStatus("Speech recognizer ready");
    }
    catch (e) {
	updateStatus("Error initializing speech recognizer: " + e.message);
    }
    // Set up handler to reload grammar when modified
    let timeout = null;
    async function updateGrammar() {
	var was_recording;
	if (recording) {
	    was_recording = true;
	    await recognizer.exec("stop");
	    displayRecording(false);
	}
	await recognizer.exec("setGrammar", jsgfArea.value);
	if (was_recording) {
	    try {
		await recognizer.exec("start");
	    }
	    catch (e) {
		updateStatus("Error starting recognition: " + e.message);
	    }
	    displayRecording(true);
	}
    }
    // Load the current grammar
    await updateGrammar();
    jsgfArea.addEventListener("input", () => {
	clearTimeout(timeout);
	timeout = setTimeout(updateGrammar, INPUT_TIMEOUT);
    });
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
	    await recognizer.exec("process", event.data,
				  [event.data.buffer]);
	    hyp = await recognizer.exec("getHyp")
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
	    await recognizer.exec("stop");
	}
	try {
	    await recognizer.exec("start");
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
	    const { hyp, hypseg } = await recognizer.exec("stop");
	    if (hyp !== undefined)
		updateHyp(hyp);
	    displayRecording(false);
	}
	catch (e) {
	    updateStatus("Error stopping recognition: " + e.message);
	}
	return true;
    };
    startBtn.disabled = false;
    stopBtn.disabled = false;
};

