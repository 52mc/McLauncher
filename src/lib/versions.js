const fs = require('fs');
const constants = require('./constants');
const io = require('./io');
const versionPath = constants.VERSIONS;
const versionDownloadUrl = 'https://launchermeta.mojang.com/mc/game/version_manifest.json';

function readVersionFile(path){
	var res = io.readFileSync(path);
  return JSON.parse(res);
}

var version = {};
if(fs.existsSync(versionPath)){
	version = readVersionFile(versionPath);
} else {
	const DownEvent = io.downloadFileToDisk(versionDownloadUrl, versionPath, 10);
  DownEvent.on('done', function (){
		version = readVersionFile(versionPath);
  });
  DownEvent.on('error', function (e){
    console.log('版本文件读取失败...', e);
  });
}

/**
 *  格式化版本信息
 * @return {object} 格式化后的版本列表信息
 */
exports.getFormatVersions = function () {
	var versionsList = {};
	this.getVersions().map(item => {
		versionsList[item.id] = {
			type: item.type,
			json: item.url
		};
	});
	return versionsList;
}

exports.getVersions = function (){
	return version.versions;
}

exports.get = function (key){
  return key===undefined ? version : version[key];
}
