var ipc = require('node-ipc');
var router = require('../../../lib/router.js');
var jobman = require('../../../lib/job-manager.js');
var expect = require('chai').expect;
var spawn = require('child_process').spawn;
var fs = require('fs');
var path = require('path');
var zipper = require('zip-local');
var rmrf = require('rimraf');

// FAKE: ipc socket server
ipc.config.silent = true;
ipc.config.id = 'FAKE';
ipc.config.retry = 1500;

describe('Beacon\'s Job Manager', function() {

    var globals = {};

    before(function(done) {
        ipc.serve(function(){
            ipc.server.on('message', function(msg) {});
        });
        ipc.server.start();

        rmrf('.unpacks', function(err) {
            done();
        });
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

            var job = {size: 2, subsize: 1, start: 1, app: './tests/fixtures/beacon/runner-fake-job.js'};

            jobman.runLocally(job);

            Promise.all([fake_parent_exit, fake_instance_exit]).then(function() {
                expect(fake_parent_stdout).to.equal("Hello from Fake");
                expect(fake_instance_stdout).to.equal("Fake Hello");
                done();
            });
        });
    });

    it('packs an app correctly', function(done) {
        jobman.pack({app: './tests/fixtures/beacon/fake_app/main.js'})
        .then(function(app) {
            var packg = zipper.sync.unzip(new Buffer(app.pckg, "base64")).memory();
            var packg_contents = packg.contents();
            expect(packg_contents.length).to.equal(1);
            expect(packg_contents).to.include('app_' + app.id +'.js');

            // save data for the next test
            globals.id = app.id;
            fs.writeFileSync("./tests/fixtures/beacon/fake_app.zip", app.pckg, "base64");

            done();
        })
        .catch(done);
    });

    it('unpacks an app correctly', function(done) {
        jobman.unpack({
            id: globals.id,
            pckg: fs.readFileSync("./tests/fixtures/beacon/fake_app.zip", {encoding: "base64"})
        })
        .then(function(app) {
            var unpacked_app = spawn('node', [app]);
            var unpacked_app_stdout = "";
            unpacked_app.stdout.on('data', function(chunck) {
                unpacked_app_stdout += chunck.toString().trim();
            });

            unpacked_app.on('exit', function() {
                expect(unpacked_app_stdout).to.equal("Local Dependency");
                done();
            })
        })
        .catch(done);
    });

    it('divides a job over given hosts correctly (perfect dist, no infinity host)', function() {
        // perfect dist means that job.size <= sum of hosts max processes
        var fake_job = {
            hosts: {
                "local": {max_procs: 2},
                "192.168.0.100:2222": {max_procs: 5, password: ""},
                "192.168.0.58:2222": {max_procs: 4, password: ""}
            },
            size: 11
        };

        var plan = jobman.divide(fake_job);
        expect(plan.local).to.exist;
        expect(plan.local.count).to.equal(2);
        expect(plan.local.start).to.equal(0);
        expect(plan["192.168.0.100:2222"]).to.exist;
        expect(plan["192.168.0.100:2222"].start).to.equal(2);
        expect(plan["192.168.0.100:2222"].count).to.equal(5);
        expect(plan["192.168.0.58:2222"]).to.exist;
        expect(plan["192.168.0.58:2222"].start).to.equal(7);
        expect(plan["192.168.0.58:2222"].count).to.equal(4);
    });

    it('divides a job over given hosts correctly (perfect dist, infinity host)', function() {
        var fake_job = {
            hosts: {
                "local": {max_procs: 2},
                "192.168.0.100:2222": {max_procs: 1, password: ""},
                "192.168.0.58:2222": {max_procs: Infinity, password: ""}
            },
            size: 11
        };

        var plan = jobman.divide(fake_job);
        expect(plan.local.count).to.equal(2);
        expect(plan["192.168.0.100:2222"].count).to.equal(1);
        expect(plan["192.168.0.58:2222"].count).to.equal(8);
    });

    it('divides a job over given hosts correctly (overallocation)', function() {
        var fake_job = {
            hosts: {
                "local": {max_procs: 2},
                "192.168.0.100:2222": {max_procs: 1, password: ""},
                "192.168.0.58:2222": {max_procs: 3, password: ""}
            },
            size: 9
        };

        var plan = jobman.divide(fake_job);
        expect(plan.local.count).to.equal(3);
        expect(plan["192.168.0.100:2222"].count).to.equal(2);
        expect(plan["192.168.0.58:2222"].count).to.equal(4);
    });

});
