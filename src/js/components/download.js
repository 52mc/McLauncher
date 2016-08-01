const fs = require('fs');
const EventEmitter = require('events').EventEmitter;
const admZip = require('adm-zip');
const spawn = require('child_process').spawn;
const Promise = require('bluebird');
const assignIn = require('lodash').assignIn;
const uuid = require('node-uuid');
const platform = (function(platform){
	var os;
	switch (platform) {
		case 'win32'	: os = 'windows'; break;
		case 'darwin'	: os = 'osx'; break;
		case 'linux'	:
		case 'freebsd': os = 'linux'; break;
		default				: os = 'windows'; break;
	}
	return os;
})(process.platform);

module.exports = 'download';
angular.module('download', [
		require('./factory')
	])
	.factory('MinecraftCore', ['IO', 'Folder', 'Manifest', 'Url', function(IO, Folder, Manifest, Url) {
		return function(version){
			const fd = Folder.init(version);
			const TaskEvent = new EventEmitter();
			return {
				event: TaskEvent,
				start: () => {
					if (fs.existsSync(fd.jsonFile) && fs.existsSync(fd.jarFile)) {
						if (fs.existsSync(fd.lockFile)) {
							console.info(`Minecraft [${version}] version exist.`);
							return TaskEvent.emit('done');
						}
						fs.unlinkSync(fd.jsonFile);
						fs.unlinkSync(fd.jarFile);
					}

					var start = Promise.coroutine(function*() {
						try {

							//  从manifest中获取version json文件
							const versions = Manifest.formatedVersions();
							const currentversion = versions[version];
							if (currentversion === undefined) {
								return TaskEvent.emit('error', `Can not find [${version}] from mojang server.`);
							}

							// 创建version文件夹
							if (!fs.existsSync(`${fd.version}`)) {
								IO.createFolders(`${fd.version}`);
								console.info(`created ${fd.version} folder.`);
							}

							// 下载并存储 version json
							console.info(`downloading Minecraft [${version}] version json file. ${currentversion.json}`);
							TaskEvent.emit('json');
							var versionContent = yield IO.request(currentversion.json);
							yield IO.writeFile(fd.jsonFile, versionContent);

							// 下载并存储 client jar
							const clientUrl = Url.getClientUrl(version);
							console.info('downloading client jar: %s', clientUrl);
							const DownloadProcess = IO.downloadFileToDisk(clientUrl, fd.jarFile, 10);
							DownloadProcess.on('process', (process) => TaskEvent.emit('process', process));
							DownloadProcess.on('done', () => {
								fs.writeFileSync(fd.lockFile, '');
								TaskEvent.emit('done');
							});
							DownloadProcess.on('error', (err) => TaskEvent.emit('error', err));
						} catch (e) {
							TaskEvent.emit('error', e);
						}
					});
					start();
				}
			}
		}
	}])

	.factory('MinecraftLibraries', ['IO', 'Folder', 'Url', 'StandardLibraries', function(IO, Folder, Url, StandardLibraries) {
		return function(version) {
			const fd = Folder.init(version);
			const TaskEvent = new EventEmitter();
			return {
				event: TaskEvent,
				start: () => {
					// 创建文件夹
					IO.createFolders(fd.libs);
					console.info(`created ${fd.libs} folder.`);
					IO.createFolders(fd.natives);
					console.info(`created ${fd.natives} folder.`);
				  IO.createFolders(fd.temps);
					console.info(`created ${fd.temps} folder.`);

					if (!fs.existsSync(fd.jsonFile)) {
						return TaskEvent.emit('error', `can not find ${version} from ${fd.version}`);
					}

					if (fs.existsSync(fd.libLockFile)) {
						return TaskEvent.emit('done');
					}

					var natives = [];
					var libraries = [];
					var start = Promise.coroutine(function*() {

						const indexFile = JSON.parse(IO.readFileSync(fd.jsonFile)); //索引文件
						const standard = new StandardLibraries(fd.libs, indexFile, platform);
						const dest = standard.getlibsAndNativesFromLibraries();
						natives = dest.natives;
						libraries = dest.libraries;

						console.log('natives', natives);
						console.log('libraries', libraries);

						try {
							TaskEvent.emit('libraries');
							for (var i = 0; i < libraries.length; i++) {
								var lib = libraries[i];
								const liburl = lib.url;
								// /path/to/jar/xxx.jar
								const fullpath = `${fd.libs}${lib.absolute}`;
								// /path/to/jar
								const basename = `${fd.libs}${lib.basename}`;
								// xxx.jar
								const filename = lib.filename;

								// 跳过已经下载的lib
								if (fs.existsSync(fullpath)) {
									var stat = yield IO.stat(fullpath);
									if(stat && stat.size === lib.size){
										console.info(`lib exists [${filename}] [${i + 1}/${libraries.length}] skip.`);
										TaskEvent.emit('libraries_process', {
											count: i + 1,
											total: libraries.length
										});
										continue;
									}else{
										console.log('lib文件已经存在，但是size不一致');
									}
								}

								yield IO.createFolders(basename); //需要将文件名截取掉，只建立文件夹 /path/to/file.jar --> /path/to
								yield IO.downloadFileToDiskPromise(Url.getLibrariesForChinaUser(liburl), fullpath, 10);
								TaskEvent.emit('libraries_process', {
									count: i + 1,
									total: libraries.length
								});
								console.info(`downloaded [${filename}] [${i + 1}/${libraries.length}]`);
							}
						} catch (e) {
							TaskEvent.emit('error', e);
						}

						try {
							TaskEvent.emit('natives');
							for (var i = 0; i < natives.length; i++) {
								const lib = natives[i];
								const url = lib.url;
								const filename = lib.filename;
								const tempfile = `${fd.temps}${filename}`;
								if (fs.existsSync(tempfile)) {
									var stat = yield IO.stat(tempfile);
									if(stat && stat.size === lib.size){
										console.info(`natives lib [${filename}] [${i + 1}/${natives.length}] skip.`);
										continue;
									}else{
										console.log('natives lib 已经存在，但size不一致')
									}
								}
								yield IO.downloadFileToDiskPromise(Url.getLibrariesForChinaUser(url), tempfile, 10);
								console.info(`natives lib [${filename}] [${i + 1}/${natives.length}] download.`);
								yield IO.wait(200);
								try {
									var zip = new admZip(tempfile);
									zip.extractAllTo(fd.natives, true);
									TaskEvent.emit('natives_process', {
										count: i + 1,
										total: natives.length
									});
								} catch (e) {
									console.error(e);
									return TaskEvent.emit('error', `extract file: ${tempfile} to native folder error`);
								}
							};
							IO.writeFileSync(fd.libLockFile, '');
							TaskEvent.emit('done');
						} catch (e) {
							TaskEvent.emit('error', e);
						}
					});
					start();
				}
			}
		}
	}])

	.factory('MinecraftAssets', ['IO', 'Folder', 'Url', function(IO, Folder, Url){
		return function(version) {
			const fd = Folder.init(version);
			const TaskEvent = new EventEmitter();
			return {
				event: TaskEvent,
				start: () => {
					if (!fs.existsSync(fd.jsonFile)){
						return TaskEvent.emit('error', `can not find ${version} from ${fd.version}`);
					}
					var start = Promise.coroutine(function *(){
						const indexFile = JSON.parse(yield IO.readFile(fd.jsonFile)); //索引文件
						const assetsid = indexFile.assets;
						console.info(`资源Id：${assetsid}`);
						if (fs.existsSync(fd.assetsLockFile)) {
							console.log(`Assets ${assetsid} lock file exists.`);
							TaskEvent.emit('done');
							return;
						}

						const fd_assets_indexes = `${fd.assets}${assetsid}/indexes/`;
						const fd_assets_objects = `${fd.assets}${assetsid}/objects/`;
						const assetsIndex = `${fd_assets_indexes}${assetsid}.json`;

						yield IO.createFolders(fd_assets_indexes);
						yield IO.createFolders(fd_assets_objects);

						var assetsList = yield IO.request(Url.getAssetJsonForChinaUser(assetsid));
						IO.writeFileSync(assetsIndex, assetsList);
						assetsList = JSON.parse(assetsList);

						var taskCount = Object.keys(assetsList.objects).length;
						var taskDone = 0;
						var taskError = 0;

						console.log('taskCount:',taskCount);
						for (var obj in assetsList.objects) {
							obj = assetsList.objects[obj];
							var hash = obj.hash;
							var index = hash.substring(0, 2);

							var folder = fd_assets_objects + index;
							var fullPath = fd_assets_objects + index + '/' + hash;

							/* 通知Assets下载进度方法 */
							function updateAssetsProcess() {
								TaskEvent.emit('process', {
									count: ++taskDone,
									total: taskCount
								});

								if (taskDone == taskCount) {
									if (taskError == 0) IO.writeFileSync(fd.assetsLockFile, '');
									TaskEvent.emit('done');
								}
							}

							IO.createFolderSync(folder);

							/* 判断是否已经下载过 */
							if (fs.existsSync(fullPath)) {
								var stat = yield IO.stat(fullPath);
								if(stat && stat.size === obj.size){
										updateAssetsProcess();
										continue;
								}else{
									console.log('assets文件已经存在，但是size不一致');
								}
							}

							try {
								yield IO.downloadFileToDiskPromise(Url.getAssetsForChinaUser(index,hash), fullPath, 10);
							} catch (ex) {
								console.log(ex);
								taskError++;
							}
							updateAssetsProcess();
						}

					});
					start();
				}
			}
		}
	}])

	.factory('LaunchMinecraft', ['IO', 'Folder', 'Jre', 'StandardLibraries', function(IO, Folder, Jre, StandardLibraries){
		return function(version, _args) {
			const fd = Folder.init(version);
			const TaskEvent = new EventEmitter();
			return {
				event: TaskEvent,
				start: () => {

		      var args = assignIn({
						player: 'unknow',
		        xmx: 256,
		        xms: 1024,
						area: {
							width: 854,
			        height: 480,
						},
						jre: {
							home: ''
						}
		      }, _args);
		      var JVMArgs = [];
		      if(!fs.existsSync(fd.jsonFile)){
		        return TaskEvent.emit('error', `can not find ${version} from ${fd.version}`);
		      }
		      JVMArgs.push('-XX:+UseG1GC');
		      JVMArgs.push('-XX:-UseAdaptiveSizePolicy');
		      JVMArgs.push('-XX:-OmitStackTraceInFastThrow');
		      JVMArgs.push(`-Xmn${args.xmx}m`);
		      JVMArgs.push(`-Xmx${args.xms}m`);
		      JVMArgs.push(`-Djava.library.path=${fd.natives}`);
		      JVMArgs.push('-Dfml.ignoreInvalidMinecraftCertificates=true');
		      JVMArgs.push('-Dfml.ignorePatchDiscrepancies=true');
		      JVMArgs.push(`-Duser.home=${fd.version}`);
		      JVMArgs.push(`-cp`);

		      const indexFile = JSON.parse(IO.readFileSync(fd.jsonFile)); //索引文件
					const standard = new StandardLibraries(fd.libs, indexFile, platform);
					const LoadLibrariesString = standard.buildArgs();
		      JVMArgs.push(`${LoadLibrariesString}${fd.jarFile}`);
		      JVMArgs.push(indexFile.mainClass);

		      var ClientUUID = uuid.v4().replace(/-/g, '');
		      indexFile.minecraftArguments.split(' ').map(item => {
		        switch (item) {
		          case '${auth_player_name}':
		            item = args.player;
		            break;
		          case '${version_name}':
		            item = '"+1s"';
		            break;
		          case '${game_directory}':
		            item = `${fd.game}`;
		            break;
		          case '${assets_root}':
		            item = `${fd.assets}${indexFile.assets}`;
		            break;
		          case '${assets_index_name}':
		            item = indexFile.assets;
		            break;
		          case '${auth_uuid}':
		          case '${auth_access_token}':
		            item = ClientUUID;
		          break;
		          case '${user_properties}':
		            item = '{}';
		            break;
		          case '${user_type}':
		            item = 'Legacy';
		            break;
							case '${version_type}':
								item = '';
								break;
		          //1.5.2
		          case  '${game_assets}':
		            item = `${fd.assets}`;
		            break;
		        }
		        JVMArgs.push(item);
		      });

		      JVMArgs.push('--height');
		      JVMArgs.push(args.area.height);
		      JVMArgs.push('--width');
		      JVMArgs.push(args.area.width);
					// 记录最后一次的启动命令
					IO.writeFileSync(fd.lastLaunchArgsFile, `${args.jre.home} ${JVMArgs.join(' ')}`);
					IO.createFolderSync(fd.game);
					const child = spawn(args.jre.home, JVMArgs, { cwd: fd.game });
					child.on('error', (err) =>  TaskEvent.emit('error', err));
					child.stdout.on('data', (data) => TaskEvent.emit('message', data));
					child.stderr.on('data', (data) => TaskEvent.emit('message', data));
					child.on('exit', (code) => TaskEvent.emit('exit', code));
					child.stdout.setEncoding('utf8');
					TaskEvent.emit('done');

		    }
		  }
		}
	}])
;
