var tcp = require('../../../lib/tcp');
var expect = require('chai').expect;
var spawn = require('child_process').spawn;

var configs = require('../../../lib/beacon-configs');

describe("Beacon Remote Communincation", function() {

    this.timeout(7000);

    it('connects/disconnects to/from a running tcp server', function(done) {

        var fake_server = spawn('node', ['./tests/fixtures/beacon/fake-tcp-server.js']);

        setTimeout(function() {
            tcp.connectTo('127.0.0.1', 4895)
            .then(function(connection) {
                expect(!!connection).to.equal(true);
                expect(connection.socket.destroyed).to.equal(false);
                tcp.disconnectFrom('127.0.0.1', 4895);
                expect(connection.socket.destroyed).to.equal(true);

                fake_server.kill();
                setTimeout(done, 1000);
            })
            .catch(function(err) {
                tcp.disconnectFrom('127.0.0.1', 4895);
                fake_server.kill();
                done(err);
            });
        }, 1000);
    });

    it('fails to connect to non-existing tcp server', function(done) {

        tcp.connectTo('127.0.0.1', 4895)
        .then(function(connection) {
            expect(!!connection).to.equal(true);
            done(new Error("This should never happen"));
        })
        .catch(function(err) {
            tcp.disconnectFrom('127.0.0.1', 4895);
            done();
        });
    });

    it('exchanges a shared secret key with tcp server', function(done) {

        var fake_server = spawn('node', ['./tests/fixtures/beacon/fake-tcp-server.js']);
        var fake_server_stdout = "";
        fake_server.stdout.on('data', function(chunck) { fake_server_stdout += chunck.toString().trim(); });

        tcp.connectTo('127.0.0.1', 4895)
        .then(function(connection) {
            return tcp.exchangeKeyOver(connection);
        })
        .then(function(params) {
            expect(params.secret).to.equal(fake_server_stdout);
            tcp.disconnectFrom('127.0.0.1', 4895);
            fake_server.kill();
            done();
        })
        .catch(function(err) {
            tcp.disconnectFrom('127.0.0.1', 4895);
            fake_server.kill();
            done(err);
        });
    });

    it('authorizes access to remote address with correct password', function(done) {

        var fake_server = spawn('node', ['./tests/fixtures/beacon/fake-tcp-server.js']);

        var con = null;

        tcp.connectTo('127.0.0.1', 4895)
        .then(function(connection) {
            con = connection;
            return tcp.exchangeKeyOver(connection);
        })
        .then(function(params) {
            return tcp.authOver(params.connection, params.secret, 'a1b2c3d4');
        })
        .then(function(params) {
            expect(params.status).to.equal(true);
            tcp.disconnectFrom('127.0.0.1', 4895);
            fake_server.kill();
            done();
        })
        .catch(function(err) {
            tcp.disconnectFrom('127.0.0.1', 4895);
            fake_server.kill();
            done(err);
        });
    });

    it('fails to authorize access to remote address due to wrong password', function(done) {

        var fake_server = spawn('node', ['./tests/fixtures/beacon/fake-tcp-server.js']);

        var con = null;

        tcp.connectTo('127.0.0.1', 4895)
        .then(function(connection) {
            con = connection;
            return tcp.exchangeKeyOver(connection);
        })
        .then(function(params) {
            return tcp.authOver(params.connection, params.secret, '12345678');
        })
        .then(function(params) {
            expect(params.status).to.equal(false);
            tcp.disconnectFrom('127.0.0.1', 4895);
            fake_server.kill();
            done();
        })
        .catch(function(err) {
            tcp.disconnectFrom('127.0.0.1', 4895);
            fake_server.kill();
            done(err);
        });
    });

    it('sends a job to a remote beacon', function(done) {
        var fake_server = spawn('node', ['./tests/fixtures/beacon/fake-tcp-server.js']);

        tcp.connectTo('127.0.0.1', 4895)
        .then(function(connection) {
            return tcp.exchangeKeyOver(connection);
        })
        .then(function(params) {
            return tcp.authOver(params.connection, params.secret, 'a1b2c3d4');
        })
        .then(function(params) {
            var job = {
                entry: 'main.js',
                data: 'packed.app',
                size: 11,
            };
            var plan = {
                "local": {count: 5, start: 0},
                "127.0.0.1@4895": {count: 4, start: 5},
                "127.0.0.2@2222": {count: 2, start: 9}
            };

            return tcp.sendJobOver(params.connection, params.secret, job, plan);
        })
        .then(function(sent) {
            if(sent) {
                tcp.disconnectFrom('127.0.0.1', 4895);
                fake_server.kill();
                done();
            }
        })
        .catch(function(err) {
            tcp.disconnectFrom('127.0.0.1', 4895);
            fake_server.kill();
            done(err);
        });
    });

});
