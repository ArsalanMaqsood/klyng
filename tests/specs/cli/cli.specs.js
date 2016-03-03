var spawn = require('child_process').spawn;
var expect = require('chai').expect;
var beacon = require('../../../lib/beacon-controller.js');

describe('Command Line Interface', function() {

    this.timeout(5000);

    it('runs the cli with no options', function(done) {
        var cli = spawn('node', ['./bin/main.js']);
        var cli_stdout = [];
        cli.stdout.on('data', function(chunck){ cli_stdout.push(chunck.toString().trim()); });

        cli.on('exit', function() {
            expect(cli_stdout).to.deep.equal([
                'You didn\'t specify any options.',
                'Run (klyng --help) for more info.'
            ]);
            done();
        });
    });

    it('runs the cli with -u option while the beacon is down', function(done) {
        var cli = spawn('node', ['./bin/main.js', '-u']);
        var cli_stdout = [];
        cli.stdout.on('data', function(chunck){ cli_stdout.push(chunck.toString().trim()); });

        cli.on('exit', function() {
            expect(cli_stdout).to.deep.equal(['The beacon is now up and listening.']);
            done();
        });
    });

    it('runs the cli with -u option while the beacon is up', function(done) {
        var cli = spawn('node', ['./bin/main.js', '-u']);
        var cli_stdout = [];
        cli.stdout.on('data', function(chunck){ cli_stdout.push(chunck.toString().trim()); });

        cli.on('exit', function() {
            expect(cli_stdout).to.deep.equal(['The beacon is already up and listening.']);
            done();
        });
    });

    it('runs the cli with -d option while the beacon is up', function(done) {
        var cli = spawn('node', ['./bin/main.js', '-d']);
        var cli_stdout = [];
        cli.stdout.on('data', function(chunck){ cli_stdout.push(chunck.toString().trim()); });

        cli.on('exit', function() {
            expect(cli_stdout).to.deep.equal(['The beacon is now down.']);
            done();
        });
    });

    it('runs the cli with -d option while the beacon is down', function(done) {
        var cli = spawn('node', ['./bin/main.js', '-d']);
        var cli_stdout = [];
        cli.stdout.on('data', function(chunck){ cli_stdout.push(chunck.toString().trim()); });

        cli.on('exit', function() {
            expect(cli_stdout).to.deep.equal(['The beacon is not up.']);
            done();
        });
    });

    it('runs the cli with a job while the beacon is down', function(done) {
        var cli = spawn('node', ['./bin/main.js', '-n', 1, './tests/fixtures/beacon/runner-fake-job.js']);
        var cli_stdout = [];
        cli.stdout.on('data', function(chunck){ cli_stdout.push(chunck.toString().trim()); });

        cli.on('exit', function() {
            expect(cli_stdout).to.deep.equal(['Hello from Fake']);
            done();
        });
    });

    it('runs the cli with a job while the beacon is up', function(done) {
        var cli = spawn('node', ['./bin/main.js', '-n', 1, './tests/fixtures/beacon/runner-fake-job.js']);
        var cli_stdout = [];
        cli.stdout.on('data', function(chunck){ cli_stdout.push(chunck.toString().trim()); });

        cli.on('exit', function() {
            expect(cli_stdout).to.deep.equal(['Hello from Fake']);
            done();
        });
    });

    after(function(done) {
        beacon.checkIfRunning()
        .then(function() {return beacon.stop();})
        .then(function() {
            done();
        });
    });

});
