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

	.constant('IPC', IPC)

	.constant('Url', Url)

	.constant('Core', Core)

	.constant('Jre', Jre)

	.factory('Notice', function() {
		return {
			send: (msg) => {
				new Notification('重要消息', {
				  body: msg || ''
				});
			}
		}
	})
;
