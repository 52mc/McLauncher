module.exports = 'initialize';

const mkdirp = require('mkdirp');
const constants = require('../lib/constants');
const manifestUrl = require('../lib/url').manifest;

angular.module('initialize', [
	require('./provider')
])
.config(['ManifestProvider', 'McConfigProvider', function(ManifestProvider, McConfigProvider) {
	console.log('App Initialize!');

	// 创建工作空间
	const workspace = constants.WORKSPACE;
	try {
		mkdirp.sync(workspace);
	} catch (e) {
		console.log('Make workspace folder failed: ', e);
	}

	// 初始化manifest
	ManifestProvider.config(manifestUrl, constants.VERSIONS);

	// 初始化McConfig
	McConfigProvider.config(constants.CONFIG);

}])
;
