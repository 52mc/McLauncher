var electron = require('electron');  // 控制应用生命周期的模块。
var app = electron.app;
var BrowserWindow = electron.BrowserWindow;  // 创建原生浏览器窗口的模块
// var Tray = electron.Tray; // 托盘图标
// var Menu = electron.Menu; // 菜单
var ipcMain = electron.ipcMain; // IPC通信

var dialog = electron.dialog; // dialog

var fetch = require('node-fetch');

// 在线，离线检测
require('./lib/online');

const core = require('./js/lib/core');
core.jre.localJreVersion()
  .then((version) => {
    console.log(`Java版本为${version}`);
  }).catch((err) => {
    console.log('获取Java版本信息失败', err);
  });

const Config = require('./js/config');

// 保持一个对于 window 对象的全局引用，不然，当 JavaScript 被 GC，
// window 会被自动地关闭
var mainWindow = null;

// 当所有窗口被关闭了，退出。
app.on('window-all-closed', function() {
  // 在 OS X 上，通常用户在明确地按下 Cmd + Q 之前
  // 应用会保持活动状态
  if (process.platform != 'darwin') {
    app.quit();
  }
});

var createWindow = function () {
  // 创建浏览器窗口。
  mainWindow = new BrowserWindow({
    width: 800,
    height: 520,
    resizable: false,
    // frame: false,
    titleBarStyle: 'hidden'
  });

  // 加载应用的 index.html
  mainWindow.loadURL('file://' + __dirname + '/index.html');

  // 打开开发工具
  // mainWindow.openDevTools();

  // 当 window 被关闭，这个事件会被发出
  mainWindow.on('closed', function() {
    // 取消引用 window 对象，如果你的应用支持多窗口的话，
    // 通常会把多个 window 对象存放在一个数组里面，
    // 但这次不是。
    mainWindow = null;
  });
};


// 当 Electron 完成了初始化并且准备创建浏览器窗口的时候
// 这个方法就被调用
app.on('ready', function() {
  createWindow();
});

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
});

// 网络状态改变
ipcMain.on('online-status-changed', function(event, status) {
  console.log('网络环境发生变化：', status);
});

ipcMain.on('open-file-dialog', function(event, callback){
  core.helper.openFileDialog('请选择JVM所在路径')
    .then(function(filepath){
      event.sender.send(callback, filepath);
    }).catch(function(e){
      event.sender.send(callback);
    });
});

ipcMain.on('download', function (){
  // const DownloadFileProcessEvent = core.io.downloadFileToDisk('https://launchermeta.mojang.com/mc/game/version_manifest.json', '/Users/Ajian/Desktop/test.json', 10);
  // DownloadFileProcessEvent.on('process', function (p){
  //   console.log('process', p);
  // });
  // DownloadFileProcessEvent.on('done', function (){
  //   console.log('done...');
  // });
  // DownloadFileProcessEvent.on('error', function (e){
  //   console.log('error...', e);
  // });
  // DownloadFileProcessEvent.on('retry', function (count){
  //   console.log('retry...', count);
  // });
});

ipcMain.on('get-config', function(event, callback){
  event.sender.send(callback, Config.get());
});

ipcMain.on('get-version', function(event, callback){
  event.sender.send(callback, Config.get('MinecraftVersion'));
});

ipcMain.on('get-version-list', function(event, callback){
  core.io.readFile('/Users/Ajian/Desktop/test.json')
  .then((file) => {
    event.sender.send(callback, JSON.parse(file));
  }).catch((e) => {
    console.log('error:',e);
  });
});

ipcMain.on('update-version', function(event, version){
  Config.set('MinecraftVersion', version);
});
