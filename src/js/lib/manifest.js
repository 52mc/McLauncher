const fs = require('fs');
const io = require('./io');
const url = require('./url');

module.exports = class Manifest {
	/**
	 * 构造一个Manifest对象
	 * @param  {string} url   mojang服务器获取manifest文件URL
	 * @param  {string} local 本地缓存路径
	 * @return {object}       一个Manifest对象
	 */
	constructor(url, local) {
		this.url = url;
		this.local = local;
		this.content = null;
		this._fetch();
	}

	/**
	 * 从硬盘读取JSON配置文件并转换为javascript对象返回
	 * @param {string} 配置文件硬盘所在路径
	 * @return {object} 配置javascript对象，如果没有，或者读取失败，则返回 null
	 */
	_readCache(path) {
		try{
			return JSON.parse(io.readFileSync(path));
		} catch(err) {
			console.log(`文件读取或解析失败...${path},${err}`);
			return null;
		}
	}

	/**
	 * 从本地读取，或者从mojang服务器获取最新的manifest文件
	 * @param {boolean} 是否忽略本地配置，从mojang服务器获取最新的manifest文件，默认为否
	 */
	_fetch(ignoreLocal) {
		if(fs.existsSync(this.local)){
			this.content = this._readCache(this.local);
			this._transfer();
		} else {
			const DownEvent = io.downloadFileToDisk(this.url, this.local, 5);
			DownEvent.on('done', () => {
				setTimeout(() => {
					this.content = this._readCache(this.local);
					this._transfer();
				});
			});
			DownEvent.on('error', (err) => {
				console.log(`manifest文件拉取失败...${err}`);
			});
		}
	}

	_transferType(type) {
		switch (type){
		  case 'release'  : return '正式版';
		  case 'snapshot' : return '快照版';
		  case 'old_beta' : return '初期内测版';
		  case 'old_alpha': return '初期开发版';
		  default         : return type;
		}
	}

	_transfer() {
		var versions = this.content.versions;
		for (var i = 0; i < versions.length; i++) {
			var version = versions[i];
			version.typeName = this._transferType(version.type);
		}
	}

	/**
	 * 获取所有可用版本
	 * @return {array} 所有可用版本集合
	 */
	getAllVersions() {
		if(this.content === null){
			return [];
		}
		return this.content.versions;
	}

	/**
	 * 获取一个格式化后的所有可用版本对象
	 * @return {object} 格式化后的所有可用版本对象
	 * @example
	 *  => "v0.0.1":{
	 * 		type:'beta',
	 *   	json:'https://xxx.json'
	 * }
	 */
	getFormatVersions() {
		var list = {};
		this.getAllVersions().map(item => {
			list[item.id] = {
				type: item.type,
				json: url.getVersionJsonForChinaUser(item.url)
			};
		});
		return list;
	}

	/**
	 * 获取最新版本
	 * @return {object} 包含snapshot和release的对象
	 */
	getLatest() {
		if(this.content === null){
			return {};
		}
		return this.content.latest;
	}

}
