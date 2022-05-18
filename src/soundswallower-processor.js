class SoundSwallowerProcessor extends AudioWorkletProcessor {
    // Mix-down the data and accumulate it a bit (128 samples is much
    // too short) before sending back to the main thread
    constructor() {
	super(...arguments);
	this.short_buf = new Int16Array(2048);
	this.pos = 0;
    }
    flush() {
	const send_buf = this.short_buf.slice(0, this.pos);
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
	for (const i in input[0]) {
	    const sample = input[0][i] + input[1][i] * 32768;
	    this.short_buf[this.pos++] = sample;
	}
	// we don't actually produce output... but we want to live!
	return true;
    }
}
registerProcessor("soundswallower-processor", SoundSwallowerProcessor);
