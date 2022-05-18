// Copyright (c) 2022 David Huggins-Daines <dhdaines@gmail.com>
// Originally based on index.html from pocketsphinx.js, which is:
// Copyright © 2013-2017 Sylvain Chevalier
// MIT license, see LICENSE for details

const WebworkerPromise = require("webworker-promise");

// Package these with Webpack
var grammars = {Numbers: require("./numbers.gram"),
		Cities: require("./cities.gram"),
		Pizza: require("./pizza.gram")}
var dicts = {Cities: require("./cities.dict")};

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
	const worker = new Worker(new URL("./recognizer.js", import.meta.url));
	recognizer = new WebworkerPromise(worker);
	let ready = await recognizer.postMessage({
	    command: "initialize",
	    data: {loglevel: "DEBUG", samprate: context.sampleRate, nfft: 2048}
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

