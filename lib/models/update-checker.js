'use strict';

var Promise         = require('../ext/promise');
var emberCLIVersion = require('../utilities/ember-cli-version');
var chalk           = require('chalk');

module.exports = UpdateChecker;

function UpdateChecker(ui, settings, localVersion) {
  this.ui = ui;
  this.settings = settings;
  this.localVersion = localVersion || emberCLIVersion();
}

/**
* Checks local config or npm for most recent version of ember-cli
* @param {UI} ui
* @param {Object} environment
*/

UpdateChecker.prototype.checkForUpdates = function() {
  // if 'checkForUpdates' is true, check for an updated ember-cli version
  // if environment.settings is undefined, that means there
  // is no .ember-cli file, so check by default
  var doUpdateCheck = this.settings && this.settings.checkForUpdates;

  if (doUpdateCheck) {
    return this.doCheck().then(function(updateInfo) {
      if (updateInfo.updateNeeded) {
        this.ui.write('\nA new version of ember-cli is available (' +
                      updateInfo.newestVersion + '). To install it, type ' +
                      chalk.green('ember update') + '.\n');
      }
    }.bind(this));
  } else {
    return Promise.resolve();
  }
};

UpdateChecker.prototype.doCheck = function() {
  var settings = this.settings;
  var lastVersionCheck = settings ? settings.lastVersionCheck : null;

  var now = new Date().getTime();
  var version = null;

  return new Promise(function(resolve, reject) {
    // if the last check was less than a day ago, don't remotely check version
    if (lastVersionCheck && lastVersionCheck > (now - 86400000)) {
      version = settings.newestVersion;
      resolve(version);
    }

    // make an http call to npm to get the latest version
    var http = require('http');
    var options = {
      hostname: 'registry.npmjs.org',
      port: '80',
      path: '/ember-cli/latest',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };

    var req = http.request(options, function(res) {
      res.setEncoding('utf8');
      var jsonData = '';
      res.on('data', function (data) {
        jsonData += data;
      });
      res.on('end', function() {
        resolve(JSON.parse(jsonData).version);
      });
    });

    req.on('error', function(e) {
      reject(e);
    });

    req.end();
  }).then(function(versionNumber) {
    // save version so we don't have to check again for another day
    saveVersionInformation(versionNumber);

    var updateNeeded = checkVersionNumber(this.localVersion, versionNumber);
    return {
      updateNeeded: updateNeeded,
      newestVersion: versionNumber
    };
  }.bind(this))
  .catch(function(error) {
    this.ui.write('There was an error checking NPM for an update: ' + error + '\n');
    // just report the error, but keep going
  }.bind(this));
};

/**
* Compares new & local version numbers to determine if an update is needed.
* If so, displays a message to the user.
* @param {UI} ui
* @param {String} version
*/
function checkVersionNumber(_localVersion, version) {
  var newestVersion = version.split('.');
  var localVersion  = _localVersion.split('.');
  var updateNeeded  = false;

  for (var i = 0; i < newestVersion.length; i++) {
    if (parseInt(newestVersion[i], 10) > parseInt(localVersion[i], 10)) {
      updateNeeded = true;
      break;
    }
  }

  return updateNeeded;
}

/**
* Saves updated version information to .ember-cli file
* @param {String} version
*/
function saveVersionInformation(version) {
  var Yam    = require('yam');
  var config = new Yam('ember-cli');
  var now    = new Date().getTime();

  config.set('newestVersion', version);
  config.set('lastVersionCheck', now);
  config.flush();
}
