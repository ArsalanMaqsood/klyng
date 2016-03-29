var ipc = require('node-ipc');
var router = require('../../../lib/router.js');
var runner = require('../../../lib/jobs-runner.js');
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

describe('Beacon\'s Jobs Runner', function() {

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

            var job = {size: 2, startId: 1, app: './tests/fixtures/beacon/runner-fake-job.js'};

            runner.runLocally(job);

            Promise.all([fake_parent_exit, fake_instance_exit]).then(function() {
                expect(fake_parent_stdout).to.equal("Hello from Fake");
                expect(fake_instance_stdout).to.equal("Fake Hello");
                done();
            });
        });
    });

    it('packs an app correctly', function() {
        var descriptor = runner.pack({app: './tests/fixtures/beacon/fake_app/main.js'});

        expect(descriptor.entry).to.equal('main.js');

        var packg = zipper.sync.unzip(new Buffer(descriptor.data, "base64")).memory();
        var packg_contents = packg.contents();

        expect(packg_contents.length).to.equal(3);
        expect(packg_contents).to.include('main.js');
        expect(packg.read('main.js', 'text').trim()).to.equal("var klyng = require('klyng');");
        expect(packg_contents).to.include('_modules/_fiber.js');
        expect(packg.read('_modules/_fiber.js', 'text').trim()).to.equal('Fiber!');
        expect(packg_contents).to.include('_modules/_klyng.js');
        expect(packg.read('_modules/_klyng.js', 'text').trim()).to.equal('Klyng!');
    });

    it('unpacks an app correctly', function(done) {
        runner.unpack({
            entry: "main.js",
            data: fs.readFileSync("./tests/fixtures/beacon/fake_app.zip", {encoding: "base64"})
        })
        .then(function(app) {
            var parsed = path.parse(app);
            expect(parsed.base).to.equal("main.js");
            expect(fs.readFileSync(app, {encoding: "utf8"}).trim()).to.equal("var klyng = require('klyng');");
            expect(fs.readFileSync(parsed.dir + "/_modules/_fiber.js", {encoding: "utf8"}).trim()).to.equal('Fiber!');
            expect(fs.readFileSync(parsed.dir + "/_modules/_klyng.js", {encoding: "utf8"}).trim()).to.equal('Klyng!');
            done();
        })
        .catch(done);
    });

    it('divides a job over given hosts correctly', function() {
        var fake_job = {
            hosts: {
                "local": 2,
                "192.168.0.100@2222:": 5,
                "192.168.0.58@2222:": 4
            },
            size: 11
        };

        var plan = runner.divide(fake_job);
        expect(plan[0].location).to.equal("local");
        expect(plan[0].count).to.equal(2);
        expect(plan[2].location).to.equal("192.168.0.58@2222");
        expect(plan[2].count).to.equal(4);
        expect(plan[6].location).to.equal("192.168.0.1000@2222");
        expect(plan[6].count).to.equal(5);
    });

});
