var path = require('path');
var _ = require('lodash');

//本地/开发环境配置
var local = {
	"env": "local"
};

var config = {
	"env": "production",
	"debug": false
};

console.info('ENV:', process.env.NODE_ENV);

if (process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'development') {
	// 开发模式
	config.debug = true;
	//使用local.js中的配置覆盖config.js中的配置
	config = _.assignIn(config, local);
}

module.exports = config;
