module.exports = 'Factory';

var core = require('../../lib/core');
var Config = require('../../lib/config');
var ipc = require('electron').ipcRenderer;

angular.module('Factory', [])
	.factory('McConfig', function (){
	  var _config = {}

	  function get (key){
	    return key === undefined ? _config : _config[key];
	  }

	  function set (key, value){
	    if(value===undefined){
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
;
