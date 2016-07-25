const fs = require('fs');
const constants = require('./constants');
const io = require('./io');
const configPath = constants.CONFIG;

const defaultConfig = {
    PlayerName: 'Unknow',
    JVMMemory: 1024,
    MinecraftVersion: '0.0.0',
    Area: {
      width: 854,
      height: 480
    },
		JreVersion: '1.7',
		JreHome: ''
}

var config = {};
if(fs.existsSync(configPath)){
  var res = io.readFileSync(configPath);
  config = JSON.parse(res);
}else{
  config = defaultConfig;
  io.writeFileSync(configPath, JSON.stringify(config));
}

exports.set = function (key, value){
  console.log(`set config [${key}] : [${value}]`);
  if (value===undefined){
    config = key;
  }else{
    config[key] = value;
  }
  io.writeFileSync(configPath, JSON.stringify(config));
}

exports.get = function (key){
  return key===undefined ? config : config[key];
}
