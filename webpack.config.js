var path = require('path');
var webpack = require('webpack');
var config = require('./config');
var debug = config.debug;

var plugins = [
  new webpack.DefinePlugin({
    __DEV__: debug
  }),
  new webpack.BannerPlugin('This file is created by eeve.'),
  new webpack.optimize.OccurenceOrderPlugin(),
  new webpack.HotModuleReplacementPlugin(),
  new webpack.NoErrorsPlugin()
];

if(!debug){
  plugins.push(
    new webpack.optimize.UglifyJsPlugin({
      test: /(\.jsx|\.js)$/,
      compress: {
        warnings: false
      }
    })
  );
}

var config = {
  context: __dirname,
  entry: {
    index: './src/js/index.js'
  },
  output: {
    // 页面相对路径
    publicPath: "/",
    // 生成文件所在路径
    path: path.resolve(__dirname, "app", "js"),
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
			}
    ]
  },
  resolve: {
    extensions: ['', '.js', '.less'],
    modulesDirectories: ["node_modules", "bower_components"]
  }
};

module.exports = config;
