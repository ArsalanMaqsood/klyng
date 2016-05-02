var ipc = require('node-ipc');
var utils = require('./utils');
var configs = require('./beacon-configs');
var router = require('./router');
var jobman = require('./jobs-runner');

var remoteIPC = new ipc.IPC();
configs.configureRemoteIPC(remoteIPC);
ipc.klyngRemote = remoteIPC;


/*
 * connects to a remote beacon via ip:port
 * @param ip {String}
 * @param port {Number}
 * @return {Promise}: promise of the connection to be made
 */
function connectTo(ip, port) {
    return new Promise(function(resolve, reject) {
        var id = "sock_" + ip + ":" + port;

        remoteIPC.connectToNet(id, ip, port, function() {
            remoteIPC.of[id].on('connect', function() {
                resolve(remoteIPC.of[id]);
            });

            remoteIPC.of[id].on('error', function(error) {
                if(remoteIPC.of[id].retriesRemaining === 0) {
                    reject(error);
                }
            });
        });
    });
}

/*
 * disconnects from a remote beacon identified by ip:port
 * @param ip {String}
 * @param port {Number}
 */
function disconnectFrom(ip, port) {
    var id = "sock_" + ip + ":" + port;
    remoteIPC.disconnect(id);
}

/*
 * carries the key exchange process between the communicating nodes
 * @param connection {Socket}: the socket to between the nodes
 * @return {Promise}: a promise of the shared secret
 */
function exchangeKeyOver(connection) {
    return new Promise(function(resolve, reject) {
        var hostId = connection.path + ":" + connection.port;
        try {
            var dhObj = utils.diffieHellman();
            var sharedPrime = dhObj.prime;
            var publicKey = dhObj.publicKey;

            connection.emit('KEY-EXT:PARAMS', {prime: sharedPrime, key: publicKey});
            connection.on('KEY-EXT:PUBLIC', function(data) {
                if(!data.error) {
                    var sharedSecret = dhObj.computeSecret(data.key);
                    resolve({connection: connection, secret: sharedSecret});
                }
                else {
                    reject(new Error(hostId + " " + data.error));
                }
            });
        }
        catch(error) { reject(new Error(hostId + " " + error.message)); }
    });
}

/*
 * authenticates and authorize access to remote node with password
 * @param connection {Socket}: the socket connecting to the remote node
 * @param secret {String}: the encryption seceret key
 * @param passwd {String}: the remote node password
 * @return {Promise}
 */
function authOver(connection, secret, passwd) {
    var hostId = connection.path + ":" + connection.port;
    return new Promise(function(resolve, reject) {
        try {
            connection.emit('AUTH', utils.secure({data: passwd}, secret));
            connection.on('AUTH:STATUS', function(data) {
                if(data.status) {
                    resolve({connection: connection, secret: secret});
                }
                else {
                    reject(new Error(hostId + " " + data.error));
                }
            });
        }
        catch(error) { reject(new Error(hostId + " " + error.message)); }
    });
}

/*
 * sends a job descriptor securly to a remote beacon over a given connection
 * @param connection {Socket}: the socket connection to the remote node
 * @param secret {String}: the encryption secret key
 * @param job {Object}: the job descriptor object
 * @param plan {Object}: the job plan object
 * @return {Promise}
 */
function sendJobOver(connection, secret, job, plan) {
    var hostId = connection.path + ":" + connection.port;
    return new Promise(function(resolve, reject) {

        var target_params = connection.path + ":" + connection.port;
        var modified_plan = {};

        for(var host in plan) {
            if(host === "local") {
                // replace local with parent to refer to the parent node in target node
                var boundPort = !!remoteIPC.server ? remoteIPC.server.port : configs.klyngConfigs.port;
                modified_plan.parent = plan.local;
                modified_plan.parent.port = boundPort;
            }
            else if(host === target_params) {
                // replace the target node params in the plan with local
                modified_plan.local = plan[host];
            }
            else {
                // keep irrelevant hosts intact
                modified_plan[host] = plan[host];
            }
        }

        job.plan = modified_plan;

        try {
            connection.emit('KLYNG:JOB', utils.secure({data: job}, secret));
            connection.on('JOB:ACK', function(data) {
                if(!data.status) {
                    reject(new Error(hostId + " " + data.error));
                }
                else {
                    resolve(true);
                }
            });
        }
        catch(error) { reject(new Error(hostId + " " + error.message)); }
    });
}

