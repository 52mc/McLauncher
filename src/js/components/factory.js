module.exports = 'factory';

var core = require('../../lib/core');
var Config = require('../../lib/config');
var ipc = require('electron').ipcRenderer;

angular.module('factory', [])
	.factory('McConfig', function (){
	  var _config = {}

	  function get (key){
	    return key === undefined ? _config : _config[key];
	  }

	  function set (key, value){
	    if(value === undefined){
	      _config = key;
	    }else{
	      _config[key] = value;
	    }
			Config.set(_config);
	  }

	  function _init(){
	    _config = Config.get();
	  }

	  _init();

	  return {
	    set : set,
	    get : get
	  }
	})

	.factory('IPC', function(){
		return ipc;
	})

	.factory('Core', function(){
		return core;
	})

	.factory('Notice', function(){
		return {
			send: (msg) => {
				new Notification('Hello', {
				  body: msg || ''
				});
			}
		}
	})
;
