var ipc = require('node-ipc');

ipc.config.silent = true;

ipc.serveNet('127.0.0.1', 4895, function() {
    ipc.server.on('MONITOR:MSG', function(data, socket) {
        console.log(data.line);
        socket.destroy();
        ipc.server.stop();
    });
});

ipc.server.start();
