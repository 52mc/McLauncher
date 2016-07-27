module.exports = 'factory';

const Core = require('../lib/core');
const Jre = require('../lib/jre');
const Config = require('../lib/config');
const Manifest = require('../lib/manifest');
const Constants = require('../lib/constants');
const Url = require('../lib/url');

const IPC = require('electron').ipcRenderer;

angular.module('factory', [])

	.constant('Constants', Constants)

	.factory('IPC', function() {
		return IPC;
	})

	.factory('Url', function() {
		return Url;
	})

	.factory('Core', function() {
		return Core;
	})

	.factory('Jre', function() {
		return Jre;
	})

	.factory('Notice', function() {
		return {
			send: (msg) => {
				new Notification('Hello', {
				  body: msg || ''
				});
			}
		}
	})
;
