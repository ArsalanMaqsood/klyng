var ipc = require('node-ipc');
var router = require('../../../lib/router.js');
var runner = require('../../../lib/jobs-runner.js');
var expect = require('chai').expect;
var spawn = require('child_process').spawn;

// FAKE: ipc socket server
ipc.config.silent = true;
ipc.config.id = 'FAKE';
ipc.config.retry = 1500;

describe('Beacon\'s Jobs Runner', function() {

    before(function() {
        ipc.serve(function(){
            ipc.server.on('message', function(msg) {});
        });
        ipc.server.start();
    });

    after(function() {
        ipc.server.stop();
    });

    it('runs a job locally and mediates communication between processes', function(done) {
        var fake_parent = spawn('node', ['./tests/fixtures/beacon/router-ipc-client.js']);
        var fake_parent_stdout = "";
        fake_parent.stdout.on('data', function(chunck) { fake_parent_stdout += chunck.toString().trim(); });
        var fake_parent_exit = new Promise(function(resolve, reject) {
            fake_parent.on('exit', function(){resolve();});
        });

        // wait for a message from the fake client announcing its ipc socket
        ipc.server.on('SOCKET:PUB', function(data, socket) {
            // set the meta table and monitor_socket
            router.setMetaTable(router.buildPureLocalTable(2));
            router.setMonitorSocket(socket);

            var fake_instance = spawn('node', ['./tests/fixtures/beacon/router-local-process.js'], {stdio: [null, null, null, 'ipc']});
            var fake_instance_stdout = "";
            fake_instance.stdout.on('data', function(chunck) { fake_instance_stdout += chunck.toString().trim(); });
            var fake_instance_exit = new Promise(function(resolve, reject) {
                fake_instance.on('exit', function(){resolve();});
            });
            router.setLocalChannel(0, fake_instance);

            var job = {size: 2, startId: 1, app: './tests/fixtures/beacon/runner-fake-job.js'};

            runner.runLocally(job);

            Promise.all([fake_parent_exit, fake_instance_exit]).then(function() {
                expect(fake_parent_stdout).to.equal("Hello from Fake");
                expect(fake_instance_stdout).to.equal("Fake Hello");
                done();
            });
        });
    });

});
