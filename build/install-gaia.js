'use strict';

var utils = require('./utils');
var adb = new utils.Commander('adb');
var sh = new utils.Commander('sh');

var gaiaDir;
var remotePath;
var profileFolder;

function installGaia() {
	var webapps_path = remotePath + '/webapps';
	adb.run(['shell', 'rm', '-r', webapps_path]);
	adb.run(['shell', 'rm', '/data/local/user.js']);
	adb.run(['push', utils.joinPath(profileFolder, 'webapps'), webapps_path]);
	adb.run(['push', utils.joinPath(profileFolder, 'user.js'),
					 '/data/local/user.js']);

	var indexedDbFile = utils.getFile(profileFolder, 'indexedDB');
	if (indexedDbFile.exists() && indexedDbFile.isDirectory()) {
		adb.run(['push', indexedDbFile.path, '/data/local/indexedDB']);
	}
	return true;
}

function getPid(appName) {
	var tempFileName = 'tmpFile';
	sh.run(['-c', 'adb shell b2g-ps > ' + tempFileName]);
	var tempFile = utils.getFile(utils.joinPath(gaiaDir, tempFileName));
	var content = utils.getFileContent(tempFile);
	var pidMap = utils.psParser(content);
	sh.run(['-c', 'rm ' + tempFileName]);
	return pidMap[appName] ? pidMap[appName].pid : null;
}

function execute(options) {
	const paths = utils.getEnvPath();
	const gaiaInstallParent = options.GAIA_INSTALL_PARENT;
	const buildAppName = options.BUILD_APP_NAME;

	remotePath = gaiaInstallParent || '/system/b2g/webapps';

	adb.initPath(paths);
	sh.initPath(paths);

	gaiaDir = options.GAIA_DIR;

	adb.run(['start-server']);

	var profile = utils.getFile(options.PROFILE_DIR);
	if (profile.isDirectory()) {
		profileFolder = options.PROFILE_DIR;
	} else {
		throw new Error(' -*- build/install-gaia.js: cannot locate' +
										'profile folder in ' + options.PROFILE_FOLDER);
	}

	if (buildAppName === '*' || buildAppName === 'system') {
		adb.run(['shell', 'stop', 'b2g']);
	} else {
		var appPid = getPid(buildAppName);
		if (appPid) {
			adb.run(['shell', 'kill', appPid]);
		}
	}

	adb.run(['shell','rm -r /cache/*']);

	if (buildAppName === '*') {
		installGaia();
	} else {
		var targetFolder = utils.joinPath(
					profileFolder, 'webapps',
					buildAppName + '.' + options.GAIA_DOMAIN);
		adb.run(['push',
			utils.joinPath(targetFolder, 'manifest.webapp'),
			remotePath + '/' + targetFolder + '/manifest.webapp']);
		adb.run(['push',
			utils.joinPath(targetFolder, 'application.zip'),
			remotePath + '/' + targetFolder + '/application.zip']);
	}

	if (options.VARIANT_PATH) {
		var svoperappsUrl = '/data/local/svoperapps';
		adb.run(['shell', 'rm -r ' + svoperappsUrl]);
		adb.run(['push', utils.joinPath(profileFolder, 'svoperapps'),
			svoperappsUrl])
	}

	if (buildAppName === '*' || buildAppName === 'system') {
		adb.run(['shell', 'start', 'b2g']);
	}
}

exports.execute = execute;
