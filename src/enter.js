// 使用内置模块时禁用旧样式
process.env.ELECTRON_HIDE_INTERNAL_MODULES = 'true'

const {app, BrowserWindow, ipcMain, dialog, Menu, Tray, shell} = require('electron');  // 控制应用生命周期的模块。

// 保持一个对于 window 对象的全局引用，不然，当 JavaScript 被 GC，
// window 会被自动地关闭
var mainWindow = null;
var appIcon = null;

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
    width: 500,
    height: 300,
    resizable: false,
    frame: false,
    titleBarStyle: 'hidden',
    skipTaskbar: true
  });

  // 启用开发工具。
  // mainWindow.webContents.openDevTools();

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
  appIcon = new Tray(__dirname+'/assets/tray.png');
  var contextMenu = Menu.buildFromTemplate([
    { label: '关于', type: 'normal', click: function() {
      shell.openExternal('https://github.com/52mc/McLauncher');
    } },
    { label: '报告BUG', type: 'normal', click: function() {
      shell.openExternal('https://github.com/52mc/McLauncher/issues');
    } },
    { label: '退出Mc启动器', type: 'normal', role: 'close' }
  ]);
  appIcon.setToolTip('This is my application.');
  appIcon.setContextMenu(contextMenu);
  createWindow();
});

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
});

const helper = require('./helper');

ipcMain.on('open-file-dialog', function(event, callback){
  helper.openFileDialog('请选择JVM所在路径')
    .then(function(filepath){
      event.sender.send(callback, filepath);
    }).catch(function(e){
      event.sender.send(callback);
    });
});

ipcMain.on('show-folder', function(event, fullPath){
  helper.showFolder(fullPath);
});
