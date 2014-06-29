'use strict';

// Runs `jspm install` in cwd

var Promise = require('../ext/promise');
var Task    = require('../models/task');
var chalk   = require('chalk');

module.exports = Task.extend({
  init: function() {
    this.jspm       = this.jspm || require('jspm');
    var ui          = this.ui;
    
    this.jspm.on('log', this.logJspmMessage.bind(this));

    this.jspm.on('prompt', function(question, callback) {
      question.name = 'jspm_question';
      ui.prompt([question], function(answers) {
        callback(answers['jspm_question']);
      });
    });
  },

  logJspmMessage: function(type, message) {
    if (!this.verbose)
      return;

    var typeChalk;
    if (type === 'info') {
      typeChalk = chalk.grey;
    } else if (type === 'ok') {
      typeChalk = chalk.green;
    } else if (type === 'warn') {
      typeChalk = chalk.yellow;
    }

    // NB `asdf` and %asdf% are used for emphasis in the message
    //    these should probably be substituted or removed

    // e.g.
    //   ok   installed ember as ...
    //        downloading x
    //        checking versions for y
    //   warn something dangerous
    this.ui.write('  ' + typeChalk(type) + ' ' + message + '\n');
  },
  // Options: Boolean verbose
  run: function(options) {
    var jspm        = this.jspm;
    var ui          = this.ui;

    this.verbose = options.verbose;

    ui.pleasantProgress.start(chalk.green('Installing browser packages via jspm'), chalk.green('.'));

    return Promise.resolve(jspm.install(true))
      .catch(function(e) {
        ui.write(chalk.red('error ' + (e.stack || e) + '\n'));
      })
      .finally(function() { ui.pleasantProgress.stop(); })
      .then(function() {
        ui.write(chalk.green('Installed browser packages via jspm.\n'));
      });
  }
});
