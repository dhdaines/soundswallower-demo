// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const modelDir = require("soundswallower/model");

const isProduction = process.env.NODE_ENV == "production";

const config = {
  entry: "./src/index.ts",
  output: {
    path: path.resolve(__dirname, "docs"),
    clean: true,
  },
  devServer: {
    open: true,
    host: "localhost",
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "src/index.html",
    }),
    new MiniCssExtractPlugin(),

    // Add your plugins here
    // Learn more about plugins from https://webpack.js.org/configuration/plugins/
    // Just copy the damn WASM because webpack can't recognize
    // Emscripten modules.
    new CopyPlugin({
      patterns: [
        {
          from: "node_modules/soundswallower/soundswallower.wasm*",
          to: "[name][ext]",
        },
        // And copy the model files too.  FIXME: Not sure how
        // this will work with require("soundswallower/model")
        {
          from: modelDir,
          to: "model",
          globOptions: {
            ignore: ["**/fr-fr", "**/mdef.txt"],
          },
        },
      ],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
        type: "asset",
      },
      // Add your rules for custom modules here
      // Learn more about loaders from https://webpack.js.org/loaders/
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
      {
        test: /\.(dict|gram)$/i,
        type: "asset/resource",
        generator: {
          // Don't mangle the names of dictionaries or grammars
          filename: "model/[name][ext]",
        },
      },
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    // Eliminate emscripten's node junk
    fallback: {
      crypto: false,
      fs: false,
      path: false,
    },
  },
  // ARGH! More node junk! WTF!
  node: {
    global: false,
    __filename: false,
    __dirname: false,
  },
};

module.exports = () => {
  if (isProduction) {
    config.mode = "production";
  } else {
    config.mode = "development";
    config.devtool = "eval-source-map";
  }
  return config;
};
