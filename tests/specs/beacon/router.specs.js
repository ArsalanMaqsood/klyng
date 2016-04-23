var ipc = require('node-ipc');
var router = require('../../../lib/router.js');
var expect = require('chai').expect;
var spawn = require('child_process').spawn;

// FAKE: ipc socket server
ipc.config.silent = true;
ipc.config.id = 'FAKE';
ipc.config.retry = 1500;

describe('Beacon\'s Router', function() {

    before(function() {
        ipc.serve(function(){
            ipc.server.on('message', function(msg) {});
        });
        ipc.server.start();
    });

    after(function() {
        ipc.server.stop();
    });

    it('builds a pure local meta routing table', function() {
        var table = router.buildPureLocalTable(1);
        expect(table.proc0).to.equal('local');
        expect(table.parent).to.equal('local');
    });

    it('builds a meta routing table from a given plan', function() {

        var plan = {
            local: { count: 2, start: 0 },
            '192.168.0.100:2222': { count: 2, start: 2 },
            '192.168.0.58:2222': { count: 1, start: 4 }
        };

        var table = router.buildTableFromPlan(plan);

        expect(table.parent).to.equal('local');
        expect(table['proc0']).to.equal('local');
        expect(table['proc1']).to.equal('local');
        expect(table['proc2']).to.equal('192.168.0.100:2222');
        expect(table['proc3']).to.equal('192.168.0.100:2222');
        expect(table['proc4']).to.equal('192.168.0.58:2222');

    });

    it('routes a message correctly to local parent', function(done) {
        var fake_client = spawn('node', ['./tests/fixtures/beacon/router-ipc-client.js']);
        var fake_client_stdout = "";
        fake_client.stdout.on('data', function(chunck) { fake_client_stdout += chunck.toString().trim(); });

        // wait for a message from the fake client announcing its ipc socket
        ipc.server.on('SOCKET:PUB', function(data, socket) {
            // set the meta table and monitor_socket
            router.setMetaTable(router.buildPureLocalTable(1));
            router.setMonitorSocket(socket);

            router.routeToParent({type: 'process:exit', data: {line: "Hello from router"}});

            fake_client.on('exit', function() {
                expect(fake_client_stdout).to.equal("Hello from router");
                done();
            });
        })
    });

    it('routes a monitor message correctly to a remote beacon', function(done) {
        var fake_parent = spawn('node', ['./tests/fixtures/beacon/fake-tcp-server.js']);
        var fake_parent_stdout = "";
        fake_parent.stdout.on('data', function(chunck) { fake_parent_stdout += chunck.toString().trim(); });

        setTimeout(function() {
            // clear router from past test and set metadata to refer to a tcp parent
            router.clear();
            router.setMetaTable({parent: "127.0.0.1:4895"});

            ipc.connectToNet('remote_parent', '127.0.0.1', 4895, function() {
                router.setMonitorSocket(ipc.of.remote_parent);

                router.routeToParent({type: 'process:exit', data: {line: "Hello remote from router"}});

                ipc.of.remote_parent.socket.on('end', function() { ipc.disconnect('remote_parent'); });
            });

            ipc.of.remote_parent.on('error', function(err) {
                ipc.disconnect('remote_parent');
                done(err);
            });

            fake_parent.on('exit', function() {
                expect(fake_parent_stdout).to.equal("Hello remote from router");
                done();
            });
        }, 1000);
    });

    it('rouets a message correctly to local job instance', function(done) {
        var fake_instance = spawn('node', ['./tests/fixtures/beacon/router-local-process.js'], {stdio: [null, null, null, 'ipc']});
        var fake_instance_stdout = "";
        fake_instance.stdout.on('data', function(chunck) { fake_instance_stdout += chunck.toString().trim() });

        // set the meta table and local channel
        router.setMetaTable(router.buildPureLocalTable(1));
        router.setLocalChannel(0, fake_instance);

        router.routeTo(0, {data: "Hello from router"});

        fake_instance.on('exit', function() {
            expect(fake_instance_stdout).to.equal("Hello from router");
            done();
        });
    });

    it('routes a message correctly to a remote beacon', function(done) {
        var fake_beacon = spawn('node', ['./tests/fixtures/beacon/fake-tcp-server.js']);
        var fake_beacon_stdout = "";
        fake_beacon.stdout.on('data', function(chunck){ fake_beacon_stdout += chunck.toString().trim(); });

        setTimeout(function() {
            router.clear();
            router.setMetaTable({ proc0: '127.0.0.1:4895' });

            ipc.connectToNet('remote_beacon', '127.0.0.1', 4895, function() {
                router.setRemoteChannel("127.0.0.1:4895", ipc.of.remote_beacon);

                router.routeTo(0, {data: "Hello remote from router"});

                ipc.of.remote_beacon.socket.on('end', function() { ipc.disconnect('remote_beacon'); });
            });

            ipc.of.remote_beacon.on('error', function(err) {
                ipc.disconnect('remote_beacon');
                done(err);
            });

            fake_beacon.on('exit', function() {
                expect(fake_beacon_stdout).to.equal("Hello remote from router");
                done();
            });
        }, 1000);
    });

    it('cleans the router\'s data structures', function() {
        expect(router.isClean()).to.equal(false);
        router.clear();
        expect(router.isClean()).to.equal(true);
    });

});
