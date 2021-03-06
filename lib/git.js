var chalk = require('chalk');
var inquirer = require('inquirer');
var Preferences = require('preferences');
var Spinner = require('cli-spinner').Spinner;
var git = require('simple-git')();
var fs = require('fs');
var request = require('request');

module.exports.changeLang = function() {
	var language = [
	{
		name: 'lang',
		type: 'input',
		message: 'Language: ',
		default: hostpref.host.lang,
	}];

	inquirer.prompt(language).then(function(answers) {
		hostpref.host.lang = arguments['0'].lang;
		console.log('Successfully changed the language');
	})
}

module.exports.changeHost = function() {
	var hostname = [
	{
		name: 'host',
		type: 'input',
		message: 'Host name: ',
		default: hostpref.host.host,

	}];

	inquirer.prompt(hostname).then(function(answers) {
		hostpref.host.host = arguments['0'].host;
		console.log('Successfully changed the host');
	});
};

module.exports.createRepo = function(callback) {
	var questions = [
	{
		name: 'lab',
		type: 'input',
		message: 'Enter the Lab Name to be created',
		validate: function(value) {
			if (value.length) {
				return true;
			}
			else {
				return 'Please enter the Lab No.';
			}
		}
	}];
	inquirer.prompt(questions).then(function (answers) {
		var prefs = new Preferences('in.ac.bits-goa.autolab');
		var labno = arguments['0'].lab;
		request.post(
			hostpref.host.host +'/api/v3/projects?private_token=' + prefs.gitlab.token,
			{ json: {'name' : labno}},
			function (error, response, body) {
				if (error) {
					console.log(error);
					return;
				}
				if (response.statusCode == 201) {
					console.log(chalk.green('Successfully created online repo ' + labno));
					var options = {
						username: prefs.gitlab.username,
						lab: labno
					};
					fs.writeFile('./.config.json', JSON.stringify(options), function (err) {
						if (err) {
							console.log(err.message);
							return;
						}
					});
				}
				if (response.statusCode == 401 || response.statusCode == 403 ) {
					console.log(chalk.red("Authentication problem!. Use 'autolab init' to authenticate." ));
				}
				if (response.statusCode == 400) {
					console.log(chalk.yellow('Already created ' + labno));
				}
				console.log(response.statusCode);
			});
	});
};


module.exports.deleteRepo = function(callback) {
	var questions = [
	{
		name: 'lab',
		type: 'input',
		message: 'Enter the Lab No. to be deleted',
		validate: function(value) {
			if (value.length) {
				return true;
			}
			else {
				return 'Please enter the Lab No.';
			}
		}
	}];
	inquirer.prompt(questions).then(function (answers) {
		var prefs = new Preferences('in.ac.bits-goa.autolab');
		var labno = arguments['0'].lab;
		request.delete(
			hostpref.host.host +'/api/v3/projects/' + prefs.gitlab.username + '%2F' +labno +'?private_token=' + prefs.gitlab.token,
			function (error, response, body) {
				if (response.statusCode == 200) {
					console.log(chalk.green('Successfully deleted' + labno));
				}
				if (response.statusCode == 401 || response.statusCode == 403 ) {
					console.log(chalk.red("Authentication problem!. Use 'autolab init' to authenticate." ));
				}
				if (response.statusCode == 400) {
					console.log(chalk.yellow('No online repo with the name ' + labno));
				}
		});
	});
};

module.exports.push = function() {
	var prefs = new Preferences('in.ac.bits-goa.autolab');
	var questions = [
	{
		name: 'message',
		type: 'input',
		message: 'Enter the commit message',
		validate: function(value) {
			if (value.length) {
				return true;
			}
			else {
				return 'Please enter commit message';
			}
		}
	}];
	inquirer.prompt(questions).then(function (answers) {
		var status = new Spinner('Pushing the code');
		status.setSpinnerString(0);
		status.start();
		git.add('./*').commit(answers.message);
		var labno = JSON.parse(fs.readFileSync('./.config.json')).lab;
		git.addRemote('autolab', (hostpref.host.host.search(/https:\/\//)? 'http://' : 'https://') + prefs.gitlab.username.replace(/@/g, '%40') + ':' + prefs.gitlab.password.replace(/@/g, '%40') + '@' + hostpref.host.host.replace(/^https?\:\/\//i, '') +'/' + prefs.gitlab.username + '/' + labno);
		git.push('autolab', 'master');
		git.removeRemote('autolab');
		status.stop();
		});
};
