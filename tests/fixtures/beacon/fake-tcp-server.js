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

    ipc.server.on('KLYNG:JOB', function(data, socket) {
        var decrypted = utils.verify(data, secret);
        var ack = {status: false, error: "REMOTE: BAD JOB"};
        if(!!decrypted) {
            var correctId = (decrypted.data.id === 1);
            var correctData = (decrypted.data.pckg === "packed.app");
            var correctSize = (decrypted.data.size === 11);
            var correctParent = (decrypted.data.plan.parent.count === 5);
            var correctParentPort = (decrypted.data.plan.parent.port === 7777);
            var correctLocal = (decrypted.data.plan.local.count === 4);
            var correctOther = (decrypted.data.plan["127.0.0.2:2222"].count === 2);

            ack.status = correctId && correctData && correctSize && correctParent && correctLocal && correctOther && correctParentPort;
            if(!ack.status) {
                ack.error = "REMOTE: ASSERTION FAILED";
            }
            else {
                delete ack["error"];
            }
        }

        ipc.server.emit(socket, 'JOB:ACK', ack);
    })

    ipc.server.on('SIGNAL:DONE', function(data, socket) {
        ipc.server.emit(socket, 'DONE:ACK', {status: true});
    })
});

ipc.server.start();
