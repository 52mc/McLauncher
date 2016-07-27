module.exports = 'home';
require('../../../node_modules/spinkit/css/spinners/7-three-bounce.css');

angular.module('home', [
  require('./factory'),
  require('./download')
])
  .controller('HomeCtrl', [
    '$scope', 'McConfig', 'Notice', 'MinecraftCore', 'MinecraftLibraries', 'MinecraftAssets', 'LaunchMinecraft',
    function ($scope, McConfig, Notice, MinecraftCore, MinecraftLibraries, MinecraftAssets, LaunchMinecraft){
    $scope.menus = [ { icon: 'icon-settings', title: 'settings', url: '#/settings' } ];
    $scope.lock = false; //锁定界面
    $scope.launchText = 'Launch Minecraft';
    $scope.message = '';
    const version = $scope.version = McConfig.get('version');
    console.log(version);

    function showMessage(message, exit){
      $scope.message = `${message}`;
      exit && $scope.$apply();
    }

    // 重置状态
    function initState(error, exit){
      console.log('reset state message:', error);
      $scope.lock = false;
      showMessage(error, exit);
    }

    $scope.launch = function () {
      $scope.lock = true;
      showMessage(`Loading...`);

      const conf = McConfig.get();
      var args = {
        player: conf.player,
        width: conf.area.width,
        height: conf.area.height,
        xmx: 512,
        xms: conf.memory
      };
      if(version === '0.0.0'){
        return initState('请选择Minecraft版本');
      }
      console.log('launching Minecraft, version: %s, args: %o.', version, args);

      // ========== Core ==========
      const DownloadMinecraftProcess = MinecraftCore(version);
      const DownloadMinecraftProcessEvent = DownloadMinecraftProcess.event;
      // ========== Lib ==========
      const DownloadLibrariesProcess = MinecraftLibraries(version);
      const DownloadLibrariesProcessEvent = DownloadLibrariesProcess.event;
      // ========== Assets ==========
      const DownloadAssetsProcess = MinecraftAssets(version);
      const DownloadAssetsProcessEvent = DownloadAssetsProcess.event;
      //
      const LaunchMinecraftProcess = LaunchMinecraft(version, args);
      const LaunchMinecraftProcessEvent = LaunchMinecraftProcess.event;

      // launch event
      LaunchMinecraftProcessEvent.on('error', (err) => {
        initState(`${err}`);
      });
      LaunchMinecraftProcessEvent.on('message', (msg) => {
        console.info(msg);
      });
      LaunchMinecraftProcessEvent.on('exit', (code) => {
        initState('', true);
        if(code == 0) {
          if(conf.downloaded.indexOf(version) == -1){
            conf.downloaded.push(version);
            McConfig.set('downloaded', conf.downloaded);
          }
          return console.log('正常退出');
        }
        Notice.send(`Minecraft异常退出！${code}`);
      });
      LaunchMinecraftProcessEvent.on('done', () => {
        showMessage('', true);
      });

      // assets event
      DownloadAssetsProcessEvent.on('process', (process) => {
        showMessage(`Downloading game assets ${process.count}/${process.total}`, true);
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
        showMessage(`Downloading game libraries ${process.count}/${process.total}`, true);
        console.log('libraries count:%d / total:%d', process.count, process.total);
      });
      DownloadLibrariesProcessEvent.on('natives_process', (process) => {
        showMessage(`Downloading game natives ${process.count}/${process.total}`, true);
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
        showMessage(`Downloading game core ${process.Process}%`, true);
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
