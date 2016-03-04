var tcp = require('../../../lib/tcp');
var expect = require('chai').expect;
var spawn = require('child_process').spawn;

describe("Beacon Remote Communincation", function() {

    this.timeout(5000);

    it('connects/disconnects to/from a running tcp server', function(done) {

        var fake_server = spawn('node', ['./tests/fixtures/beacon/fake-tcp-server.js']);

        tcp.connectTo('127.0.0.1', 4895)
        .then(function(connection) {
            expect(!!connection).to.equal(true);
            expect(connection.socket.destroyed).to.equal(false);
            tcp.disconnectFrom('127.0.0.1', 4895);
            expect(connection.socket.destroyed).to.equal(true);

            fake_server.kill();
            done();
        })
        .catch(done);
    });

    it('fails to connect to non-existing tcp server', function(done) {

        tcp.connectTo('127.0.0.1', 4895)
        .then(function(connection) {
            expect(connection).to.equal(false);
            done();
        })
        .catch(done);
    });

});
