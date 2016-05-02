var ipc = require('node-ipc');
var cp = require('child_process');

/*
 * checks if the beacon is already running or not and opens an ipc socket to it
 * @return {Promise}: a promise of the boolean status value - true if running, false otherwise
 */
function checkIfRunning() {

    return new Promise(function(resolve, reject) {

        ipc.connectTo('klyng_beacon', function() {

            ipc.of.klyng_beacon.on('connect', function() {
                resolve(true);
            });

            ipc.of.klyng_beacon.on('error', function(err) {
                if(ipc.of.klyng_beacon.retriesRemaining === 0) {
                    resolve(false);
                }
            });
        });
    });
}

/*
 * starts the beacon process in the background
 * @return {Promise}: a promise of a boolean status value - true if the beacon started successfully, false otherwise
 */
function start() {

    // close open socket if exists
    if(!!ipc.of.klyng_beacon)
        ipc.disconnect('klyng_beacon');

    var beacon_daemon = cp.spawn('node', ['lib/beacon.js'], {detached: true, stdio: 'ignore'});
    beacon_daemon.unref();

    return checkIfRunning() ;
}

/*
 * stops the running beacon process
 * @return {Promise}: a promise for a boolean status vale - true if the beacon stopped successfully, false otherwise
 */
function stop() {

    var stop = new Promise(function(resolve, reject) {
        ipc.of.klyng_beacon.emit('STOP:MSG', {});
        ipc.of.klyng_beacon.socket.on('end', function() {
            ipc.disconnect('klyng_beacon');
            setTimeout(resolve, 100);  // wait for the beacon to fully close
        });
    })
    .then(function() {
        return checkIfRunning();
    })
    .then(function(running) {
        return !running;
    });

    return stop;
 }

/*
 * signals a started beacon to run a given job
 * @param job {Object}: the job's description
 * @return {Promise}: a promise of boolean/string status value : {'available', 'busy', false (indicates network error)}
 */
function signalToRun(job) {
    return new Promise(function(resolve, reject) {

        ipc.of.klyng_beacon.emit('SIGNAL:RUN', {job_specs:job});

        ipc.of.klyng_beacon.on('SIGNAL:CONFIRM', function(data) {
            resolve(data.status);
        });
    });
}

/*
 * signals the beacon indicating the job is done
 * so that the beacon can clear the data structures for the next job
 * @return {Promise}: a promise for a boolean status value
 */
 function signalDone() {
     return new Promise(function(resolve, reject) {
         ipc.of.klyng_beacon.emit('SIGNAL:DONE', {});

         ipc.of.klyng_beacon.socket.on('end', function() {
             ipc.disconnect('klyng_beacon');
             resolve(true);
         });
     });
 }

/*
 * sends the beacon with an abort signal
 */
function signalAbort() {
    ipc.of.klyng_beacon.emit('SIGNAL:ABORT', {});
}

// exporting the controller methods
module.exports = {
    checkIfRunning: checkIfRunning,
    start: start,
    stop: stop,
    signalToRun: signalToRun,
    signalDone: signalDone,
    signalAbort: signalAbort
};
