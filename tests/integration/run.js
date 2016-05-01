var readline = require('readline');
var spawn = require('child_process').spawn;
var spawnSync = require('child_process').spawnSync;
var expect = require('chai').expect;

var startingPort = 8000;
var tcpBeaconsPath = __dirname + "/assets/tcp.only-beacon.js";
var jobPath = __dirname + "/assets/job.js";
var machinesWithLocalPath = __dirname + "/assets/machines.with.local.json";
var machinesWithoutLocalPath = __dirname + "/assets/machines.without.local.json";
var runnerPath = __dirname + "/../../bin/main.js";
var tcpBeacons = [];

before(function() {

    this.timeout(10000);

    process.stdout.write('  Running Remote Beacons ...');

    for(var i = 0; i < 2; ++i) {
        var semiRemoteBeacon = spawn('node', [tcpBeaconsPath, startingPort + i]);
        tcpBeacons.push(semiRemoteBeacon);
    }

    process.stdout.write(' Done!\n');
    process.stdout.write('  Restarting Local Beacon ...');

    spawnSync('node', [runnerPath, '-d']);
    spawnSync('node', [runnerPath, '-u']);

    process.stdout.write(' Done!\n\n');
});

after(function() {

    this.timeout(10000);

    process.stdout.write('  Stopping Remote Beacons ...');

    tcpBeacons.forEach((beacon) => beacon.kill());

    process.stdout.write(' Done!\n');
    process.stdout.write('  Stopping Local Beacon ...');

    spawnSync('node', [runnerPath, '-d']);

    process.stdout.write(' Done!\n\n');
});

describe("Klyng's Integartion tests", function() {

    this.timeout(10000);

    it('runs a job of size 6 on local and 2 remote hosts', function(done) {

        var parent = spawn('node', [runnerPath, '-n', 6, '-m', machinesWithLocalPath, jobPath]);
        var parentStdout = [];

        var stdoutRlInterface = readline.createInterface({input: parent.stdout});

        stdoutRlInterface.on('line', (line) => {
            parentStdout.push(line);
        });

        parent.stderr.on('data', (chunk) => {
            console.log(chunk.toString().trim());
        });

        parent.on('exit', () => {
            for(var i = 0; i < 6; ++i) {
                for(var j = 0; j < 6; j++) {
                    if(i !== j) {
                        var msg = "Greetings P" + i + " from P" + j;
                        expect(parentStdout).to.include(msg);
                    }
                }
            }
            done();
        });
    });

    it('runs a job of size 6 on 2 remote hosts', function(done) {

        var parent = spawn('node', [runnerPath, '-n', 6, '-m', machinesWithoutLocalPath, jobPath]);
        var parentStdout = [];

        var stdoutRlInterface = readline.createInterface({input: parent.stdout});

        stdoutRlInterface.on('line', (line) => {
            parentStdout.push(line);
        });

        parent.stderr.on('data', (chunk) => {
            console.log(chunk.toString().trim());
        });

        parent.on('exit', () => {
            for(var i = 0; i < 6; ++i) {
                for(var j = 0; j < 6; j++) {
                    if(i !== j) {
                        var msg = "Greetings P" + i + " from P" + j;
                        expect(parentStdout).to.include(msg);
                    }
                }
            }
            done();
        });
    });
});
