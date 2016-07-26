const Promise = require('bluebird');
const fs = require('fs');
const admZip = require('adm-zip');
const electron = require('electron');
const dialog = electron.dialog;
const EventEmitter = require('events').EventEmitter;
const spawn = require('child_process').spawn;
const assignIn = require('lodash').assignIn;
const CONSTS = require('./constants');
const FDS = CONSTS.FDS;
const WORKSPACE = `${CONSTS.WORKSPACE}`;
const io = require('./io');
const url = require('./url');
const jre = require('./jre');
const Versions = require('./versions');
const fd_root = `${FDS.root}`;
const fd_version = `${FDS.version}`;
const fd_lib = `${FDS.lib}`;
const fd_native = `${FDS.native}`;
const fd_temp = `${FDS.temp}`;
const fd_assets = `${FDS.assets}`;

if(!fs.existsSync(fd_root)){
  io.createFolderSync(fd_root);
	console.info(`created ${fd_root} folder.`);
	io.createFolderSync(fd_lib);
	console.info(`created ${fd_lib} folder.`);
	io.createFolderSync(fd_native);
	console.info(`created ${fd_native} folder.`);
  io.createFolderSync(fd_temp);
	console.info(`created ${fd_temp} folder.`);
  io.createFolderSync(fd_assets);
  console.info(`created ${fd_assets} folder.`);
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
						yield io.downloadFileToDiskPromise(url.getLibrariesForChinaUser(libUrl), fullPath, 5);
						TaskEvent.emit('libraries_process', {
							count: i + 1,
							total: libraries.length
						});
						console.info(`downloaded [${fileName}] [${i + 1}/${libraries.length}]`);
					}
				} catch (e) {
					TaskEvent.emit('error', e);
				}

        try{
          TaskEvent.emit('natives');
          // 建立native version文件夹
          const nativePath = `${fd_native}${version}`;
          yield io.createFolders(nativePath.substring(0, nativePath.lastIndexOf('/')));
          // 建立临时native version文件夹
          const tempPath = `${fd_temp}${version}`;
          if(!fs.existsSync(tempPath)){
            io.createFolderSync(tempPath);
            console.info(`created ${tempPath} folder.`);
          }
          // 下载文件到临时目录
          for (var i = 0; i < natives.length; i++) {
            const native = natives[i];
            const nativeUrl = native.downloads.classifiers['natives-osx'].url;
            const fileName = nativeUrl.substring(nativeUrl.lastIndexOf('/') + 1);
            const tempFilePath = `${tempPath}/${fileName}`;
            // 临时文件是否已经下载
            if(fs.existsSync(tempFilePath)){
              console.info(`natives lib [${fileName}] [${i + 1}/${natives.length}] skip.`);
            } else {
              // 下载
              yield io.downloadFileToDiskPromise(url.getLibrariesForChinaUser(nativeUrl), tempFilePath, 5);
              console.info(`natives lib [${fileName}] [${i + 1}/${natives.length}] download.`);
              yield io.wait(500);
            }

            try{
              var zip = new admZip(tempFilePath);
              zip.extractAllTo(nativePath, true);
              TaskEvent.emit('natives_process', {
                count: i + 1,
                total: natives.length
              });
            } catch(e){
              console.error(e);
              return TaskEvent.emit('error', `extract file: ${tempFilePath} to native folder error`);
            }
          }

          io.writeFileSync(lockPath, '');
          TaskEvent.emit('done');

        } catch(e){
          TaskEvent.emit('error', e);
        }
			});
			start();
		}
	}
}


