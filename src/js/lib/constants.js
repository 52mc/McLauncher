const path = require('path');
const joinPath = path.join;
const pkg = require('../../../package');

const USER_HOME = process.platform === 'win32' ? (process.env.USERPROFILE || '') : (process.env.HOME || process.env.HOMEPATH || '');
const WORKSPACE = joinPath(USER_HOME, '.' + pkg.name);
const CONFIG = joinPath(WORKSPACE, 'config.json');
const VERSIONS = joinPath(WORKSPACE, 'versions.json');

const game_root = joinPath(WORKSPACE, '/.minecraft2/');
const game = {
	root: game_root,
	assets: joinPath(game_root, '/assets/'),
	libs: joinPath(game_root, '/libraries/'),
	versions: joinPath(game_root, '/versions/'),
	natives: joinPath(game_root, '/natives/'),
	temps: joinPath(game_root, '/nativeTemps/'),
}

module.exports = {
	USER_HOME: USER_HOME,
	WORKSPACE: WORKSPACE,
	CONFIG: CONFIG,
	VERSIONS: VERSIONS,
	FDS: game
}
