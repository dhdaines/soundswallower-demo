# SoundSwallower web demo application

This is a simple demo application that shows how to integrate
SoundSwallower speech recognition in a web page.  There is some magic
to getting this to work so pay attention.

To compile, run:

```
npm run build
```

To start, run:

```
npm start
```

Because SoundSwallower still relies on Emscripten's filesystem
emulation to load model files, it is necessary to run it within a web
worker.  We use
[webworker-promise](https://github.com/kwolfy/webworker-promise) to
make the code more readable.
