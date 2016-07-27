module.exports = 'version';
angular.module('version', [require('./factory')])
	.controller('VersionCtrl', ['$scope', 'McConfig', 'Manifest', function ($scope, McConfig, Manifest){
		// 已经离线的版本数组
		const downloaded = McConfig.get('downloaded') || [];

	  var transferVersion = function(versions, version){
	    const count = versions.length;
	    var i = 0;
	    for ( ; i < count; i++) {
	      var item = versions[i];
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

		// 所有版本列表
		const versions = Manifest.versions();
		// 当前版本
    $scope.version = McConfig.get('version');
		// 设置选择当前版本
		$scope.versions = transferVersion(versions, $scope.version);

	  $scope.check = function (index){
			// 重置所有为未选
	    $scope.versions = transferVersion(versions);
			// 选择当前项
	    var item = $scope.versions[index];
	    item.checked = true;
			// 更新当前版本
	    $scope.version = item.id;
	  }

		// 当前版本变化反应到配置文件
	  $scope.$watch('version', function(val, oldVal){
	    if(val === oldVal){ return; }
	    McConfig.set('version', val);
			console.log('update Minecraft version: %s', val);
	  });

	}])

;
