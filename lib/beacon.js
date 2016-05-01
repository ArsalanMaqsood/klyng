var ipc = require('node-ipc');
var router = require('./router.js');
var runner = require('./jobs-runner.js');
var tcp = require('./tcp');

var configs = require('./beacon-configs');

var localIPC = new ipc.IPC();
configs.configureLocalIPC(localIPC);
ipc.klyngLocal = localIPC;

localIPC.serve(function() {

    localIPC.server.on('STOP:MSG', function(data, socket) {
        socket.end();
        localIPC.server.stop();
        tcp.stop();
    });

    localIPC.server.on('SIGNAL:RUN', function(data, socket) {

        if(router.isClean()) {
            localIPC.server.emit(socket, 'SIGNAL:CONFIRM', {status: 'available'});
            router.setMonitorSocket(socket);

            var job = data.job_specs;

            if(!job.hosts) {
                var routingTable = router.buildPureLocalTable(job.size);
                router.setMetaTable(routingTable);
                job.start = 0;
                job.subsize = job.size;

                runner.runLocally(job);
            }
            else {
                var plan;
                runner.pack(job)
                .then((appPckg) => {

                    plan = runner.divide(job);

                    if(!plan.local) {
                        // this just indcates that this process is the parent
                        plan.local = {count: 0}
                    }

                    var table = router.buildTableFromPlan(plan, true);
                    router.setMetaTable(table);

                    // the job descriptor for remote beacons
                    var rDescriptor = {
                        app: appPckg,
                        size: job.size,
                        plan: plan
                    };

                    var remoteHosts = Object.keys(job.hosts).filter((host) => host !== "local");

                    var fullConnectPromises = remoteHosts.map((host) => {
                        var creds = host.split(":");
                        var passwd = job.hosts[host].password;

                        var singleFullConnectPromise = tcp.connectTo(creds[0], parseInt(creds[1]));

                        singleFullConnectPromise
                        .then((connection) => {
                            router.setRemoteChannel(host, connection);
                            return connection;
                        })
                        .then((connection) => tcp.exchangeKeyOver(connection))
                        .then((params) => tcp.authOver(params.connection, params.secret, passwd))
                        .then((params) => tcp.sendJobOver(params.connection, params.secret, rDescriptor, plan));

                        return singleFullConnectPromise;
                    });

                    return Promise.all(fullConnectPromises);
                })
                .then(() => {
                    if(!!plan.local.count) {
                        runner.runLocally({
                            app: job.app,
                            size: job.size,
                            start: plan.local.start,
                            subsize: plan.local.count
                        });
                    }
                })
                .catch((error) => {/* TODO: ABORT or any other error handler */})
            }
        }
        else {
            localIPC.server.emit(socket, 'SIGNAL:CONFIRM', {status: 'busy'});
        }
    });

    localIPC.server.on('SIGNAL:DONE', function(data, socket) {

        var remoteHosts = router.getRemoteChannels();
        var donePromises = Object.keys(remoteHosts).map((host) => {
            var connection = remoteHosts[host];

            var promise = tcp.signalDoneOver(connection)
            promise.then(() => tcp.disconnectFrom(connection.path, connection.port));

            return promise;
        });

        Promise.all(donePromises)
        .then(() => {
            router.clear();
            socket.end();
        })
        .catch((error) => {/* TODO: ABORT or any other error handler */});
    });
});

localIPC.server.start();
tcp.start();
