var _Manifest = require('../lib/manifest');
var _McConfig = require('../lib/config');

module.exports = 'provider';
angular.module('provider', [])
	.provider('Manifest', function() {

		var instance = null;
		this.config = function(_url, _local) {
			instance = new _Manifest(_url, _local);
		};

		this.$get = function() {
			return {
				formatedVersions: function() {
					return instance.getFormatVersions();
				},
				versions : function() {
					return instance.getAllVersions();
				},
				latest : function() {
					return instance.getLatest();
				}
			}
		}

	})

	.provider('McConfig', function() {

		var instance = null;
		this.config = function(_local) {
			instance = new _McConfig(_local);
		};

		this.$get = function() {
			return instance;
		}

	})
;
