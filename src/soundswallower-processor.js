class SoundSwallowerProcessor extends AudioWorkletProcessor {
    /* Just accumulate data (128 samples is much too short) before sending
     * it back to the main thread.  Otherwise do nothing interesting
     * (perhaps we should do recognition here, perhaps not). */
    constructor() {
	super(...arguments);
	this.buf = new Float32Array(2048);
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
	if (this.pos + input[0].length > 2048)
	    this.flush();
        this.buf.set(input[0], this.pos);
        this.pos += input[0].length;
	// we don't actually produce output... but we want to live!
	return true;
    }
}
registerProcessor("soundswallower-processor", SoundSwallowerProcessor);
