module.exports = 'settings';
angular.module('settings', [require('./factory')])
	.controller('SettingsCtrl', ['$scope', 'McConfig', 'IPC', 'Jre', 'Notice', function ($scope, McConfig, IPC, Jre, Notice){

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
	      $scope.config.jre.home = filepath + '/java';
	      $scope.$apply();
	    });
	    opened = true;
	  };

		$scope.autoFindJava = function (){
			Jre.loadJrePath().then((bin) => {
				$scope.config.jre.home = bin;
				$scope.$apply();
			}).catch((err) => {
			  console.log(err);
			  Notice.send('error', '找不到JAVA环境');
			});
		}

		// 配置项中jre为空时，自动执行查找jre
		if($scope.config.jre.home === ''){
			$scope.autoFindJava();
		}

		// config发生变化则反应到配置文件
		$scope.$watch('config', function(conf, oldConf){
			if(conf == oldConf){ return; }
			McConfig.set(conf);
		}, true);

	}])
;
