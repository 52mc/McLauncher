const fs = require('fs');
const EventEmitter = require('events').EventEmitter;
const admZip = require('adm-zip');
const spawn = require('child_process').spawn;
const Promise = require('bluebird');
const assignIn = require('lodash').assignIn;
const uuid = require('node-uuid');

module.exports = 'download';
angular.module('download', [
		require('./factory')
	])
	.factory('MinecraftCore', ['IO', 'Constants', 'Manifest', 'Url', function(IO, Constants, Manifest, Url) {
		return function(version){
			//  versions文件夹
			const fd_versions = Constants.FDS.versions;
			// 当前版本文件夹
			const fd_version = `${fd_versions}${version}/`;

			const TaskEvent = new EventEmitter();
			return {
				event: TaskEvent,
				start: () => {
					// 创建game root文件夹
					const fd_root = Constants.FDS.root;
					IO.createFolderSync(fd_root);
					console.info(`created ${fd_root} folder.`);
					// 创建versions文件夹
					if (!fs.existsSync(fd_versions)) {
						IO.createFolderSync(fd_versions);
						console.info(`created ${fd_versions} folder.`);
					}

					const lockPath = `${fd_version}${version}.lock`;
					const jsonPath = `${fd_version}${version}.json`;
					const jarPath = `${fd_version}${version}.jar`;

					const jsonExists = fs.existsSync(jsonPath);
					const jarExists = fs.existsSync(jarPath);
					if (jsonExists && jarExists) {
						if (fs.existsSync(lockPath)) {
							console.info(`Minecraft [${version}] version exist.`);
							return TaskEvent.emit('done');
						}
						if (jsonExists) {
							fs.unlinkSync(jsonPath);
						}
						if (jarExists) {
							fs.unlinkSync(jarPath);
						}
					}
					//
					var start = Promise.coroutine(function*() {
						try {
							const versions = Manifest.formatedVersions();
							if (versions[version] === undefined) {
								return TaskEvent.emit('error', `Can not find [${version}] from mojang server.`);
							}
							if (!fs.existsSync(`${fd_version}`)) {
								IO.createFolderSync(`${fd_version}`);
								console.info(`created ${fd_version} folder.`);
							}

							console.info(`downloading Minecraft [${version}] version json file.`)
							TaskEvent.emit('json');

							console.log('json file: %s', versions[version].json);

							var versionContent = yield IO.request(versions[version].json);
							yield IO.writeFile(jsonPath, versionContent);
							const clientUrl = Url.getClientUrl(version);
							const DownloadProcess = IO.downloadFileToDisk(clientUrl, jarPath, 10);
							DownloadProcess.on('process', (process) => TaskEvent.emit('process', process));
							DownloadProcess.on('done', () => {
								fs.writeFileSync(lockPath, '');
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

	.factory('MinecraftLibraries', ['IO', 'Constants', 'Url', function(IO, Constants, Url) {
		return function(version) {
			//  versions文件夹
			const fd_versions = Constants.FDS.versions;
			// libraries文件夹
			const fd_libs = Constants.FDS.libs;
			// natives文件夹
			const fd_natives = Constants.FDS.natives;
			// temps文件夹
			const fd_temps = Constants.FDS.temps;

			// 当前版本文件夹
			const fd_version = `${fd_versions}${version}/`;
			const fd_lib = `${fd_libs}${version}/`;
			const fd_native = `${fd_natives}${version}/`;
			const fd_temp = `${fd_temps}${version}/`;

			const TaskEvent = new EventEmitter();
			return {
				event: TaskEvent,
				start: () => {
					// 创建文件夹
					IO.createFolderSync(fd_libs);
					console.info(`created ${fd_libs} folder.`);
					IO.createFolderSync(fd_natives);
					console.info(`created ${fd_natives} folder.`);
				  IO.createFolderSync(fd_temps);
					console.info(`created ${fd_temps} folder.`);


					const jsonPath = `${fd_version}${version}.json`;
					const lockPath = `${fd_version}${version}.lib.lock`;

					if (!fs.existsSync(jsonPath)) {
						return TaskEvent.emit('error', `can not find ${version} from ${fd_version}`);
					}

					if (!fs.existsSync(fd_lib)) {
						IO.createFolderSync(fd_lib);
						console.info(`created ${fd_lib} folder.`);
					}

					if (!fs.existsSync(fd_native)) {
						IO.createFolderSync(fd_native);
						console.info(`created ${fd_native} folder.`);
					}

					if (fs.existsSync(lockPath)) {
						return TaskEvent.emit('done');
					}

					var natives = [];
					var libraries = [];
					var start = Promise.coroutine(function*() {
						try {
							const indexFile = JSON.parse(yield IO.readFile(jsonPath)); //索引文件
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
									if (isAllow) {
										return natives.push(lib);
									}
								}

								if (lib.rules !== undefined && lib.natives !== undefined && lib.rules.length == 1) {
									var rule = lib.rules[0];
									if (rule.os !== undefined) {
										if (rule.action == 'allow' && rule.os.name === 'osx') {
											return natives.push(lib);
										}
									}
								}
								if (lib.natives === undefined) {
									libraries.push(lib);
								}
							});
						} catch (e) {
							TaskEvent.emit('error', e);
						}

						console.log('natives', natives);
						console.log('libraries', libraries);

						try {
							TaskEvent.emit('libraries');
							for (var i = 0; i < libraries.length; i++) {
								var lib = libraries[i];
								const path = lib.downloads.artifact.path;
								const libUrl = lib.downloads.artifact.url;
								const fullPath = `${fd_lib}${path}`;
								const fileName = path.substring(path.lastIndexOf('/') + 1);
								console.log(path, fileName, fullPath);
								// 跳过已经下载的lib
								if (fs.existsSync(fullPath)) {
									console.info(`lib exists [${fileName}] [${i + 1}/${libraries.length}] skip.`);
									TaskEvent.emit('libraries_process', {
										count: i + 1,
										total: libraries.length
									});
									continue;
								}
								yield IO.createFolders(fullPath.substring(0, fullPath.lastIndexOf('/'))); //需要将文件名截取掉，只建立文件夹 /path/to/file.jar --> /path/to
								yield IO.downloadFileToDiskPromise(Url.getLibrariesForChinaUser(libUrl), fullPath, 5);
								TaskEvent.emit('libraries_process', {
									count: i + 1,
									total: libraries.length
								});
								console.info(`downloaded [${fileName}] [${i + 1}/${libraries.length}]`);
							}
						} catch (e) {
							TaskEvent.emit('error', e);
						}

						try {
							TaskEvent.emit('natives');
							// 建立native version文件夹
							yield IO.createFolders(fd_native.substring(0, fd_native.lastIndexOf('/')));
							// 建立临时native version文件夹
							if (!fs.existsSync(fd_temp)) {
								IO.createFolderSync(fd_temp);
								console.info(`created ${fd_temp} folder.`);
							}
							// 下载文件到临时目录
							for (var i = 0; i < natives.length; i++) {
								const native = natives[i];
								const nativeUrl = native.downloads.classifiers['natives-osx'].url;
								const fileName = nativeUrl.substring(nativeUrl.lastIndexOf('/') + 1);
								const tempFilePath = `${fd_temp}${fileName}`;
								// 临时文件是否已经下载
								if (fs.existsSync(tempFilePath)) {
									console.info(`natives lib [${fileName}] [${i + 1}/${natives.length}] skip.`);
								} else {
									// 下载
									yield IO.downloadFileToDiskPromise(Url.getLibrariesForChinaUser(nativeUrl), tempFilePath, 5);
									console.info(`natives lib [${fileName}] [${i + 1}/${natives.length}] download.`);
									yield IO.wait(500);
								}

								try {
									var zip = new admZip(tempFilePath);
									zip.extractAllTo(fd_native, true);
									TaskEvent.emit('natives_process', {
										count: i + 1,
										total: natives.length
									});
								} catch (e) {
									console.error(e);
									return TaskEvent.emit('error', `extract file: ${tempFilePath} to native folder error`);
								}
							}

							IO.writeFileSync(lockPath, '');
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

	.factory('MinecraftAssets', ['IO', 'Constants', 'Url', function(IO, Constants, Url){
		return function(version) {
			//  versions文件夹
			const fd_versions = Constants.FDS.versions;
			// assets文件夹
			const fd_assets = Constants.FDS.assets;

			// 当前版本文件夹
			const fd_version = `${fd_versions}${version}/`;
			const jsonPath = `${fd_version}${version}.json`;

			const TaskEvent = new EventEmitter();
			return {
				event: TaskEvent,
				start: () => {
					// 创建文件夹
					IO.createFolderSync(fd_assets);
				  console.info(`created ${fd_assets} folder.`);

					if (!fs.existsSync(jsonPath)){
						return TaskEvent.emit('error', `can not find ${version} from ${fd_version}`);
					}

					if (!fs.existsSync(fd_assets)) {
						IO.createFolderSync(fd_assets);
						console.info(`created ${fd_assets} folder.`);
					}

					var start = Promise.coroutine(function *(){
						const indexFile = JSON.parse(yield IO.readFile(jsonPath)); //索引文件

						const fd_assets_inner = `${fd_assets}${indexFile.assets}`;
						const fd_assets_indexes = `${fd_assets_inner}/indexes/`;
						const fd_assets_objects = `${fd_assets_inner}/objects/`;
						const assetsIndex = `${fd_assets_indexes}${indexFile.assets}.json`;

						if (!fs.existsSync(`${fd_assets_inner}`)) {
							IO.createFolderSync(`${fd_assets_inner}`);
							console.info(`created ${fd_assets_inner} folder.`);
						}

						if (!fs.existsSync(fd_assets_indexes)) {
							IO.createFolderSync(fd_assets_indexes);
							console.info(`created ${fd_assets_indexes} folder.`);
						}

						if (!fs.existsSync(fd_assets_objects)) {
							IO.createFolderSync(fd_assets_objects);
							console.info(`created ${fd_assets_objects} folder.`);
						}

						const lockPath = `${fd_assets_inner}.lock`;

						if (fs.existsSync(lockPath)) {
							console.log(`Assets ${indexFile.assets} lock file exists.`);
							TaskEvent.emit('done');
							return;
						}

						var assetsList = yield IO.request(Url.getAssetJsonForChinaUser(indexFile.assets));
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
									if (taskError == 0) IO.writeFileSync(lockPath, '');
									TaskEvent.emit('done');
								}
							}

							IO.createFolderSync(folder);

							/* 判断是否已经下载过 */
							if (fs.existsSync(fullPath)) {
								updateAssetsProcess();
								continue;
							}

							try {
								yield IO.downloadFileToDiskPromise(Url.getAssetsForChinaUser(index,hash), fullPath, 5);
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

	.factory('LaunchMinecraft', ['IO', 'Constants', 'Jre', function(IO, Constants, Jre){
		return function(version, _args) {

			const fd_root = Constants.FDS.root;
			const fd_games = Constants.FDS.games;
			//  versions文件夹
			const fd_versions = Constants.FDS.versions;
			// libraries文件夹
			const fd_libs = Constants.FDS.libs;
			// natives文件夹
			const fd_natives = Constants.FDS.natives;
			// assets文件夹
			const fd_assets = Constants.FDS.assets;
			// WORKSPACE
			const fd_ws = Constants.WORKSPACE;

			// 当前版本文件夹
			const fd_version = `${fd_versions}${version}/`;
			const fd_lib = `${fd_libs}${version}/`;
			const fd_native = `${fd_natives}${version}/`;
			const jsonPath = `${fd_version}${version}.json`;

			const TaskEvent = new EventEmitter();

			const getLoadLibrariesString = function (indexFile, version){
			  var natives   = [];
			  var libraries = [];
			  var LoadLibrariesString = "";
			  try{
			    indexFile.libraries.map(lib => {
			      if (lib.name.split(':').length !== 3) return;
			      /* 静态类库 */
			      if (lib.extract != null && lib.natives != null && lib.natives['osx'] != null) {
			        if (lib.rules == null) {
			          return natives.push(lib);
			        }
			        var isAllow = false;
			        lib.rules.map(rule => {
			          if (rule.os != null && rule.os == 'osx') {
			            if (rule.action == 'allow') isAllow = true;
			          } else {
			            var keys = [];
			            for(var k in rule) keys.push(k);
			            if (keys.length == 1 && rule.action != null) {
			              isAllow = rule.action == 'allow';
			            }
			          }
			        });
			        if (isAllow) return natives.push(lib);
			      }
			      if (lib.natives == null && lib.extract == null) libraries.push(lib);
			    });
			    for (var i = 0; i < libraries.length; i++) {
			      const lib  = libraries[i];
			      const path = lib.downloads.artifact.path;
			      const fullPath = `${fd_lib}${path}`;
			      /* 判断lib是否已经存在 */
			      if(fs.existsSync(fullPath)){
			        LoadLibrariesString += `${fullPath}:`;
			      }
			    }
			  } catch (err) {
			    return null;
			  } finally{
			    return LoadLibrariesString;
			  }
			}

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
		      if(!fs.existsSync(jsonPath)){
		        return TaskEvent.emit('error', `can not find ${version} from ${fd_version}`);
		      }
		      JVMArgs.push('-XX:+UseG1GC');
		      JVMArgs.push('-XX:-UseAdaptiveSizePolicy');
		      JVMArgs.push('-XX:-OmitStackTraceInFastThrow');
		      JVMArgs.push(`-Xmn${args.xmx}m`);
		      JVMArgs.push(`-Xmx${args.xms}m`);
		      JVMArgs.push(`-Djava.library.path=${fd_native}`);
		      JVMArgs.push('-Dfml.ignoreInvalidMinecraftCertificates=true');
		      JVMArgs.push('-Dfml.ignorePatchDiscrepancies=true');
		      JVMArgs.push(`-Duser.home=${fd_ws}`);
		      JVMArgs.push(`-cp`);

		      const indexFile = JSON.parse(IO.readFileSync(jsonPath)); //索引文件
		      const LoadLibrariesString = getLoadLibrariesString(indexFile, version);
		      JVMArgs.push(`${LoadLibrariesString}${fd_version}${version}.jar`);
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
		            item = `${fd_games}${version}`;
		            break;
		          case '${assets_root}':
		            item = `${fd_assets}${indexFile.assets}`;
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
		            item = `${fd_assets}${indexFile.assets}`;
		            break;
		        }
		        JVMArgs.push(item);
		      });

		      JVMArgs.push('--height');
		      JVMArgs.push(args.area.height);
		      JVMArgs.push('--width');
		      JVMArgs.push(args.area.width);
					console.log(args.jre.home, JSON.stringify(JVMArgs));
					const child = spawn(args.jre.home, JVMArgs, { cwd: fd_root });
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
