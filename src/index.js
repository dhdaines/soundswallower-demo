"use strict";
// Copyright (c) 2022 David Huggins-Daines <dhdaines@gmail.com>
// Originally based on index.html from pocketsphinx.js, which is:
// Copyright © 2013-2017 Sylvain Chevalier
// MIT license, see LICENSE for details

require("purecss");
require("./index.css");

const VAD = require("./vad.js");

// Wait 1s after input to update grammar
const INPUT_TIMEOUT = 1000;

// Package these with Webpack
var grammars = {Pizza: require("./pizza.gram"),
                Numbers: require("./numbers.gram"),
                Cities: require("./cities.gram")}
var dicts = {Cities: require("./cities.dict")};

// These will be initialized later
var context, ssjs, vader, decoder, media_source, worklet_node;

// Has ASR been started? FIXME: Should go in ssjs.Decoder
var decoding = false;

// To display the hypothesis sent by the recognizer
function updateHyp(hyp) {
    document.getElementById("output").innerHTML = hyp;
}

// This is just a logging window where we display the status
function updateStatus(newStatus) {
    document.getElementById('current-status').innerHTML = newStatus;
}

// A not-so-great recording indicator
function displayRecording(display) {
    if (display) {
        document.getElementById('recording-indicator').innerHTML = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
        document.getElementById('stopBtn').disabled = false;
        updateHyp("");
    }
    else {
        document.getElementById('recording-indicator').innerHTML = "";
        document.getElementById('stopBtn').disabled = true;
    }
}

// This adds words to the recognizer. When it calls back, we are ready
async function feedWords() {
    for (const name in dicts) { // it is not iterable... wow
        let response = await fetch(dicts[name]);
        if (response.ok) {
            let dict_string = await response.text();
            let re = /^(\S+)\s+(.*)$/mg;
            for (const m of dict_string.trim().matchAll(re)) {
                // Fancy way to tell if this is the last line
                let end = m.index + m[0].length;
                let rv = await decoder.add_word(m[1], m[2],
                                                (end == dict_string.length));
                if (rv == -1)
                    throw new Error("Failed to add word "
                                    + m[1] + " with pronunciation " + m[2]);
            }
        }
        else
            throw new Error("Failed to fetch " + dicts[name] + " :"
                            + response.statusText);
    }
}

async function updateGrammar() {
    if (decoding) {
        await decoder.stop();
        decoding = false;
    }
    displayRecording(false);
    try {
        const jsgfArea = document.getElementById('jsgf');
        const fsg = decoder.parse_jsgf(jsgfArea.value);
        await decoder.set_fsg(fsg);
        fsg.delete();
        updateStatus("Updated grammar");
    }
    catch (e) {
        updateStatus("Failed to set grammar: " + e.message);
        throw e;
    }
}

async function loadGrammar(name) {
    let grammar_url = grammars[name];
    let response = await fetch(grammar_url);
    if (response.ok) {
        let jsgf_string = await response.text();
        const jsgfArea = document.getElementById('jsgf');
        jsgfArea.value = jsgf_string;
    }
    else {
        updateStatus("Failed to fetch " + grammar_url + " :"
                     + response.statusText);
    }
}

window.onload = async function() {
    // Load the WASM module
    ssjs = await require("soundswallower")();

    // Wiring JavaScript to the UI
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const jsgfArea = document.getElementById('jsgf');
    startBtn.disabled = true;
    stopBtn.disabled = true;

    // Set up grammar menu and JSGF area
    var selectTag = document.getElementById('grammars');
    for (const name in grammars) {
        var newElt = document.createElement('option');
        newElt.innerHTML = name;
        selectTag.appendChild(newElt);
    }                          
    // Load the first grammar
    await loadGrammar(selectTag.options[selectTag.selectedIndex].innerText);
    // Set up handler to reload grammar when modified
    let timeout = null;
    jsgfArea.addEventListener("input", () => {
        clearTimeout(timeout);
        timeout = setTimeout(updateGrammar, INPUT_TIMEOUT);
    });
    // Set up select to update grammar
    selectTag.addEventListener("change", async function() {
        var name = this.options[this.selectedIndex].innerText;
        await loadGrammar(name);
        // Won't actually trigger the input event so update it here
        await updateGrammar();
    });

    updateStatus("Initializing web audio, waiting for approval to access the microphone");
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        context = new AudioContext();
        await context.suspend();
        const stream = await navigator.mediaDevices.getUserMedia({audio: true});
        media_source = context.createMediaStreamSource(stream);
        const workletURL = new URL("./processors.js", import.meta.url);
        await context.audioWorklet.addModule(workletURL);
        worklet_node = new AudioWorkletNode(context, 'getaudio-processor', {
            /* Verbose Web Audio junk... */
            processorOptions: {
                bufferSize: 2048,
                channel: 0,
            }
        });
        media_source.connect(worklet_node);
        updateStatus("Audio recorder ready");
    }
    catch (e) {
        updateStatus("Error initializing Web Audio browser: " + e.message);
        return false;
    }

    updateStatus("Initializing speech recognizer");
    try {
        decoder = new ssjs.Decoder({
            hmm: "model/en-us", /* Use relative path for deployment in subdir */
            samprate: context.sampleRate});
        await decoder.initialize();
        await feedWords();
        await updateGrammar();
    }
    catch (e) {
        updateStatus("Error initializing speech recognizer: " + e.message);
        return false;
    }
    updateStatus("Speech recognizer ready");

    // Handle VAD and speech input
    vader = new VAD({context: context, source: worklet_node,
                     voice_start: async () => {
                         if (decoding)
                             return;
                         try {
                             await decoder.start();
                             decoding = true;
                         }
                         catch (e) {
                             updateStatus("Error starting recognition: " + e.message);
                             throw e;
                         }
                     },});
    worklet_node.port.onmessage = async function(event) {
        if (!decoding)
            return true;
        if (event.data == "ERROR") {
            updateStatus("AudioWorkletNode got disconnected somehow?!?!?!");
            worklet_node = new AudioWorkletNode(context, 'getaudio-processor');
            media_source.connect(worklet_node).connect(context.destination);
            return true;
        }
        try {
            await decoder.process(event.data);
            let hyp = await decoder.get_hyp();
            if (hyp !== undefined)
                updateHyp(hyp);     
        }
        catch (e) {
            updateStatus("Error processing data: " + e.message);
            throw e;
        }
        return true;
    };
    startBtn.onclick = async function() {
        if (decoding) {
            await decoder.stop();
            decoding = false;
            vader.voice_start();
        }
        await context.resume();
        displayRecording(true);
        return true;
    };
    stopBtn.onclick = async function() {
        await context.suspend();
        if (!decoding)
            return;
        try {
            await decoder.stop();
            const hyp = decoder.get_hyp();
            if (hyp !== undefined)
                updateHyp(hyp);
            decoding = false;
        }
        catch (e) {
            updateStatus("Error stopping recognition: " + e.message);
            throw e;
        }
        displayRecording(false);
        return true;
    };
    startBtn.disabled = false;
}
