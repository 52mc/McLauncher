const angular = require('angular');
const route = require('angular-route');
const animate = require('angular-animate');

var App = angular.module('App',[
  route, animate,
  require('./components/initialize'),
	require('./components/home'),
	require('./components/settings'),
	require('./components/version'),
	require('./components/router')
]);
module.exports = App;
