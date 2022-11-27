// Copyright (c) 2022 David Huggins-Daines <dhdaines@gmail.com>
// MIT license, see LICENSE for details

import soundswallower_factory, {
    Decoder,
    Endpointer,
    SoundSwallowerModule,
} from "soundswallower";

var soundswallower: SoundSwallowerModule;

require("purecss");
require("./index.css");

// Wait 1s after input to update grammar
const INPUT_TIMEOUT = 1000;

// Package these with Webpack
const GRAMMARS: { [name: string]: string } = {
    Pizza: require("./pizza.gram"),
    Numbers: require("./numbers.gram"),
    Cities: require("./cities.gram")
};
const DICTS: { [name: string]: string } = {
    Cities: require("./cities.dict")
};

class DemoApp {
    stopButton: HTMLButtonElement;
    startButton: HTMLButtonElement;
    jsgfArea: HTMLTextAreaElement;
    selectTag: HTMLSelectElement;
    recordingIndicator: HTMLElement;
    outputBox: HTMLElement;
    statusBox: HTMLElement;

    context: AudioContext;
    worklet_node: AudioWorkletNode;
    decoder: Decoder;
    endpointer: Endpointer;
    frame_size: number;
    decoding: boolean = false;

    updateHyp(hyp: string) {
        this.outputBox.innerHTML = hyp;
    }

    updateStatus(newStatus: string) {
        this.statusBox.innerHTML = newStatus;
    }

    displayRecording(display: boolean) {
        if (display) {
            this.recordingIndicator.innerHTML = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
            this.stopButton.disabled = false;
            this.updateHyp("");
        }
        else {
            this.recordingIndicator.innerHTML = "";
            this.stopButton.disabled = true;
        }
    }

    async feedWords() {
        for (const name in DICTS) { // it is not iterable... wow
            const response = await fetch(DICTS[name]);
            if (response.ok) {
                const dict_string = await response.text();
                const re = /^(\S+)\s+(.*)$/mg;
                let m;
                while ((m = re.exec(dict_string.trim())) !== null) {
                    // Fancy way to tell if this is the last line
                    const end = m.index + m[0].length;
                    const rv = await this.decoder.add_word(m[1], m[2],
                                                           (end == dict_string.length));
                    if (rv == -1)
                        throw new Error("Failed to add word "
                            + m[1] + " with pronunciation " + m[2]);
                }
            }
            else
                throw new Error("Failed to fetch " + DICTS[name] + " :"
                    + response.statusText);
        }
    }

    async updateGrammar() {
        if (this.decoding) {
            await this.decoder.stop();
            this.decoding = false;
            this.displayRecording(false);
        }
        try {
            await this.decoder.set_jsgf(this.jsgfArea.value);
            this.updateStatus("Updated grammar");
        }
        catch (e) {
            this.updateStatus("Failed to set grammar: " + e.message);
        }
    }

    async loadGrammar(name: string) {
        const grammar_url = GRAMMARS[name];
        const response = await fetch(grammar_url);
        if (response.ok) {
            const jsgf_string = await response.text();
            this.jsgfArea.value = jsgf_string;
        }
        else {
            this.updateStatus("Failed to fetch " + grammar_url + " :"
                + response.statusText);
        }
    }

