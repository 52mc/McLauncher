const Promise = require('bluebird');
const fs = require('fs');
const mkdirp  = require('mkdirp');
const EventEmitter = require('events').EventEmitter;
const fetch = require('node-fetch');

exports.request = function (url, timeout){
  return fetch(url, { timeout: timeout }).then((res) => {
    return Promise.resolve(res.text());
  });
}

exports.createFolders = function (path) {
  return new Promise((resolve, reject) => {
    mkdirp(path, (err) => {
      err ? reject(err) : resolve();
    });
  });
}

exports.createFolderSync = function (path){
  return new Promise((resolve, reject) => {
    fs.exists(path, (exists) => {
      if(exists) resolve();
      fs.mkdir(path, '0755', (err) =>  {
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

exports.readFile = function (fileName) {
  return new Promise((resolve, reject) => {
    fs.readFile(fileName, 'utf8', (err, data) => {
      err ? reject(err) : resolve(data);
    });
  });
}

exports.readFileSync = function (fileName) {
  return fs.readFileSync(fileName, 'utf8');
}

exports.writeFile = function (fileName, content) {
  return new Promise((resolve, reject) => {
    fs.writeFile(fileName, content, 'utf8', (err, data) => {
      err ? reject(err) : resolve(data);
    });
  });
}

exports.writeFileSync = function (fileName, content) {
  fs.writeFileSync(fileName, content, 'utf8');
}

exports.writeBufferToFile = function (fileName, data) {
  return new Promise((resolve, reject) => {
    console.log(111,fileName);
    fs.writeFile(fileName, data , err => {
      err ? reject(err) : resolve();
    });
  });
}

exports.getDownloadBuffer = function (url) {
  const DownloadProcessEvent = new EventEmitter();
  let FileSize = 0;
  let DownloadSize = 0;
  fetch(url).then((res) => {
    if(res.status !== 200){
      return;
    }
    FileSize = parseInt(res.headers.get('content-length') || 0);
    const buffers = [];
    const stream = res.body;
    let ReportProcess = true;
    stream.on('data', (buff) => {
      DownloadSize += buff.length;
      if(ReportProcess) {
        ReportProcess = false;
        DownloadProcessEvent.emit('process', {
          FileSize: FileSize,
          DownloadedSize: DownloadSize,
          Process: parseInt((DownloadSize / FileSize) * 100)
        });
        ReportProcess = true;
      }
      buffers.push(buff);
    });

    stream.on('end', () => {
      DownloadProcessEvent.emit('done', Buffer.concat(buffers));
    });

    stream.on('error', (e) => {
      DownloadProcessEvent.emit('error', e);
    });

  }).catch((err) => {
    DownloadProcessEvent.removeAllListeners('process');
    DownloadProcessEvent.removeAllListeners('done');
    return DownloadProcessEvent.emit('error','download file process error:' + err);
  });
  return DownloadProcessEvent;
}

exports.downloadFileToDisk = function (url, path, retryCount) {
  if (retryCount === undefined) retryCount = 0;
  const DownloadProcessEvent = this.getDownloadBuffer(url);
  var DownloadFileProcessEvent = new EventEmitter();
  DownloadProcessEvent.on('process', process => DownloadFileProcessEvent.emit('process', process));
  DownloadProcessEvent.on('done', (buffer) => {
    this.writeBufferToFile(path, buffer)
      .then(DownloadFileProcessEvent.emit('done'))
      .catch((e) => DownloadFileProcessEvent.emit('error', e));
  });
  DownloadProcessEvent.on('error', (e) => {
    if(retryCount === 0){
      DownloadFileProcessEvent.removeAllListeners('process');
      DownloadFileProcessEvent.removeAllListeners('done');
      DownloadFileProcessEvent.emit('error', e);
      return;
    }
    setTimeout(() => {
      DownloadFileProcessEvent.emit('retry', --retryCount);
      const process = DownloadFileProcessEvent.listeners('process');
      const done = DownloadFileProcessEvent.listeners('done');
      const error = DownloadFileProcessEvent.listeners('error');
      const retry = DownloadFileProcessEvent.listeners('retry');
      DownloadFileProcessEvent = this.downloadFileToDisk(url, path, retryCount);
      process.forEach((item) => {
        DownloadFileProcessEvent.addListener('process', item);
      });
      done.forEach((item) => {
        DownloadFileProcessEvent.addListener('done', item);
      });
      error.forEach((item) => {
        DownloadFileProcessEvent.addListener('error', item);
      })
      retry.forEach((item) => {
        DownloadFileProcessEvent.addListener('retry', item);
      });
    }, 500);
  });
  return DownloadFileProcessEvent;
}

exports.downloadFileToDiskPromise = function (){
  return new Promise((resolve, reject) => {
    const DownloadFileProcess = this.downloadFileToDisk.apply(this, arguments);
    DownloadFileProcess.on('done', () => resolve());
    DownloadFileProcess.on('error', err => reject(err));
  });
}
