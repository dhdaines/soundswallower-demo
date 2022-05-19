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

Because SoundSwallower still relies on Emscripten's filesystem
emulation to load model files, it is necessary to run it within a web
worker.  We use
[webworker-promise](https://github.com/kwolfy/webworker-promise) to
make the code "yinque un peu" more readable.

The audio capture is implemented in a separate worker, an
`AudioWorkletNode` to be precise, because ... well, because, for the
moment.  Ideally we'd just use the [MediaRecorder
API)[https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
but for some bizarre reason it is utterly incapable of just capturing
audio as plain old linear PCM, and insists on encoding it with some
kind of codec, and no, you can't rely on your browser supporting any
particular codec, and NO YOU CANNOT QUERY THE LIST OF CODECS EITHER!!!
NO SOUP FOR YOU!!!

In other words, speech is like everything else in the world of
JavaScript and Web, it works for the use case it was invented for, and
if your use case is different, tough luck, buddy.  So our worklet just
converts the obligatory 44.1kHz stereo 32-bit floating-point data (128
samples at a time! no soup for you!) into something more reasonable.
In the future we might just let WebAudio do FFTs for us to avoid all
this hassle.
