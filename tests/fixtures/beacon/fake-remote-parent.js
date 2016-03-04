var ipc = require('node-ipc');

ipc.config.silent = true;

ipc.serveNet('127.0.0.1', 4895, function() {
    ipc.server.on('MONITOR:MSG', function(msg, socket) {
        console.log(msg.data.line);
        socket.destroy();
        ipc.server.stop();
    });

    ipc.server.on('KLYNG:MSG', function(msg, socket) {
        console.log(msg.data);
        socket.destroy();
        ipc.server.stop();
    })
});

ipc.server.start();
