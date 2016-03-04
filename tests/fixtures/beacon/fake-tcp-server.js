var ipc = require('node-ipc');

ipc.config.silent = false;

ipc.serveNet('127.0.0.1', 4895, function() {

    ipc.server.on('PROBE:MSG', function(data, socket) {
        ipc.server.emit(socket, "ALIVE:MSG", {});
    });
});

ipc.server.start();
