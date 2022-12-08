"use strict";
class GetAudioProcessor extends AudioWorkletProcessor {
    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input.length == 0) {
            console.log("WTF WebAudio, input has length 0");
            return true;
        }
        const inbuf = input[0];
        this.port.postMessage(inbuf);
        return true;
    }
}
registerProcessor("getaudio-processor", GetAudioProcessor);
