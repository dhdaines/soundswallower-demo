"use strict";
/**
 * Processor which buffers one channel of input and sends it back to
 * the main thread in reasonably-sized chunks.
 */
class GetAudioProcessor extends AudioWorkletProcessor {
    /**
     * @param {*} options
     * @param {number} options.processorOptions.bufferSize Maximum
     * number of samples in output buffer.
     * @param {number} options.processorOptions.channel Index of
     * channel to extract.
     */
    constructor(options) {
        super();
        this.buf = new Float32Array(options.processorOptions.bufferSize ?? 2048);
        this.channel = options.processorOptions.channel ?? 0;
        this.pos = 0;
    }
    flush() {
        const send_buf = this.buf.slice(0, this.pos);
        this.pos = 0;
        this.port.postMessage(send_buf, [send_buf.buffer]);
    }
    process(inputs, outputs, parameters) {
        let input = inputs[0];
        // Somehow we got disconnected, WTF Web Audio?!?!
        if (input.length == 0) {
            this.flush();
            this.port.postMessage("ERROR");
            return false;
        }
        // Pass through data
        for (const idx in outputs)
            for (const c in outputs[idx])
                outputs[idx][c].set(inputs[idx][c]);
        // This is always 128, but whatever.
        let input_length = input[this.channel].length;
        if (this.pos + input_length > 2048)
            this.flush();
        // The arguments to set() are not in the order a normal
        // programmer would expect...
        this.buf.set(input[this.channel], this.pos);
        this.pos += input_length;
        // we don't actually produce output... but we want to live!
        return true;
    }
}
registerProcessor("getaudio-processor", GetAudioProcessor);
