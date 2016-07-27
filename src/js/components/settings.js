module.exports = 'settings';
angular.module('settings', [require('./factory')])
	.controller('SettingsCtrl', ['$scope', 'McConfig', 'IPC', function ($scope, McConfig, IPC){

	  $scope.config = McConfig.get();
		
	  var opened = false;
	  $scope.openFileDialog = function (){
	    if(opened) { return; }
	    const callbackName = 'pick-path';
	    IPC.send('open-file-dialog', callbackName);
	    IPC.once(callbackName, function (event, filepath){
	      opened = false;
	      if( filepath === undefined ){
	        return;
	      }
	      $scope.config.jre.home = filepath;
	      $scope.$apply();
	    });
	    opened = true;
	  };

		// config发生变化则反应到配置文件
		$scope.$watch('config', function(conf, oldConf){
			if(conf == oldConf){ return; }
			McConfig.set(conf);
		}, true);

	}])
;
