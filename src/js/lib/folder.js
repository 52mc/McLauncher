const consts = require('./constants');
const path = require('path');
const gmhome = consts.GAMEHOME;

module.exports = {
	init : (version) => {
		const vf = path.join(gmhome, version);
		return {
			home: gmhome,
			version: vf,
			game: path.join(vf, 'game/'),
			assets: path.join(gmhome, 'assets/'),
			libs: path.join(vf, 'libraries/'),
			natives: path.join(vf, 'natives/'),
			temps: path.join(vf, 'nativeTemps/'),
			lockFile: path.join(vf, `${version}.lock`),
			jsonFile: path.join(vf, `${version}.json`),
			jarFile: path.join(vf, `${version}.jar`),
			libLockFile: path.join(vf, `${version}.lib.lock`),
			assetsLockFile: path.join(vf, `${version}.assets.lock`),
			lastLaunchArgsFile: path.join(vf, `${version}.args`)
		}
	}
}
