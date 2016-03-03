var ipc = require('node-ipc');
var router = require('./router.js');
var runner = require('./jobs-runner.js');

ipc.config.id = 'klyng_beacon';
ipc.config.retry = 1500;
ipc.config.sync = true;
//ipc.config.silent = true;

ipc.serve(function() {

    ipc.server.on('PROBE:MSG', function(data, socket) {
        ipc.server.emit(socket, 'ALIVE:MSG', {});
    });

    ipc.server.on('STOP:MSG', function(data, socket) {
        socket.destory();
        ipc.server.stop();
        // TODO: add a TCPServer.stop line when implemented
    });

    ipc.server.on('SIGNAL:RUN', function(data, socket) {

        if(router.isClean()) {
            ipc.server.emit(socket, 'SIGNAL:CONFIRM', {status: 'available'});

            var job = data.job_specs;

            if(!job.remotes) {
                var routingTable = router.buildPureLocalTable(job.size);
                router.setMetaTable(routingTable);
                router.setMonitorSocket(socket);
                job.startId = 0;

                runner.runLocally(job);
            }
        }
        else {
            ipc.server.emit(socket, 'SIGNAL:CONFIRM', {status: 'busy'});
        }
    });

    ipc.server.on('SIGNAL:DONE', function(data, socket) {

        if(router.hasRemotes()) {
            // TODO: should send DONE signals on TCP for remote beacons
        }

        router.clear();
        socket.destroy();
    });
});

ipc.server.start();
