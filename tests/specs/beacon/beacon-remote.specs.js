var tcp = require('../../../lib/tcp');
var expect = require('chai').expect;
var spawn = require('child_process').spawn;

describe("Beacon Remote Communincation", function() {

    it('connects/disconnects to/from a running tcp server', function(done) {

        var fake_server = spawn('node', ['./tests/fixtures/beacon/fake-tcp-server.js']);
        var fake_server_stdout = "";
        fake_server.stdout.on('data', function(chunck){ fake_server_stdout += chunck.toString().trim(); });

        tcp.connectTo('127.0.0.1', 4895)
        .then(function(connection) {
            expect(!!connection).to.equal(true);

            tcp.disconnectFrom('127.0.0.1', 4895);
            expect(!!connection).to.equal(false);

            fake_server.kill();
            done();
        });
    });

});
