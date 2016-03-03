var ipc = require('node-ipc');

ipc.config.silent = true;

ipc.serveNet('127.0.0.1', 4895, function() {});
