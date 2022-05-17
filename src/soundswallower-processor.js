class SoundSwallowerProcessor extends AudioWorkletProcessor {
    // Simply mix-down the data and send it back to the main thread as
    // an Int16Array
    process(inputs, outputs, parameters) {
	const input = inputs[0];
	if (input.length == 0) {
	    return true;
	}
	const short_buf = new Int16Array(input[0].length);
	for (const i in input[0]) {
	    const sample = input[0][i] + input[1][i] * 32768;
	    short_buf[i] = sample;
	}
	this.port.postMessage(short_buf, [short_buf.buffer]);
	return true;
    }
}
registerProcessor("soundswallower-processor", SoundSwallowerProcessor);
