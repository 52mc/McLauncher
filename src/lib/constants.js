const path = require('path');
const mkdirp = require('mkdirp');
const pkg = require('../../package');

const USER_HOME = process.platform === 'win32' ?
(process.env.USERPROFILE || '') : (process.env.HOME || process.env.HOMEPATH || '');
const WORKSPACE = path.join(USER_HOME, '.' + pkg.name);
const CONFIG = path.join(WORKSPACE, 'config.json');
const VERSIONS = path.join(WORKSPACE, 'versions.json');
try {
	mkdirp.sync(WORKSPACE);
} catch (e) {
	console.log('Make workspace folder failed: ', e);
}


const fd_game_root = path.join(WORKSPACE, '/.minecraft/');
const fd_game_assets = path.join(fd_game_root, '/assets/');
const fd_game_lib = path.join(fd_game_root, '/libraries/');
const fd_game_version = path.join(fd_game_root, '/versions/');
const fd_game_native = path.join(fd_game_root, '/native/');
const fd_game_temp = path.join(fd_game_root, '/nativeTemp/');

module.exports = {
	USER_HOME: USER_HOME,
	WORKSPACE: WORKSPACE,
	CONFIG: CONFIG,
	VERSIONS: VERSIONS,
	FDS: {
		root: fd_game_root,
		assets: fd_game_assets,
		lib: fd_game_lib,
		version: fd_game_version,
		native: fd_game_native,
		temp: fd_game_temp,
	}
}
