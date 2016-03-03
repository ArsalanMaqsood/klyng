var ipc = require('node-ipc');
var spawn = require('child_process').spawn;
var expect = require('chai').expect;

ipc.config.silent = true;

describe('Beacon\'s Process', function() {

    //this.timeout(10000);

    var beacon_process = spawn('node', ['./lib/beacon.js']);
    var beacon_process_exit = new Promise(function(resolve, reject) {
        beacon_process.on('exit', function() {resolve();});
    });

    it('responds to \'PROBE:MSG\'', function(done) {
        setTimeout(function() {
            ipc.connectTo('klyng_beacon', function() {
                ipc.of.klyng_beacon.emit('PROBE:MSG', {});
                ipc.of.klyng_beacon.on('ALIVE:MSG', function() {
                    ipc.disconnect('klyng_beacon');
                    done();
                });
            });
        }, 500);
    });

    it('responds with available to \'SIGNAL:RUN\' message', function(done) {
        ipc.connectTo('klyng_beacon', function() {
            ipc.of.klyng_beacon.emit('SIGNAL:RUN', {job_specs: {size: 1, app: './tests/fixtures/beacon/runner-fake-job.js'}});
            ipc.of.klyng_beacon.on('SIGNAL:CONFIRM', function(msg) {
                expect(msg.status).to.equal('available');
                ipc.disconnect('klyng_beacon');
                done();
            });
        });
    });

    it('responds with busy to second \'SIGNAL:RUN\' message', function(done) {
        ipc.connectTo('klyng_beacon', function() {
            ipc.of.klyng_beacon.emit('SIGNAL:RUN', {job_specs: {size: 1, app: './tests/fixtures/beacon/runner-fake-job.js'}});
            ipc.of.klyng_beacon.on('SIGNAL:CONFIRM', function(msg) {
                ipc.disconnect('klyng_beacon');
                expect(msg.status).to.equal('busy');
                done();
            });
        });
    });

    it('responds to a \'SIGNAL:DONE\' message', function(done) {
        ipc.connectTo('klyng_beacon', function() {
            ipc.of.klyng_beacon.emit('SIGNAL:DONE', {});
            ipc.of.klyng_beacon.socket.on('end', function() {
                ipc.disconnect('klyng_beacon');
                done();
            });
        });
    });

    it('responds to a \'STOP:MSG\'', function(done) {
        ipc.connectTo('klyng_beacon', function() {
            ipc.of.klyng_beacon.emit('STOP:MSG', {});
            var socket_close = new Promise(function(resolve, reject) {
                ipc.of.klyng_beacon.socket.on('end', function() {
                    ipc.disconnect('klyng_beacon');
                    resolve();
                });
            });

            Promise.all([socket_close, beacon_process_exit]).then(function(){
                done();
            });
        });
    });

});
