var electron = require('electron');  // 控制应用生命周期的模块。
var app = electron.app;
var BrowserWindow = electron.BrowserWindow;  // 创建原生浏览器窗口的模块

var onlineStatusWindow;

app.on('ready', function() {
  onlineStatusWindow = new BrowserWindow({ width: 0, height: 0, show: false });
  onlineStatusWindow.loadURL('file://' + __dirname + '/online-status.html');
});
