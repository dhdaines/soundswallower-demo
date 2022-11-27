"use strict";
/**
 * Processor which buffers one channel of input and sends it back to
 * the main thread in equally-sized chunks.
 */
class GetAudioProcessor extends AudioWorkletProcessor {
    /**
     * @param {*} options
     * @param {number} options.processorOptions.bufferSize Number
     * of samples to return at a time.
     * @param {number} options.processorOptions.channel Index of
     * channel to extract.
     */
    constructor(options) {
        super();
        this.buf = new Float32Array(options.processorOptions.bufferSize ?? 2048);
        this.channel = options.processorOptions.channel ?? 0;
        this.pos = 0;
    }
    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input.length == 0)
            throw "WTF WebAudio, input has length 0";
        // Pass through data (FIXME: unsure if necessary)
        for (const idx in outputs)
            for (const c in outputs[idx])
                outputs[idx][c].set(inputs[idx][c]);
        const inbuf = input[this.channel];
        if (this.pos + inbuf.length > this.buf.length) {
            const start = inbuf.subarray(0, this.buf.length - this.pos);
            const end = inbuf.subarray(this.buf.length - this.pos);
            this.buf.set(start, this.pos);
            const send_buf = new Float32Array(this.buf);
            this.port.postMessage(send_buf, [send_buf.buffer]);
            this.buf.set(end);
            this.pos = end.length;
        }
        else {
            this.buf.set(inbuf, this.pos);
            this.pos += inbuf.length;
        }
        // we don't actually produce output... but we want to live!
        return true;
    }
}
registerProcessor("getaudio-processor", GetAudioProcessor);
