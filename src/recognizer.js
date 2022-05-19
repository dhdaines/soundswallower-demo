// Copyright (c) 2022 David Huggins-Daines <dhdaines@gmail.com>
// Originally based on recognizer.js from pocketsphinx.js, which is:
// Copyright © 2013-2017 Sylvain Chevalier
// MIT license, see LICENSE for details

var ssjs;
var recognizer = null;
const registerWebWorker = require('webworker-promise/lib/register');
registerWebWorker()
    .operation("initialize", initialize)
    .operation("addWords", addWords)
    .operation("loadDict", loadDict)
    .operation("setGrammar", setGrammar)
    .operation("loadGrammar", loadGrammar)
    .operation("start", start)
    .operation("stop", stop)
    .operation("process", process)
    .operation("getHyp", getHyp)
    .operation("getHypSeg", getHypSeg);

async function initialize(config) {
    ssjs = await require("soundswallower")()
    recognizer = new ssjs.Decoder(config);
    return recognizer.initialize();
}

async function start() {
    return recognizer.start();
}

async function stop() {
    await recognizer.stop();
    let hyp = recognizer.get_hyp();
    let hypseg = recognizer.get_hypseg();
    return {hyp: hyp, hypseg: hypseg};
}

async function addWords(words) {
    let rv;
    for (const i in words) {
	var w = words[i];
	if (w.length == 2) {
	    rv = await recognizer.add_word(w[0], w[1], (i == words.length - 1));
	    if (rv == -1)
		break;
	}
    }
    if (rv == -1)
	throw new Error("Failed to add words to recognizer");
}

async function loadDict(dict_url) {
    let response = await fetch(dict_url);
    if (response.ok) {
	let dict_string = await response.text();
	let re = /^(\S+)\s+(.*)$/mg;
	for (const m of dict_string.trim().matchAll(re)) {
	    // Fancy way to tell if this is the last line
	    let end = m.index + m[0].length;
	    let rv = await recognizer.add_word(m[1], m[2],
					       end == dict_string.length);
	    if (rv == -1)
		throw new Error("Failed to add word "
				+ m[1] + " with pronunciation " + m[2]);
	}
    }
    else
	throw new Error("Failed to fetch " + dict_url + " :"
			+ response.statusText);
}

async function setGrammar(grammar) {
    let fsg = recognizer.create_fsg("_default",
				    grammar.start, grammar.end,
				    grammar.transitions);
    await recognizer.set_fsg(fsg);
    fsg.delete();
}

async function loadGrammar(grammar_url) {
    let response = await fetch(grammar_url);
    if (response.ok) {
	let jsgf_string = await response.text();
	let fsg = recognizer.parse_jsgf(jsgf_string);
	await recognizer.set_fsg(fsg);
	fsg.delete();
    }
    else
	throw new Error("Failed to fetch " + grammar_url + " :"
			+ response.statusText);
}

async function process(array) {
    return recognizer.process_raw(array);
}

function getHyp() {
    return recognizer.get_hyp();
}

function getHypSeg() {
    return recognizer.get_hypseg();
}
