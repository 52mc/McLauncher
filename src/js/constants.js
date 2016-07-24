const path = require('path');
const mkdirp = require('mkdirp');
const pkg = require('../../package');

const USER_HOME = process.platform === 'win32' ?
(process.env.USERPROFILE || '') : (process.env.HOME || process.env.HOMEPATH || '');
const WORKSPACE = path.join(USER_HOME, '.' + pkg.name);
const CONFIG = path.join(WORKSPACE, 'config.json');
try {
	mkdirp.sync(WORKSPACE);
} catch (e) {
	console.log('Make workspace folder failed: ', e);
}

module.exports = {
	USER_HOME: USER_HOME,
	WORKSPACE: WORKSPACE,
	CONFIG: CONFIG
}