    setupUI() {
        // Get the control buttons
        this.startButton = document.getElementById('startButton') as HTMLButtonElement;
        this.stopButton = document.getElementById('stopButton') as HTMLButtonElement;
        this.jsgfArea = document.getElementById('jsgf') as HTMLTextAreaElement;
        this.recordingIndicator = document.getElementById('recording-indicator');
        this.outputBox = document.getElementById("output");
        this.statusBox = document.getElementById("current-status");

        this.startButton.disabled = true;
        this.stopButton.disabled = true;

        // Set up grammar menu and JSGF area
        this.selectTag = document.getElementById('grammars') as HTMLSelectElement;
        for (const name in GRAMMARS) {
            var newElt = document.createElement('option');
            newElt.innerHTML = name;
            this.selectTag.appendChild(newElt);
        }                          
        // Load the first grammar's text into the JSGF area
        this.loadGrammar(this.selectTag.options[this.selectTag.selectedIndex].innerText);
        // Set up handler to reload grammar when modified
        let timeout: number;
        this.jsgfArea.addEventListener("input", () => {
            window.clearTimeout(timeout);
            timeout = window.setTimeout(() => this.updateGrammar(), INPUT_TIMEOUT);
        });
        // Set up handler to load new grammar from menu
        this.selectTag.addEventListener("change", async () => {
            var name = this.selectTag.options[this.selectTag.selectedIndex].innerText;
            await this.loadGrammar(name);
            await this.updateGrammar();
        });
    }

    async setupAudio() {
        this.updateStatus("Initializing web audio, waiting for approval to access the microphone");
        this.context = new AudioContext();
        await this.context.suspend();
        const stream = await navigator.mediaDevices.getUserMedia({audio: true});
        const media_source = this.context.createMediaStreamSource(stream);
        const workletURL = new URL("./processor.js", import.meta.url);
        await this.context.audioWorklet.addModule(workletURL);
        this.endpointer = new soundswallower.Endpointer(this.context.sampleRate);
        this.frame_size = this.endpointer.get_frame_size();
        this.worklet_node = new AudioWorkletNode(this.context, 'getaudio-processor', {
            /* Verbose Web Audio junk... */
            processorOptions: {
                bufferSize: this.frame_size,
                channel: 0,
            }
        });
        media_source.connect(this.worklet_node);
        this.updateStatus("Audio recorder ready");
    }

    async setupASR() {
        this.updateStatus("Initializing speech recognizer");
        this.decoder = new soundswallower.Decoder({samprate: this.context.sampleRate});
        await this.decoder.initialize();
        await this.feedWords();
        await this.updateGrammar();
        this.updateStatus("Speech recognizer ready");
        this.worklet_node.port.onmessage =
            async (event: MessageEvent) => this.processAudio(event);
        this.startButton.onclick = async () => {
            if (this.decoding) {
                await this.decoder.stop();
                this.decoding = false;
            }
            await this.context.resume();
            this.displayRecording(true);
            return true;
        };
        this.stopButton.onclick = async () => {
            await this.context.suspend();
            if (!this.decoding)
                return false;
            try {
                await this.decoder.stop();
                const hyp = this.decoder.get_hyp();
                if (hyp !== undefined)
                    this.updateHyp(hyp);
                this.decoding = false;
            }
            catch (e) {
                this.updateStatus("Error stopping recognition: " + e.message);
                throw e;
            }
            this.displayRecording(false);
            return true;
        };
        this.startButton.disabled = false;
    }

    async processAudio(event: MessageEvent) {
        try {
            const prev_in_speech = this.endpointer.get_in_speech();
            const speech = this.endpointer.process(event.data);
            if (speech !== null) {
                if (!prev_in_speech) {
                    await this.decoder.start();
                    this.decoding = true;
                }
                await this.decoder.process(speech);
                if (!this.endpointer.get_in_speech()) {
                    await this.decoder.stop();
                    this.decoding = false;
                }
                const hyp = await this.decoder.get_hyp();
                if (hyp !== undefined)
                    this.updateHyp(hyp);
            }
        }
        catch (e) {
            this.updateStatus("Error processing data: " + e.message);
            throw e;
        }
        return true;
    }
}

window.onload = async function() {
    // Load WASM
    if (soundswallower === undefined)
      soundswallower = await soundswallower_factory();
    const app = new DemoApp();
    app.setupUI();
    try {
        await app.setupAudio();
        await app.setupASR();
    }
    catch (e) {
        app.updateStatus("Error initializing speech recognition: " + e.message);
        throw(e);
    }
}
