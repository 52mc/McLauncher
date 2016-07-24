// var notification = new Notification('Hello', {
//   body: '你好，欢迎使用McStarter。'
// });
//
// notification.onclick = function () {
//   console.log('Notification clicked');
// };
const angular = require('angular');
const route = require('angular-route');
const animate = require('angular-animate');
const electron = require('electron');
const ipc = electron.ipcRenderer;

angular.module('App',[
  route, animate
])

.config(['$routeProvider', function ($routeProvider){
  $routeProvider.when('/settings', {
    templateUrl: './template/settings.html',
    controller: 'SettingsCtrl'
  });
  $routeProvider.when('/version', {
    templateUrl: './template/version.html',
    controller: 'VersionCtrl'
  });
  $routeProvider.when('/home', {
    templateUrl: "./template/home.html",
    controller:'HomeCtrl'
  });
  $routeProvider.otherwise('/home');
}])

.factory('McConfig', function (){
  var config = {
  }
  function get (){
    return config;
  }
  function set (config){
    config = config;
  }
  return {
    set : set,
    get : get
  }
})

.controller('HomeCtrl', ['$scope', function ($scope){
  $scope.menus = [ 'Settings' ];
  $scope.launchText = 'Launch Minecraft';
  $scope.menuClickHandle = function (index){
    switch (index) {
      case 0:
        // settings
        break;
    }
  };
}])

.controller('SettingsCtrl', ['$scope', function ($scope){
  $scope.model = {
    version: '1.7.2',
    name: 'demo',
    max: 1024,
    path: '',
    area: {
      w: 854,
      h: 480
    }
  };

  // versions
  ipc.send('download');

  const callbackName = 'set-config';
  ipc.send('get-config', callbackName);
  ipc.once(callbackName, function (event, config){
    $scope.config = config;
  });

  var opened = false;
  $scope.openFileDialog = function (){
    if(opened){ return; }
    const callbackName = 'set-jvm-path';
    ipc.send('open-file-dialog', callbackName);
    ipc.once(callbackName, function (event, filepath){
      opened = false;
      if( filepath===undefined ){
        return;
      }
      $scope.config.JreHome = filepath;
      $scope.$apply();
    });
    opened = true;
  };

}])

.controller('VersionCtrl', ['$scope', function ($scope){

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
      if(versions !== undefined) {
        item.checked = item.id === version;
      }else{
        item.checked = false;
      }
    }
    return versions;
  }

  var callbackName = 'update-version';
  ipc.send('get-version', callbackName);
  ipc.once(callbackName, function (event, version){
    $scope.version = version;
    callbackName = 'update-version-list';
    ipc.send('get-version-list', callbackName);
    ipc.once(callbackName, function (event, versions){
      $scope.versions = transferVersion(versions.versions, version);
    });
  });

  $scope.check = function (index){
    $scope.versions = transferVersion($scope.versions);
    var item = $scope.versions[index];
    item.checked = true;
    $scope.version = item.id;
    ipc.send('update-version', $scope.version);
  }

}])

;
