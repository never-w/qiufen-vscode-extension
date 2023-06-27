const path = require('path')

const { CleanWebpackPlugin } = require('clean-webpack-plugin')

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
  target: 'node',
  mode: 'production',
  entry: {
    mock_server: './mock_server/index.ts',
    doc_server: './doc_server/index.ts',
    extension: './src/extension.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    libraryTarget: 'commonjs-module',
  },
  externals: {
    vscode: 'commonjs vscode',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // 这样配置后 @ 可以指向 src 目录
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.css'],
  },
  plugins: [new CleanWebpackPlugin()],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: '/node_modules/',
      },
    ],
  },
  devtool: 'inline-source-map',
  infrastructureLogging: {
    level: 'log',
  },
}

module.exports = [extensionConfig]
