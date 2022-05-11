// Copyright (c) 2022 David Huggins-Daines <dhdaines@gmail.com>
// Originally based on index.html from pocketsphinx.js, which is:
// Copyright © 2013-2017 Sylvain Chevalier
// MIT license, see LICENSE for details

const WebworkerPromise = require("webworker-promise");

// Extra dictionary words
var wordList = [
    ["san_francisco", "S AE N F R AE N S IH S K OW"],
    ["new_york", "N UW Y AO R K"],
    // This salsa's made in...
    ["new_york_city", "N UW Y AO R K S IH T IY"]
];
// This grammar recognizes digits
var grammarDigits = {
    numStates: 1, start: 0, end: 0,
    transitions: [{from: 0, to: 0, word: "one"},
		  {from: 0, to: 0, word: "two"},
		  {from: 0, to: 0, word: "three"},
		  {from: 0, to: 0, word: "four"},
		  {from: 0, to: 0, word: "five"},
		  {from: 0, to: 0, word: "six"},
		  {from: 0, to: 0, word: "seven"},
		  {from: 0, to: 0, word: "eight"},
		  {from: 0, to: 0, word: "nine"},
		  {from: 0, to: 0, word: "zero"}]};
// This grammar recognizes a few cities names
var grammarCities = {numStates: 1, start: 0, end: 0,
		     transitions: [{from: 0, to: 0, word: "new_york"},
				   {from: 0, to: 0, word: "new_york_city"},
				   {from: 0, to: 0, word: "paris"},
				   {from: 0, to: 0, word: "shanghai"},
				   {from: 0, to: 0, word: "san_francisco"},
				   {from: 0, to: 0, word: "london"},
				   {from: 0, to: 0, word: "berlin"}]};
var grammars = {"Digits": grammarDigits, "Cities": grammarCities};
// These will be initialized later
var outputContainer, context, ssjs, recognizer, worklet_node;
// Only when both recorder and recognizer do we have a ready application
var isRecorderReady = isRecognizerReady = false;
// Do not feed data to the recorder if not ready
var recording = false;

// To display the hypothesis sent by the recognizer
function updateHyp(hyp) {
    if (outputContainer) outputContainer.innerHTML = hyp;
};

// This updates the UI when the app might get ready
function updateUI() {
    if (isRecorderReady && isRecognizerReady) startBtn.disabled = stopBtn.disabled = false;
};

// This is just a logging window where we display the status
function updateStatus(newStatus) {
    document.getElementById('current-status').innerHTML += "<br/>" + newStatus;
};

// A not-so-great recording indicator
function displayRecording(display) {
    if (display) document.getElementById('recording-indicator').innerHTML = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
    else document.getElementById('recording-indicator').innerHTML = "";
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
    selectTag.onchange = function() {
	var name = this.options[this.selectedIndex].innerText;
	recognizer.postMessage({
	    command: "setGrammar", data: grammars[name]
	});
    }
    // Load the first grammar
    selectTag.onchange();
};

// This adds words to the recognizer. When it calls back, we are ready
var feedWords = function(words) {
    recognizer.postMessage({command: 'addWords', data: words});
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
	context.suspend();
	const stream = await navigator.mediaDevices.getUserMedia({audio: true});
        const source = context.createMediaStreamSource(stream);
	const workletURL = new URL("./soundswallower-processor.js", import.meta.url);
	await context.audioWorklet.addModule(workletURL);
	worklet_node = new AudioWorkletNode(context, 'soundswallower-processor');
	source.connect(worklet_node).connect(context.destination);
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
	    data: {hmm: "en-us", dict: "en-us.dict", loglevel: "DEBUG",
		   samprate: context.sampleRate, nfft: 2048}
	});
	updateGrammars();
	feedWords(wordList);
	updateStatus("Speech recognizer ready");
    }
    catch (e) {
	updateStatus("Error initializing speech recognizer: " + e.message);
    }
    worklet_node.port.onmessage = async function(event) {
	if (!recording)
	    return true;
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
	context.resume();
	try {
	    await recognizer.postMessage({
		command: "start"
	    });
	}
	catch (e) {
	    updateStatus("Error starting recognition: " + e.message);
	}
	displayRecording(true);
	return true;
    };
    stopBtn.onclick = async function() {
	context.suspend();
	try {
	    await recognizer.postMessage({
		command: "stop"
	    });
	}
	catch (e) {
	    updateStatus("Error stopping recognition: " + e.message);
	}
	displayRecording(false);
	return true;
    };
    startBtn.disabled = false;
    stopBtn.disabled = false;
};

