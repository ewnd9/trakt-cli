const meow = require('meow');
const credentials = require('inquirer-credentials');
const inquirer = require('inquirer-bluebird');
const Trakt = require('trakt-utils');
const format = require('show-episode-format');

const cli = meow({
  help: `
    Usage

    $ trakt <show-title>
    $ trakt --available
    $ trakt --available --json
  `,
  pkg: '../package.json'
});

const pin = {
  name: 'pin',
  type: 'input',
  hint: 'copy pin from https://trakt.tv/pin/8114',
  env: 'TRAKT_PIN'
};

const traktId = '239c7318fcbeaf195fb05c2028c8893f8b76ee24c53ec7263bdee67cd185d543';
const traktSecret = 'e4136592d73c9aae68b4779f5aa2b4e0585fc0d1e02e0ea144130f2c60531b7e';

const trakt = new Trakt(traktId, traktSecret);

const getToken = config => {
  return trakt.getAccessToken(config.data.pin)
    .then(token => {
      config.data.token = token;
      config.save();

      return token;
    }, err => {
      if (err.message === 'Response code 401 (Unauthorized)') {
        config.data.pin = undefined;
        config.save();
      }

      throw err;
    });
};

Object.keys(cli.flags).forEach(flag => {
  if (typeof cli.flags[flag] === 'string') {
    cli.input.unshift(cli.flags[flag]);
  }
});

credentials('.trakt-cli', [pin])
  .then(config => {
    if (config.data.token) {
      return config.data.token;
    } else {
      return getToken(config);
    }
  })
  .then(token => {
    trakt.token = token;

    const task = path => require(path).default(trakt, cli.input.join(' '), cli.flags);

    if (cli.flags.available) {
      return task('./available');
    } else if (cli.input.length > 0) {
      return task('./search');
    } else {
      cli.showHelp();
    }
  })
  .catch(err => console.log(err));
