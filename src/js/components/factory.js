module.exports = 'factory';

const IO = require('../lib/io');
const Jre = require('../lib/jre');
const StandardLibraries = require('../lib/standardlibraries');
const Config = require('../lib/config');
const Manifest = require('../lib/manifest');
const Constants = require('../lib/constants');
const Folder = require('../lib/folder');
const Url = require('../lib/url');

const IPC = require('electron').ipcRenderer;

angular.module('factory', [])

	.constant('Constants', Constants)

	.constant('Folder', Folder)

	.constant('IPC', IPC)

	.constant('Url', Url)

	.constant('IO', IO)

	.constant('Jre', Jre)

	.constant('StandardLibraries', StandardLibraries)

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

	.factory('Updater', ['$http', function($http) {
		return {
			check: () => {
				return $http({
					method: 'GET',
					url: 'https://raw.githubusercontent.com/52mc/McLauncher/master/update.json',
					responseType: 'json'
				}).then((res) => {
					return res.data;
				},(res) => {
					console.error('与更新服务器联系时发生错误...', res);
				});
			}
		}
	}])
;
