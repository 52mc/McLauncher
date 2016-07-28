const Promise = require('bluebird');
const {dialog, shell} = require('electron');

exports.openFileDialog = function (title) {
  return new Promise(function (resolve, reject){
    dialog.showOpenDialog({
      title: title || '请选择',
      properties: [ 'openDirectory' ]
    }, function (filepaths){
      if ( filepaths === undefined ||  !(filepaths instanceof Array) || typeof filepaths.length <= 0 ){
        return reject('用户未选择');
      }
      resolve(filepaths[0]);
    });
  });
}

exports.showFolder = function (fullPath) {
  shell.showItemInFolder(fullPath);
}
