const Promise = require('bluebird');
const electron = require('electron');
const dialog = electron.dialog;

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
