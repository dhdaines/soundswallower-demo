# SoundSwallower web demo application

This is a simple demo application that shows how to integrate
SoundSwallower speech recognition in a web page.  You can try it out
at https://dhdaines.github.io/soundswallower-demo/

## Compilation

To compile, run:

```
npm run build
```

To start, run:

```
npm start
```

There is some magic to getting this to work so pay attention.  The
[Webpack configuration](webpack.config.js) has a few extra elements
that allow loading the SoundSwallower module (in particular the
WebAssembly part, compiled with
[Emscripten](http://www.emscripten.org)) to succeed.  Look at these
parts of the `config` variable in particular:

```js
    plugins: [
        // Just copy the damn WASM because webpack can't recognize
        // Emscripten modules.
        new CopyPlugin({
            patterns: [
            { from: "node_modules/soundswallower/soundswallower.wasm*",
              to: "[name][ext]"},
            // And copy the model files too.  FIXME: Not sure how
            // this will work with require("soundswallower/model")
            { from: modelDir,
              to: "model"},
        ],
    module: {
        rules: [
            { test: /\.(dict|gram)$/i,
              type: "asset/resource",
              generator: {
                  // Don't mangle the names of dictionaries or grammars
                  filename: "model/[name][ext]"
              }
            },
        ],
    },
    // Eliminate webpack's node junk when using webpack
    resolve: {
        fallback: {
            crypto: false,
            fs: false,
            path: false,
        },
    },
    node: {
        global: false,
        __filename: false,
        __dirname: false,
    },
```

## Implementation

The audio capture is implemented in a separate worker, an
`AudioWorkletNode` to be precise, because ... well, because, for the
moment, it doesn't seem possible to get live PCM audio any other way.
This seems to be the [general consensus among
developers](https://github.com/microphone-stream/microphone-stream/issues/47),
as the Web Audio API is not at all designed for this use case, but the
[MediaStream recording
API](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API),
which would be the logical choice, isn't really either (although it is
actually pretty good for recording entire clips/files).

By contrast, we do the speech recognition in the main thread.  For the
simple grammars in the demo, it should be more than fast enough.

We also do endpointing, though the implementation is subject to change
as the API is a little bit clunky.
