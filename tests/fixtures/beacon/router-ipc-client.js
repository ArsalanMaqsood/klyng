var ipc = require('node-ipc');

ipc.config.silent = true;

ipc.connectTo('FAKE', function() {

    // emit a message for the server to recoginze the socket
    ipc.of.FAKE.emit('SOCKET:PUB', {});

    ipc.of.FAKE.on('MONITOR:MSG', function(msg) {
        if(!!msg.data && !!msg.data.line)
            console.log(msg.data.line);
        if(msg.type === "process:exit")
            ipc.disconnect('FAKE');
    });
});
