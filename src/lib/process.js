const Promise = require('bluebird');
const fs = require('fs');
const electron = require('electron');
const dialog = electron.dialog;
const EventEmitter = require('events').EventEmitter;
const FDS = require('./constants').FDS;
const io = require('./io');
const url = require('./url');
const Versions = require('./versions');
const fd_root = `${FDS.root}`;
const fd_version = `${FDS.version}`;
const fd_lib = `${FDS.lib}`;
const fd_native = `${FDS.native}`;

if(!fs.existsSync(fd_root)){
  io.createFolderSync(fd_root);
	console.info(`created ${fd_root} folder.`);
	io.createFolderSync(fd_lib);
	console.info(`created ${fd_lib} folder.`);
	io.createFolderSync(fd_native);
	console.info(`created ${fd_native} folder.`);
}

exports.DownloadMinecraft = function (version) {
	const TaskEvent = new EventEmitter();
	return {
		event: TaskEvent,
		start: () => {
			if(!fs.existsSync(fd_version)){
        io.createFolderSync(fd_version);
				console.info(`created ${fd_version} folder.`);
			}
			const lockPath= `${fd_version}${version}/${version}.lock`;
			const jsonPath = `${fd_version}${version}/${version}.json`;
			const jarPath = `${fd_version}${version}/${version}.jar`;
			const jsonExists = fs.existsSync(jsonPath);
			const jarExists = fs.existsSync(jarPath);
			if(jsonExists && jarExists){
				if(fs.existsSync(`${fd_version}/${version}/${version}.lock`)){
					console.info(`Minecraft [${version}] version exist.`);
          return TaskEvent.emit('done');
				}
				if(jsonExists){
					fs.unlinkSync(jsonPath);
				}
				if(jarExists){
					fs.unlinkSync(jarPath);
				}
			}
			//
			var start = Promise.coroutine(function *(){
				try{
					const versions = Versions.getFormatVersions();
					if(versions[version] == undefined){
						return TaskEvent.emit('error', `Can not find [${version}] from mojang server.`);
					}
					if(!fs.existsSync(`${fd_version}${version}`)){
						io.createFolderSync(`${fd_version}${version}`);
						console.info(`created ${fd_version}${version} folder.`);
					}

					console.info(`downloading Minecraft [${version}] version json file.`)
					TaskEvent.emit('json');

					console.log('json file: %s', versions[version].json);

					var versionContent = yield io.request(versions[version].json);
					yield io.writeFile(jsonPath, versionContent);
					const clientUrl = url.getClientUrl(version);
					const DownloadProcess = io.downloadFileToDisk(clientUrl, jarPath, 10);
					DownloadProcess.on('process', (process) => TaskEvent.emit('process', process));
					DownloadProcess.on('done', () => {
						fs.writeFileSync(lockPath, '');
						TaskEvent.emit('done');
					});
					DownloadProcess.on('error', (err) => TaskEvent.emit('error', err));
				} catch(e){
					console.log(111,e);
					TaskEvent.emit('error', e);
				}
			});
			start();
		}
	}
}


exports.DownloadLibraries = function (version){
	const TaskEvent = new EventEmitter();
	return {
		event: TaskEvent,
		start: () => {
			const jsonPath = `${fd_version}${version}/${version}.json`;
			const lockPath = `${fd_version}${version}/${version}.lib.lock`;

			if(!fs.existsSync(jsonPath)){
				return TaskEvent.emit('error', `can not find ${version} from ${fd_version}`);
			}

			const versionLibPath = `${fd_lib}${version}`;
			if(!fs.existsSync(versionLibPath)){
				io.createFolderSync(versionLibPath);
				console.info(`created ${versionLibPath} folder.`);
			}

			const versionNativePath = `${fd_native}${version}`;
			if(!fs.existsSync(versionNativePath)){
				io.createFolderSync(versionNativePath);
				console.info(`created ${versionNativePath} folder.`);
			}

			if(fs.existsSync(lockPath)){
				return TaskEvent.emit('done');
			}

			var natives = [];
			var libraries = [];
			var start = Promise.coroutine(function *(){
				try {
					const indexFile = JSON.parse(yield io.readFile(jsonPath)); //索引文件
					indexFile.libraries.map(lib => {
						if (lib.name.split(':').length != 3) return;
						//  静态类库
						if (lib.natives !== undefined && lib.natives['osx'] != null) {
							if (lib.rules == null) {
								return natives.push(lib);
							}
							var isAllow = false;
							lib.rules.map(rule => {
								if (rule.os !== undefined && rule.os['name'] === 'osx') {
									isAllow = rule.action === 'allow';
								} else {
									if (Object.keys(rule).length === 1 && rule.action != undefined) {
										isAllow = rule.action == 'allow';
									}
								}
							});
							if (isAllow){
								return natives.push(lib);
							}
						}

						if(lib.rules !== undefined && lib.natives !== undefined && lib.rules.length == 1){
							var rule = lib.rules[0];
							if(rule.os !== undefined){
								if(rule.action == 'allow' && rule.os.name === 'osx'){
									return natives.push(lib);
								}
							}
						}
						if(lib.natives === undefined){
							libraries.push(lib);
						}
					});
				} catch (e) {
					TaskEvent.emit('error', e);
				}

				console.log('natives', natives);
	      console.log('libraries', libraries);

				try{
					TaskEvent.emit('libraries');
					for (var i = 0; i < libraries.length; i++) {
						var lib = libraries[i];
						const path = lib.downloads.artifact.path;
						const libUrl = lib.downloads.artifact.url;
						const fullPath = `${fd_lib}${version}/${path}`;
						const fileName = path.substring(path.lastIndexOf('/') + 1);
						console.log(path,fileName,fullPath);
						// 跳过已经下载的lib
						if(fs.existsSync(fullPath)){
							console.info(`lib exists [${fileName}] [${i + 1}/${libraries.length}] skip.`);
							TaskEvent.emit('libraries_process', {
								count: i + 1,
								total: libraries.length
							});
							continue;
						}
						yield io.createFolders(fullPath.substring(0,fullPath.lastIndexOf('/'))); //需要将文件名截取掉，只建立文件夹 /path/to/file.jar --> /path/to
						yield io.downloadFileToDiskPromise(libUrl, fullPath, 5);
						TaskEvent.emit('libraries_process', {
							count: i + 1,
							total: libraries.length
						});
						console.info(`downloaded [${fileName}] [${i + 1}/${libraries.length}]`);
					}
				} catch (e) {
					TaskEvent.emit('error', e);
				}

			});
			start();






		}
	}
}
