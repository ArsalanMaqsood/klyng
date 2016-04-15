var ipc = require('node-ipc');
var fs = require('fs');

// set ipc configurations for beacon process
ipc.config.maxRetries = 3;
ipc.config.retry = 600;
ipc.config.sync = true;
ipc.config.silent = true;
ipc.config.id = 'klyng_beacon';

// read and parse the configurations file
var configs_data = fs.readFileSync(__dirname + "/../config.json", "utf8");
var configs = JSON.parse(configs_data);

module.exports = configs;
