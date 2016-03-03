var ipc = require('node-ipc');
var cp = require('child_process');

// ipc configurations
ipc.config.retry = 1000;
ipc.config.maxRetries = 0;
ipc.config.silent = true;

var _timer = null;  // holds the timeout timer

/*
 * starts a timeout timer
 * @param resolve {Function}: the enclosing promise's resolve method
 */
function _start_timeout(resolve) {
    _timer = setTimeout(function() {
        resolve(false);
        ipc.disconnect('klyng_beacon');
    }, 2000);
};

/*
 * stops a running timeout timer
 */
function _stop_timeout() {
    clearTimeout(_timer);
}

/*
 * checks if the beacon is already running or not and opens an ipc socket to it
 * @return {Promise}: a promise of the boolean status value - true if running, false otherwise
 */
function checkIfRunning() {

    return new Promise(function(resolve, reject) {

        ipc.connectTo('klyng_beacon', function() {

            ipc.of.klyng_beacon.emit('PROBE:MSG', {});

            _start_timeout(resolve);

            ipc.of.klyng_beacon.on('ALIVE:MSG', function(data) {
                _stop_timeout();
                resolve(true);
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

    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            checkIfRunning() // this will open a new socket
            .then(function(running) {
                resolve(running);
            });
        }, 500);
    });
}

/*
 * stops the running beacon process
 * @return {Promise}: a promise for a boolean status vale - true if the beacon stopped successfully, false otherwise
 */
function stop() {
    return new Promise(function(resolve, reject) {

        ipc.of.klyng_beacon.emit('STOP:MSG', {});

        _start_timeout(resolve);

        ipc.of.klyng_beacon.socket.on('end', function() {
            ipc.disconnect('klyng_beacon');

            _stop_timeout();
            resolve(true);
        });
    });
 }

/*
 * signals a started beacon to run a given job
 * @param job {Object}: the job's description
 * @return {Promise}: a promise of boolean/string status value : {'available', 'busy', false (indicates network error)}
 */
function signalToRun(job) {
    return new Promise(function(resolve, reject) {

        ipc.of.klyng_beacon.emit('SIGNAL:RUN', {job_specs:job});
        _start_timeout(resolve);

        ipc.of.klyng_beacon.on('SIGNAL:CONFIRM', function(data) {
            _stop_timeout();
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
         _start_timeout(resolve);

         ipc.of.klyng_beacon.socket.on('end', function() {
             ipc.disconnect('klyng_beacon');
             _stop_timeout();

             resolve(true);
         });
     });
 }

// exporting the controller methods
module.exports = {
    checkIfRunning: checkIfRunning,
    start: start,
    stop: stop,
    signalToRun: signalToRun,
    signalDone: signalDone
};