/*
 * sends a DONE signal to a remote beacon over a given connection
 * @param connection {Socket}: the socket connecting to the remote beacon
 * @return {Promise}
 */
function signalDoneOver(connection) {
    var hostId = connection.path + ":" + connection.port;
    return new Promise(function(resolve, reject) {
        connection.emit('SIGNAL:DONE', {});
        connection.on('DONE:ACK', function(data) {
            if(data.status) {
                resolve(true);
            }
            else {
                reject(new Error(hostId + " " + data.error));
            }
        });
    });
}

/*
 * sends an ABORT signal to a remote beacon over a given connection
 * @param connection {Socket}: the socket connecting to the remote beacon
 * @param reason {String}: the abortion reason
 */
function signalAbortOver(connection) {
    connection.emit('SIGNAL:ABORT', {});
}

/*
 * starts the beacon's tcp server
 * @param _configs {Object}: An optional configurations object to override configs.json
 */
function start(_configs) {

    var configurations = _configs || configs.klyngConfigs;

    remoteIPC.serveNet('0.0.0.0', configurations.port, function() {

        // listner for key exchange process initiation
        remoteIPC.server.on('KEY-EXT:PARAMS', function(data, socket) {
            try {
                var dhObj = utils.diffieHellman(data.prime);
                var publicKey = dhObj.publicKey;

                // store the secret in the socket object
                socket.klyng_secret = dhObj.computeSecret(data.key);

                remoteIPC.server.emit(socket, 'KEY-EXT:PUBLIC', {
                    key: publicKey,
                    cipherWelcome: utils.secure("Hello from Beacon's TCP Server!", socket.klyng_secret)
                });
            }
            catch(error) {
                remoteIPC.server.emit(socket, 'KEY-EXT:PUBLIC', {error: error.message});
            }
        });

        // listner for password auth messages
        remoteIPC.server.on('AUTH', function(data, socket) {
            if(!!socket.klyng_secret) {
                var errorMessage = "";
                var attemptPassword;

                try {
                    attemptPassword = utils.verify(data, socket.klyng_secret);
                }
                catch(error) {errorMessage = error.message;}

                if(!!attemptPassword && !errorMessage) {
                    if(attemptPassword.data === configurations.password) {
                        socket.klyng_authorized = true;
                        remoteIPC.server.emit(socket, 'AUTH:STATUS', {status: true});
                        return;
                    }
                    else {
                        errorMessage = "incorrect password";
                    }
                }
                else {
                    errorMessage = "corrupted data";
                }
            }
            else {
                errorMessage = "unsecure channel";
            }

            remoteIPC.server.emit(socket, 'AUTH:STATUS', {status: false, error: errorMessage});
        });

        // listner for a job
        remoteIPC.server.on('KLYNG:JOB', function(data, socket) {
            var errorMessage = "";
            if(!!socket.klyng_secret && !!socket.klyng_authorized) {
                if(router.isClean()) {
                    var decrypted;
                    try {
                        decrypted = utils.verify(data, socket.klyng_secret);
                    }
                    catch(error) { errorMessage = error.message; }

                    if(!!decrypted && !errorMessage) {

                        remoteIPC.server.emit(socket, 'JOB:ACK', {status: true});

                        var job = decrypted.data;

                        // save the job in the socket object to be able to mark
                        // it as aborted later if neccessary
                        socket.klyng_job = job;

                        // modify the parent field in job's plan with the remoteAddress
                        job.plan.parent.isParent = true;
                        var parentPort = job.plan.parent.port;
                        job.plan[socket.remoteAddress + ":" + parentPort] = job.plan.parent;
                        delete job.plan.parent;

                        // connect early to the monitor_socket
                        connectTo(socket.remoteAddress, parentPort)
                        .then((connection) => {
                            var id = socket.remoteAddress + ":" + parentPort;
                            router.setMonitorSocket(connection);
                            router.setRemoteChannel(id, connection);
                        })
                        .then(() => {
                            var hosts = Object.keys(job.plan).filter(
                                (host) => host !== "local" && !job.plan[host].isParent
                            );

                            // attempt to connect to all listed hosts
                            var connectionPromises = hosts.map((host) => {
                                var creds = host.split(":");
                                return connectTo(creds[0], parseInt(creds[1]));
                            });

                            return Promise.all(connectionPromises)
                        })
                        .then((connections) => {
                            connections.forEach((connection) => {
                                var hostid = connection.path + ":" + connection.port;
                                router.setRemoteChannel(hostid, connection);
                                if(job.plan[hostid].isParent) {
                                    router.setMonitorSocket(connection);
                                }
                            });
                        })
                        .then(() => {
                            var metatable = router.buildTableFromPlan(job.plan, false);
                            router.setMetaTable(metatable);

                            if(!job.aborted) {
                                return jobman.unpack(job.app);
                            }
                        })
                        .then((app_path) => {
                            var localWork = {
                                app: app_path,
                                size: job.size,
                                subsize: job.plan.local.count,
                                start: job.plan.local.start
                            };

                            if(!job.aborted) {
                                jobman.runLocally(localWork);
                            }
                        })
                        .catch((error) => jobman.abort(error.message));

                        return;
                    }
                    else {
                        errorMessage = "corrupted data";
                    }
                }
                else {
                    errorMessage = "The Beacon is busy";
                }
            }
            else {
                errorMessage = "Unauthorized";
            }

            // in case of error
            remoteIPC.server.emit(socket, 'JOB:ACK', {status: false, error: errorMessage});
        });

        // listner for klyng messages
        remoteIPC.server.on('KLYNG:MSG', function(msg, socket) {
            router.routeTo(msg.header.to, msg);
        });

        // listner for monitor messages
        remoteIPC.server.on('MONITOR:MSG', function(msg, socket) {
            var hostId = socket.remoteAddress;
            if(msg.type !== "job:aborted") {
                router.routeToParent(msg);
            }
            else if(msg.reason !== "SIGNALED") {
                // in case parent got a job:aborted mesaage and the reason is not
                // that it was signaled by the parent to abort, this would mean that
                // some node failed and the parent should notify all others nodes
                // and abort the whole job
                var remoteHosts = router.getRemoteChannels();
                for(var host in remoteHosts) {
                    var connection = remoteHosts[host];
                    signalAbortOver(connection);
                }

                // then abort its own and report back to the runner
                jobman.abort(hostId + " " + msg.reason);
            }
        });

        // listner for done signal
        remoteIPC.server.on('SIGNAL:DONE', function(data, socket) {
            var errorMessage = "";
            if(!!socket.klyng_secret && !!socket.klyng_authorized) {
                var connectedHosts = Object.keys(router.getRemoteChannels());

                connectedHosts.forEach((hostid) => remoteIPC.disconnect(hostid));

                router.clear();
                remoteIPC.server.emit(socket, 'DONE:ACK', {status: true});
                return;
            }
            else {
                errorMessage = "Unauthorized";
            }

            remoteIPC.server.emit(socket, 'DONE:ACK', {status: false, error: errorMessage});
        });

        // listner for abort signal
        remoteIPC.server.on('SIGNAL:ABORT', function(data, socket) {
            if(!!socket.klyng_secret && !! socket.klyng_authorized) {
                if(!!socket.klyng_job) {
                    socket.klyng_job.aborted = true;
                }

                jobman.abort('SIGNALED');
            }
        });

    });
    remoteIPC.server.start();
}

/*
 * stops the beacon's tcp server
 */
function stop() {
    remoteIPC.server.stop();
}

module.exports = {
    connectTo: connectTo,
    disconnectFrom: disconnectFrom,
    exchangeKeyOver: exchangeKeyOver,
    authOver: authOver,
    sendJobOver: sendJobOver,
    signalDoneOver: signalDoneOver,
    signalAbortOver: signalAbortOver,
    start: start,
    stop: stop
};
