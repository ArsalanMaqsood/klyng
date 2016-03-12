var ipc = require('node-ipc');
var crypto = require('crypto');
var utils = require('../../../lib/utils');

ipc.config.silent = true;

var password = "a1b2c3d4";
var secret = "";

ipc.serveNet('127.0.0.1', 4895, function() {

    ipc.server.on('PROBE:MSG', function(data, socket) {
        ipc.server.emit(socket, "ALIVE:MSG", {});
    });

    ipc.server.on('MONITOR:MSG', function(msg, socket) {
        console.log(msg.data.line);
        socket.destroy();
        ipc.server.stop();
    });

    ipc.server.on('KLYNG:MSG', function(msg, socket) {
        console.log(msg.data);
        socket.destroy();
        ipc.server.stop();
    });

    ipc.server.on('KEY-EXT:PARAMS', function(data, socket) {
        var dhObj = utils.diffieHellman(data.prime);
        var publicKey = dhObj.publicKey;

        var sharedSecret = dhObj.computeSecret(data.key);
        secret = sharedSecret;

        console.log(sharedSecret);

        ipc.server.emit(socket, 'KEY-EXT:PUBLIC', {key: publicKey});
    });

    ipc.server.on('AUTH', function(data, socket) {
        var decrypted = utils.verify(data, secret);
        ipc.server.emit(socket, 'AUTH:STATUS', {status: decrypted.data === password});
    });
});

ipc.server.start();
