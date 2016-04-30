var ipc = require('node-ipc');
var router = require('./router.js');
var runner = require('./jobs-runner.js');

var configs = require('./beacon-configs');

var localIPC = new ipc.IPC();
configs.configureLocalIPC(localIPC);
ipc.klyngLocal = localIPC;

localIPC.serve(function() {

    localIPC.server.on('STOP:MSG', function(data, socket) {
        socket.end();
        localIPC.server.stop();
        // TODO: add a TCPServer.stop line when implemented
    });

    localIPC.server.on('SIGNAL:RUN', function(data, socket) {

        if(router.isClean()) {
            localIPC.server.emit(socket, 'SIGNAL:CONFIRM', {status: 'available'});

            var job = data.job_specs;

            if(!job.remotes) {
                var routingTable = router.buildPureLocalTable(job.size);
                router.setMetaTable(routingTable);
                router.setMonitorSocket(socket);
                job.start = 0;
                job.subsize = job.size;

                runner.runLocally(job);
            }
        }
        else {
            localIPC.server.emit(socket, 'SIGNAL:CONFIRM', {status: 'busy'});
        }
    });

    localIPC.server.on('SIGNAL:DONE', function(data, socket) {

        if(router.hasRemotes()) {
            // TODO: should send DONE signals on TCP for remote beacons
        }

        router.clear();
        socket.end();
    });
});

localIPC.server.start();
