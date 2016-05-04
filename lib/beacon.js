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

            // handle abrupt monitor_socket closure
            socket.on('close', () => {
                if(!socket.ignore_closure) {
                    // send ABORT signals to all remote beacons
                    var remoteHosts = router.getRemoteChannels();
                    for(var host in remoteHosts) {
                        var connection = remoteHosts[host];
                        if(!connection.socket.destroyed)
                            tcp.signalAbortOver(connection);
                    }

                    // abort everything on this machine
                    runner.abort("Lost connection to runner process");
                }
            });

            var job = data.job_specs;

            if(!job.hosts) {
                var routingTable = router.buildPureLocalTable(job.size);
                router.setMetaTable(routingTable);
                job.start = 0;
                job.subsize = job.size;

                runner.runLocally(job);
            }
            else {
                var rDescriptor;
                var plan = runner.divide(job);

                // ensure that local exists in the plan to refer to the parent
                plan.local = plan.local || {count: 0};

                var table = router.buildTableFromPlan(plan, true);
                router.setMetaTable(table);

                runner.pack(job)
                .then((appPckg) => {

                    // the job descriptor for remote beacons
                    rDescriptor = {
                        app: appPckg,
                        size: job.size,
                        plan: plan
                    };

                    var remoteHosts = Object.keys(job.hosts).filter((host) => host !== "local");

                    var connectPromises = remoteHosts.map((host) => {
                        var creds = host.split(":");
                        return tcp.connectTo(creds[0], parseInt(creds[1]));
                    });

                    return Promise.all(connectPromises);
                })
                .then((connections) => {
                    connections.forEach((connection) => {
                        // save id and password for later use
                        connection.id = connection.path + ":" + connection.port;
                        connection.password = job.hosts[connection.id].password;

                        router.setRemoteChannel(connection.id, connection);
                    });

                    return connections;
                })
                .then((connections) => {
                    var keyPromises = connections.map((connection)  => tcp.exchangeKeyOver(connection));
                    return Promise.all(keyPromises);
                })
                .then((paramsList) => {
                    var authPromises = paramsList.map(
                        (params) => tcp.authOver(params.connection, params.secret, params.connection.password)
                    );
                    return Promise.all(authPromises);
                })
                .then((paramsList) => {
                    var jobPromises = paramsList.map(
                        (params) => tcp.sendJobOver(params.connection, params.secret, rDescriptor, plan)
                    );
                    return Promise.all(jobPromises);
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
                .catch((error) => {
                    // send ABORT signals to all remote beacons
                    var remoteHosts = router.getRemoteChannels();
                    for(var host in remoteHosts) {
                        var connection = remoteHosts[host];
                        if(!connection.socket.destroyed)
                            tcp.signalAbortOver(connection);
                    }

                    // abort everything on this machine
                    runner.abort(error.message);
                })
            }
        }
        else {
            localIPC.server.emit(socket, 'SIGNAL:CONFIRM', {status: 'busy'});
        }
    });

    localIPC.server.on('SIGNAL:DONE', function(data, socket) {

        // by now the job should have completed successfully
        // and the nodes are about to disconnect form each other
        // and clear their data structures (either by the DONE signals or
        // by ABORT signals if any error occured in the porcess)
        // so now, aborting to monitor_socket errors is redundent
        router.ignoreMonitorSocketErrors();

        var remoteHosts = router.getRemoteChannels();
        var donePromises = Object.keys(remoteHosts).map((host) => {
            var connection = remoteHosts[host];

            return tcp.signalDoneOver(connection)
        });

        Promise.all(donePromises)
        .then(() => {
            Object.keys(remoteHosts).forEach((host) => {
                var connection = remoteHosts[host];
                tcp.disconnectFrom(connection.path, connection.port);
            });
        })
        .then(() => {
            router.clear();
            socket.end();
        })
        .catch((error) => {
            // send ABORT signals to all remote beacons
            var remoteHosts = router.getRemoteChannels();
            for(var host in remoteHosts) {
                var connection = remoteHosts[host];
                if(!connection.socket.destroyed)
                    tcp.signalAbortOver(connection);
            }

            // abort everything on this machine
            runner.abort(error.message);
        });
    });

    localIPC.server.on('SIGNAL:ABORT', function(data, socket) {
        // send ABORT signals to all remote beacons
        var remoteHosts = router.getRemoteChannels();
        for(var host in remoteHosts) {
            var connection = remoteHosts[host];
            if(!connection.socket.destroyed)
                tcp.signalAbortOver(connection);
        }

        // abort everything on this machine
        runner.abort("Keyboard Interrupt");
    });

});

localIPC.server.start();
tcp.start();
