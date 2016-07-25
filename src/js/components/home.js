// var notification = new Notification('Hello', {
//   body: '你好，欢迎使用McStarter。'
// });
//
// notification.onclick = function () {
//   console.log('Notification clicked');
// };
module.exports = 'home';
angular.module('home',[require('./factory')])
.controller('HomeCtrl', ['$scope', 'McConfig', 'IPC', 'Core', function ($scope, McConfig, IPC, Core){
  $scope.menus = [ { title: 'Settings', url: '#/settings' } ];
  $scope.launchText = 'Launch Minecraft';
  function updateText(title, process){
    $scope.launchText = `${title} ${process}%`;
    $scope.$apply();
  }
  $scope.launch = function () {
    $scope.launchText = 'Launching...';
    const MinecraftVersion = McConfig.get('MinecraftVersion');
    var args = {
        player: McConfig.get('PlayerName'),
        width: McConfig.get('Area')['width'],
        height: McConfig.get('Area')['height'],
        xmx: 512,
        xms: McConfig.get('JVMMemory'),
    };
    if(MinecraftVersion === '0.0.0'){
      console.log('请选择Minecraft版本');
      $scope.launchText = '请选择Minecraft版本';
    }
    console.log('launching Minecraft, version: %s, args: %o.', MinecraftVersion, args);

    const version = McConfig.get('MinecraftVersion');

    // ========== Core ==========
    const DownloadMinecraftProcess = Core.process.DownloadMinecraft(version);
    const DownloadMinecraftProcessEvent = DownloadMinecraftProcess.event;
    // ========== Lib ==========
    const DownloadLibrariesProcess = Core.process.DownloadLibraries(version);
    const DownloadLibrariesProcessEvent = DownloadLibrariesProcess.event;

    DownloadMinecraftProcessEvent.on('process', (process) => {
      console.log('event process %d%%, %o', process.Process, process);
      updateText('Downloading game core', process.Process);
    });
    DownloadMinecraftProcessEvent.on('done', () => {
      console.log('event done');
      DownloadLibrariesProcess.start();
    });
    DownloadMinecraftProcessEvent.on('error', () => {
      console.log('event error');
    });
    DownloadMinecraftProcessEvent.on('json', () => {
      console.log('event json');
    });
    // 切记一定先绑定事件，再start
    DownloadMinecraftProcess.start();

    DownloadLibrariesProcessEvent.on('libraries', () => {
      console.log('DownloadLibrariesProcessEvent 开始下载libraries');
    });
    DownloadLibrariesProcessEvent.on('libraries_process', (process) => {
      console.log('DownloadLibrariesProcessEvent count:%d / total:%d', process.count, process.total);
    });
    DownloadLibrariesProcessEvent.on('error', () => {
      console.log('DownloadLibrariesProcessEvent error');
    });


    return;
  };
}])

;