exports.DownloadAssets = function(version) {
	const TaskEvent = new EventEmitter();
	return {
		event: TaskEvent,
		start: () => {
      const jsonPath = `${fd_version}${version}/${version}.json`;

			if (!fs.existsSync(jsonPath)){
        return TaskEvent.emit('error', `can not find ${version} from ${fd_version}`);
      }

			if (!fs.existsSync(fd_assets)) {
				io.createFolderSync(fd_assets);
        console.info(`created ${fd_assets} folder.`);
			}

			var start = Promise.coroutine(function *(){
        const indexFile = JSON.parse(yield io.readFile(jsonPath)); //索引文件

				const assetsIndex = `${fd_assets}${indexFile.assets}/indexes/${indexFile.assets}.json`;
				const assetsIndexDir = `${fd_assets}${indexFile.assets}/indexes/`;
				const assetsObjectDir = `${fd_assets}${indexFile.assets}/objects/`;

				if (!fs.existsSync(`${fd_assets}${indexFile.assets}`)) {
					io.createFolderSync(`${fd_assets}${indexFile.assets}`);
          console.info(`created ${fd_assets}${indexFile.assets} folder.`);
				}

				if (!fs.existsSync(assetsIndexDir)) {
					io.createFolderSync(assetsIndexDir);
          console.info(`created ${assetsIndexDir} folder.`);
				}

				if (!fs.existsSync(assetsObjectDir)) {
					io.createFolderSync(assetsObjectDir);
          console.info(`created ${assetsObjectDir} folder.`);
				}

				const lockPath = `${fd_assets}${indexFile.assets}.lock`;

				if (fs.existsSync(lockPath)) {
					console.log(`Assets ${indexFile.assets} lock file exists.`);
					TaskEvent.emit('done');
					return;
				}

				var assetsList = yield io.request(`https://authentication.x-speed.cc/minecraft/assets/${indexFile.assets}.json`);
        io.writeFileSync(assetsIndex, assetsList);
				assetsList = JSON.parse(assetsList);

				var taskCount = Object.keys(assetsList.objects).length;
				var taskDone = 0;
				var taskError = 0;

				console.log(taskCount);
				for (var obj in assetsList.objects) {
					obj = assetsList.objects[obj];
					var hash = obj.hash;
					var index = hash.substring(0, 2);

					var folder = assetsObjectDir + index;
					var fullPath = assetsObjectDir + index + '/' + hash;

					/* 通知Assets下载进度方法 */
					function updateAssetsProcess() {
						TaskEvent.emit('process', {
							count: ++taskDone,
							total: taskCount
						});

						if (taskDone == taskCount) {
							if (taskError == 0) io.writeFileSync(lockPath, '');
							TaskEvent.emit('done');
						}
					}

					io.createFolderSync(folder);

					/* 判断是否已经下载过 */
					if (fs.existsSync(fullPath)) {
						updateAssetsProcess();
						continue;
					}

					try {
						yield io.downloadFileToDiskPromise(url.getAssetsForChinaUser(`${index}`,`${hash}`), fullPath, 5);
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

exports.getLoadLibrariesString = function (indexFile, version){
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
      const fullPath = `${fd_lib}${version}/${path}`;
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

exports.LaunchMinecraft = function(version, _args) {
	const TaskEvent = new EventEmitter();
	return {
		event: TaskEvent,
		start: () => {
      const jsonPath = `${fd_version}${version}/${version}.json`;
      var args = assignIn({
        xmx: 256,
        xms: 1024,
        width: 854,
        height: 480,
        player: 'unknow'
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
      JVMArgs.push(`-Djava.library.path=${fd_native}${version}`);
      JVMArgs.push('-Dfml.ignoreInvalidMinecraftCertificates=true');
      JVMArgs.push('-Dfml.ignorePatchDiscrepancies=true');
      JVMArgs.push(`-Duser.home=${WORKSPACE}`);
      JVMArgs.push(`-cp`);

      const indexFile = JSON.parse(io.readFileSync(jsonPath)); //索引文件
      const LoadLibrariesString = this.getLoadLibrariesString(indexFile, version);
      JVMArgs.push(`${LoadLibrariesString}${fd_version}${version}/${version}.jar`);
      JVMArgs.push(indexFile.mainClass);

      var ClientUUID = '110ec58aa0f24ac48393c866d813b8d1';//Date.now();//uuid.v1().replace(/-/g, '');
      indexFile.minecraftArguments.split(' ').map(item => {
        switch (item) {
          case '${auth_player_name}':
            item = args.player;
            break;
          case '${version_name}':
            item = '"+1s"';
            break;
          case '${game_directory}':
            item = fd_root;
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
          //1.5.2
          case  '${game_assets}':
            item = `${fd_assets}${indexFile.assets}`;
            break;
        }
        JVMArgs.push(item);
      });

      JVMArgs.push('--height');
      JVMArgs.push(Number(args.height));
      JVMArgs.push('--width');
      JVMArgs.push(Number(args.width));

      jre.loadJrePath().then((bin) => {
        console.log(JSON.stringify(JVMArgs));
        // JVMArgs = ["-XX:+UseG1GC","-XX:-UseAdaptiveSizePolicy","-XX:-OmitStackTraceInFastThrow","-Xmn512m","-Xmx1024m","-Djava.library.path=/Users/imacforeeve/.MinecraftLaunchCore/.minecraft/native/b1.4","-Dfml.ignoreInvalidMinecraftCertificates=true","-Dfml.ignorePatchDiscrepancies=true","-Duser.home=/Users/imacforeeve/.MinecraftLaunchCore","-cp","/Users/imacforeeve/.MinecraftLaunchCore/.minecraft/libraries/b1.4/net/minecraft/launchwrapper/1.5/launchwrapper-1.5.jar:/Users/imacforeeve/.MinecraftLaunchCore/.minecraft/libraries/b1.4/net/sf/jopt-simple/jopt-simple/4.5/jopt-simple-4.5.jar:/Users/imacforeeve/.MinecraftLaunchCore/.minecraft/libraries/b1.4/org/ow2/asm/asm-all/4.1/asm-all-4.1.jar:/Users/imacforeeve/.MinecraftLaunchCore/.minecraft/libraries/b1.4/net/java/jinput/jinput/2.0.5/jinput-2.0.5.jar:/Users/imacforeeve/.MinecraftLaunchCore/.minecraft/libraries/b1.4/net/java/jutils/jutils/1.0.0/jutils-1.0.0.jar:/Users/imacforeeve/.MinecraftLaunchCore/.minecraft/libraries/b1.4/org/lwjgl/lwjgl/lwjgl/2.9.0/lwjgl-2.9.0.jar:/Users/imacforeeve/.MinecraftLaunchCore/.minecraft/libraries/b1.4/org/lwjgl/lwjgl/lwjgl_util/2.9.0/lwjgl_util-2.9.0.jar:/Users/imacforeeve/.MinecraftLaunchCore/.minecraft/libraries/b1.4/org/lwjgl/lwjgl/lwjgl/2.9.1-nightly-20130708-debug3/lwjgl-2.9.1-nightly-20130708-debug3.jar:/Users/imacforeeve/.MinecraftLaunchCore/.minecraft/libraries/b1.4/org/lwjgl/lwjgl/lwjgl_util/2.9.1-nightly-20130708-debug3/lwjgl_util-2.9.1-nightly-20130708-debug3.jar:/Users/imacforeeve/.MinecraftLaunchCore/.minecraft/versions/b1.4/b1.4.jar","net.minecraft.launchwrapper.Launch","Unknow","${auth_session}","--gameDir","/Users/imacforeeve/.MinecraftLaunchCore/.minecraft/","--assetsDir","/Users/imacforeeve/.MinecraftLaunchCore/.minecraft/assets//legacy","--height",480,"--width",854];
        const child = spawn(bin, JVMArgs, { cwd: fd_root });
        child.on('error', (err) =>  TaskEvent.emit('error', err));
        child.stdout.on('data', (data) => TaskEvent.emit('message', data));
        child.stderr.on('data', (data) => TaskEvent.emit('message', data));
        child.on('exit', (code) => TaskEvent.emit('exit', code));
        child.stdout.setEncoding('utf8');
        TaskEvent.emit('done');
      }).catch((err) => {
        console.log(err);
        TaskEvent.emit('error', '找不到JAVA环境');
      });

    }
  }
}
