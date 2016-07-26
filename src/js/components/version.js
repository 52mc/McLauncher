module.exports = 'version';
angular.module('version', [require('./factory')])
	.controller('VersionCtrl', ['$scope', 'McConfig', 'IPC', 'Core', function ($scope, McConfig, IPC, Core){
		// 已经离线的版本数组
		const downloaded = McConfig.get('Downloaded') || [];

	  var getChineseType = function (type){
	    switch (type){
	      case 'release'  : return '正式版';
	      case 'snapshot' : return '快照版';
	      case 'old_beta' : return '初期内测版';
	      case 'old_alpha': return '初期开发版';
	      default         : return type;
	    }
	  }

	  var transferVersion = function(versions, version){
	    const count = versions.length;
	    var i = 0;
	    for ( ; i < count; i++) {
	      var item = versions[i];
	      item.type = getChineseType(item.type);
				// 标记当前勾选版本
	      if(versions !== undefined) {
	        item.checked = item.id === version;
	      }else{
	        item.checked = false;
	      }
				// 标记已离线
				item.downloaded = (downloaded.indexOf(item.id) !== -1);
	    }
	    return versions;
	  }

		// 当前版本
    $scope.version = McConfig.get('MinecraftVersion');

		// 所有版本列表
		const versions = Core.versions.getVersions();
		// 设置选择当前版本
		$scope.versions = transferVersion(versions, $scope.version);

	  $scope.check = function (index){
			// 重置所有为未选
	    $scope.versions = transferVersion($scope.versions);
			// 选择当前项
	    var item = $scope.versions[index];
	    item.checked = true;
			// 更新当前版本
	    $scope.version = item.id;
	  }

		// 当前版本变化反应到配置文件
	  $scope.$watch('version', function(val, oldVal){
	    if(val === oldVal){
	      return;
	    }
	    McConfig.set('MinecraftVersion', val);
			console.log('update Minecraft version: %s', val);
	  });

	}])

;
