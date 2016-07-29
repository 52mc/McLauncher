module.exports = 'factory';

const IO = require('../lib/io');
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

	.constant('IO', IO)

	.constant('Jre', Jre)

	.factory('Notice', function() {
		return {
			send: (type, msg) => {
				if(msg === undefined){
					msg = type;
					type = undefined;
				}
				new Notification('重要消息', {
				  body: msg || ''
				});
			}
		}
	})
;
