// Copyright (c) 2022 David Huggins-Daines <dhdaines@gmail.com>
// Originally based on recognizer.js from pocketsphinx.js, which is:
// Copyright © 2013-2017 Sylvain Chevalier
// MIT license, see LICENSE for details

var ssjs;
var recognizer = null;
const registerWebWorker = require('webworker-promise/lib/register');
registerWebWorker(onMessage);

async function onMessage(message) {
    if (message.command != "initialize" && recognizer == null)
	throw new Error("Decoder not yet initialized");
    switch(message.command) {
    case 'initialize':
	return initialize(message.data);
    case 'lazyLoadModel':
	return lazyLoadModel(message.data);
    case 'addWords':
	return addWords(message.data);
    case 'setGrammar':
	return setGrammar(message.data);
    case 'start':
	return start(message.data);
    case 'stop':
	return stop();
    case 'process':
	return process(message.data);
    }
}

async function initialize(config) {
    ssjs = await require("soundswallower")()
    if ("hmm" in config)
	ssjs.load_model(config.hmm);
    recognizer = new ssjs.Decoder(config);
    await recognizer.initialize();
}

async function start() {
    return recognizer.start();
}

async function stop() {
    await recognizer.stop();
    return {hyp: hyp, hypseg: hypseg};
}

function addWords(words) {
    let rv;
    for (const i in words) {
	var w = words[i];
	if (w.length == 2) {
	    rv = recognizer.add_word(w[0], w[1], (i == words.length - 1));
	    if (rv == -1)
		break;
	}
    }
    if (rv == -1)
	throw new Error("Failed to add words to recognizer");
}

async function setGrammar(grammar) {
    let fsg = recognizer.create_fsg("_default",
				    grammar.start, grammar.end,
				    grammar.transitions);
    return recognizer.set_fsg(fsg);
}

async function process(array) {
    var output = await recognizer.process_raw(array);
    let hyp = recognizer.get_hyp();
    let hypseg = recognizer.get_hypseg();
    return {hyp: hyp, hypseg: hypseg};
}
