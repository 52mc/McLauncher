var path = require('path');
var webpack = require('webpack');
var config = require('./config');
var debug = config.debug;

var HtmlWebpackPlugin = require('html-webpack-plugin');
var plugins = [
  new webpack.DefinePlugin({
    __DEV__: debug
  }),
  new webpack.BannerPlugin('This file is created by eeve.'),
  new webpack.optimize.OccurenceOrderPlugin(),
  new webpack.NoErrorsPlugin(),
  new webpack.HotModuleReplacementPlugin(),
  new HtmlWebpackPlugin({
    inject: true,
    template: './src/index.ejs',
    title: 'McLauncher - [由eeve开发的一款全平台的Minecraft启动器]',
    hash: true,
    chunks: [ 'js/app' ],
    css: [ "css/app.css" ],
    devServer: 'http://localhost:8080'
  })
];

if(!debug){
  plugins = plugins.concat([
    new webpack.optimize.UglifyJsPlugin({
      test: /(\.jsx|\.js)$/,
      compress: {
        warnings: false
      }
    })
  ]);
}

var config = {
  context: __dirname,
  cache: true,
  target: 'electron', // http://webpack.github.io/docs/configuration.html#target
  entry: {
    'js/app': ['babel-polyfill', './src/js/app.js']
  },
  output: {
    // 页面相对路径
    publicPath: "/",
    // 生成文件所在路径
    path: path.resolve(__dirname, "app"),
    // 文件名
    filename: '[name].js'
  },
  plugins: plugins,
  devtool: '#source-map',
  module:{
    loaders:[
      { test: /\.css$/, loader: 'style!css' },
      { test: /\.less$/, loader: 'style!css!less' },
			{
				test   : /\.woff|\.woff2|\.svg|.eot|\.ttf/,
				loader : 'url?prefix=font/&limit=10000'
			},
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        query: {
          presets: ['es2015', 'stage-0']
        }
      },
      { test: /\.json?$/, loader: 'json-loader' }
    ]
  },
  resolve: {
    extensions: ['', '.js', '.less', '.json'],
    modulesDirectories: ["node_modules", "bower_components"]
  }
};

module.exports = config;
