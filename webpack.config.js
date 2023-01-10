const path = require("path")
const { DefinePlugin } = require("webpack")
const { CleanWebpackPlugin } = require("clean-webpack-plugin")

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
  target: "node",
  mode: "none",
  entry: {
    extension: "./src/extension.ts",
    webview: {
      import: "./src/webview/index.tsx",
      library: {
        type: "this",
      },
    },
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    libraryTarget: "umd",
  },
  externals: {
    vscode: "commonjs vscode",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"), // 这样配置后 @ 可以指向 src 目录
    },
    extensions: [".ts", ".tsx", ".js", ".jsx", ".css"],
  },
  plugins: [
    // 解决react开发的嵌套webview缺失node环境下的process.env
    new DefinePlugin({
      "process.env": {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV),
      },
    }),
    new CleanWebpackPlugin(),
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: "/node_modules/",
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.module\.less$/,
        use: [
          // compiles Less to CSS
          "style-loader",
          "css-loader",
          "less-loader",
          {
            loader: "style-resources-loader",
            options: {
              patterns: ["./src/webview/styles/*.less"],
            },
          },
        ],
      },
      {
        test: /\.(jpg|png|gif)$/, // 针对这三种格式的文件使用file-loader处理
        use: {
          loader: "file-loader",
          options: {
            // 定义打包后文件的名称；
            // [name]:原文件名，[hash]:hash字符串（如果不定义名称，默认就以hash命名，[ext]:原文件的后缀名）
            name: "[name].[ext]",
            outputPath: "images/", //  定义图片输出的文件夹名（在output.path目录下）
          },
        },
      },
    ],
  },
  devtool: "inline-source-map",
  infrastructureLogging: {
    level: "log", // enables logging required for problem matchers
  },
}

module.exports = [extensionConfig]
