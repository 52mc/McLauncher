module.exports = 'settings';
angular.module('settings', [require('./factory')])
	.controller('SettingsCtrl', ['$scope', 'McConfig', 'IPC', 'Jre', 'Notice', 'Folder', function ($scope, McConfig, IPC, Jre, Notice, Folder){

	  var config = $scope.config = McConfig.get();
		const fd = Folder.init(config.version);

		// 已经离线的版本，可以打开游戏目录
		$scope.open = (config.downloaded.indexOf(config.version) != -1);

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
			Jre.loadJre().then((jre) => {
				console.log('系统Jre信息 %o', jre);
				$scope.config.jre.home = jre.path;
				$scope.$apply();
				Notice.send('success', `成功找到${jre.version}版本的JAVA环境`);
			}).catch((err) => {
				Notice.send('error', '找不到JAVA环境，请手动选择JVM地址');
				console.log('查询系统Jre信息出错... %d', err);
			});
		}

		$scope.openGameFd = function (){
			IPC.send('show-folder', fd.game);
		}

		$scope.resetAreaToDefault = function (){
			$scope.config.area = {
				width: 854,
				height: 480
			};
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
