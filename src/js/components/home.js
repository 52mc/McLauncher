module.exports = 'home';
require('../../../node_modules/spinkit/css/spinners/7-three-bounce.css');

angular.module('home', [require('./factory')])
  .controller('HomeCtrl', ['$scope', 'McConfig', 'IPC', 'Core', 'Notice', function ($scope, McConfig, IPC, Core, Notice){
    $scope.menus = [ { icon: 'icon-settings', title: 'settings', url: '#/settings' } ];
    $scope.lock = false; //锁定界面
    $scope.launchText = 'Launch Minecraft';
    // $scope.launched = false;
    $scope.message = '';
    $scope.version = McConfig.get('MinecraftVersion');

    function showMessage(message){
      $scope.message = `${message}`;
      $scope.$apply();
    }

    // 重置状态
    function initState(error){
      console.log('reset state message:', error);
      // $scope.launched = false;
      $scope.lock = false;
      $scope.launchText = 'Launch Minecraft';
      $scope.$apply();
      $scope.message = error;
    }

    $scope.launch = function () {
      // $scope.launched = true;
      $scope.lock = true;
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
        return initState('请选择Minecraft版本');
      }
      console.log('launching Minecraft, version: %s, args: %o.', MinecraftVersion, args);

      const version = McConfig.get('MinecraftVersion');

      var conf = McConfig.get();
      var args = {
        player: conf.PlayerName,
        width: conf.Area.width,
        height: conf.Area.height,

        xmx: 512,
        xms: conf.JVMMemory,
      };

      // ========== Core ==========
      const DownloadMinecraftProcess = Core.process.DownloadMinecraft(version);
      const DownloadMinecraftProcessEvent = DownloadMinecraftProcess.event;
      // ========== Lib ==========
      const DownloadLibrariesProcess = Core.process.DownloadLibraries(version);
      const DownloadLibrariesProcessEvent = DownloadLibrariesProcess.event;
      // ========== Assets ==========
      const DownloadAssetsProcess = Core.process.DownloadAssets(version);
      const DownloadAssetsProcessEvent = DownloadAssetsProcess.event;
      //
      const LaunchMinecraftProcess = Core.process.LaunchMinecraft(version, args);
      const LaunchMinecraftProcessEvent = LaunchMinecraftProcess.event;

      // launch event
      LaunchMinecraftProcessEvent.on('error', (err) => {
        initState(`${err}`);
      });
      LaunchMinecraftProcessEvent.on('message', (msg) => {
        console.info(msg);
      });
      LaunchMinecraftProcessEvent.on('exit', (code) => {
        initState();
        if(code == 0) {
          conf.Downloaded.push(version);
          McConfig.set('Downloaded', conf.Downloaded);
          return console.log('正常退出');
        }
        Notice.send(`Minecraft异常退出！${code}`);
      });
      LaunchMinecraftProcessEvent.on('done', () => {
        showMessage('');
      });

      // assets event
      DownloadAssetsProcessEvent.on('process', (process) => {
        showMessage(`Downloading game assets ${process.count}/${process.total}`);
      });
      DownloadAssetsProcessEvent.on('error', (err) => {
        initState(`assets error ${err}`);
      });
      DownloadAssetsProcessEvent.on('done', () => {
        LaunchMinecraftProcess.start();
        console.log('assets done');
      });

      // libraries event
      DownloadLibrariesProcessEvent.on('libraries', () => {
        console.log('开始下载libraries');
      });
      DownloadLibrariesProcessEvent.on('libraries_process', (process) => {
        showMessage(`Downloading game libraries ${process.count}/${process.total}`);
        console.log('libraries count:%d / total:%d', process.count, process.total);
      });
      DownloadLibrariesProcessEvent.on('natives_process', (process) => {
        showMessage(`Downloading game natives ${process.count}/${process.total}`);
        console.log('natives count:%d / total:%d', process.count, process.total);
      });
      DownloadLibrariesProcessEvent.on('error', (err) => {
        initState(`libraries error ${err}`);
      });
      DownloadLibrariesProcessEvent.on('done', () => {
        console.log('libraries done');
        DownloadAssetsProcess.start();
      });

      // core event
      DownloadMinecraftProcessEvent.on('process', (process) => {
        console.log('event process %d%%, %o', process.Process, process);
        showMessage(`Downloading game core ${process.Process}%`);
      });
      DownloadMinecraftProcessEvent.on('done', () => {
        console.log('core done');
        DownloadLibrariesProcess.start();
      });
      DownloadMinecraftProcessEvent.on('error', (err) => {
        initState(`event error ${err}`);
      });
      DownloadMinecraftProcessEvent.on('json', () => {
        console.log('event json');
      });

      // 切记一定先绑定事件，再start
      DownloadMinecraftProcess.start();
      return;
    };
  }])

;
