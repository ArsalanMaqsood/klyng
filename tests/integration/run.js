var readline = require('readline');
var spawn = require('child_process').spawn;
var os = require('os').platform();
var spawnSync = require('child_process').spawnSync;
var expect = require('chai').expect;

var startingPort = 8000;
var tcpBeaconsPath = __dirname + "/assets/tcp.only-beacon.js";
var jobPath = __dirname + "/assets/job.js";
var badJobPath = __dirname + "/assets/bad.job.js";
var machinesWithLocalPath = __dirname + "/assets/machines.with.local.json";
var machinesWithoutLocalPath = __dirname + "/assets/machines.without.local.json";
var machinesWithWrongPass = __dirname + "/assets/machines.with.wrong.pass.json";
var runnerPath = __dirname + "/../../bin/main.js";
var beaconPath = __dirname + "/../../lib/beacon.js";
var tcpBeacons = [];
var localBeacon;

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
    localBeacon = spawn('node', [beaconPath]);

    process.stdout.write(' Done!\n\n');
});

after(function() {

    this.timeout(10000);

    process.stdout.write('  Stopping Remote Beacons ...');

    tcpBeacons.forEach((beacon) => beacon.kill());

    process.stdout.write(' Done!\n');
    process.stdout.write('  Stopping Local Beacon ...');

    //spawnSync('node', [runnerPath, '-d']);
    localBeacon.kill();

    process.stdout.write(' Done!\n\n');
});

describe("Klyng's Integartion tests", function() {

    this.timeout(15000);

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

    it('aborts when an error occurs during the job', function(done) {
        var parent = spawn('node', [runnerPath, '-n', 6, '-m', machinesWithWrongPass, jobPath]);
        var parentStderr = [];

        var stderrRlInterface = readline.createInterface({input: parent.stderr});
        stderrRlInterface.on('line', (line) => {
            parentStderr.push(line);
        });

        parent.on('exit', () => {
            expect(parentStderr).to.include('[Aborted]: 127.0.0.1:8000 incorrect password');

            // wait for a second for the beacons to clear there data structures
            setTimeout(done, 1500);
        });
    });

    it('ensures that the beacons aborted gracefully (by running a job)', function(done) {

        var parent = spawn('node', [runnerPath, '-n', 3, '-m', machinesWithLocalPath, jobPath]);
        var parentStdout = [];

        var stdoutRlInterface = readline.createInterface({input: parent.stdout});

        stdoutRlInterface.on('line', (line) => {
            parentStdout.push(line);
        });

        parent.stderr.on('data', (chunk) => {
            console.log(chunk.toString().trim());
        });

        parent.on('exit', () => {
            for(var i = 0; i < 3; ++i) {
                for(var j = 0; j < 3; j++) {
                    if(i !== j) {
                        var msg = "Greetings P" + i + " from P" + j;
                        expect(parentStdout).to.include(msg);
                    }
                }
            }
            done();
        });
    });

    it('aborts on keyboard interrupt (SIGINT)', function(done) {

        var spawnOptions = (os === "win32") ? {stdio: [null, null, null, 'ipc']} : {};

        var parent = spawn('node', [runnerPath, '-n', 3, '-m', machinesWithLocalPath, badJobPath], spawnOptions);
        var parentStdout = [];
        var parentStderr = [];

        var stdoutRlInterface = readline.createInterface({input: parent.stdout});
        var stderrRlInterface = readline.createInterface({input: parent.stderr});

        stderrRlInterface.on('line', (line) => {
            parentStderr.push(line);
        });

        stdoutRlInterface.on('line', (line) => {
            parentStdout.push(line);
        });


        setTimeout(() => os === "win32" ? parent.send('SIGINT') : parent.kill('SIGINT'), 5000);

        parent.on('exit', () => {
            for(var i = 0; i < 3; ++i) {
                for(var j = 0; j < 3; j++) {
                    if(i !== j) {
                        var msg = "Greetings P" + i + " from P" + j;
                        expect(parentStdout).to.include(msg);
                    }
                }
            }

            expect(parentStderr).to.include('[Aborted]: Keyboard Interrupt');

            // wait for a second for the beacons to clear there data structures
            setTimeout(done, 1500);
        });
    });

    it('ensures that the beacons aborted gracefully (by running a job)', function(done) {

        var parent = spawn('node', [runnerPath, '-n', 3, '-m', machinesWithLocalPath, jobPath]);
        var parentStdout = [];

        var stdoutRlInterface = readline.createInterface({input: parent.stdout});

        stdoutRlInterface.on('line', (line) => {
            parentStdout.push(line);
        });

        parent.stderr.on('data', (chunk) => {
            console.log(chunk.toString().trim());
        });

        parent.on('exit', () => {
            for(var i = 0; i < 3; ++i) {
                for(var j = 0; j < 3; j++) {
                    if(i !== j) {
                        var msg = "Greetings P" + i + " from P" + j;
                        expect(parentStdout).to.include(msg);
                    }
                }
            }
            done();
        });
    });

    it('aborts when one of the remote node is not up', function(done) {
        // kill node at :8001
        tcpBeacons[1].kill();

        var parent = spawn('node', [runnerPath, '-n', 3, '-m', machinesWithLocalPath, jobPath]);
        var parentStderr = [];

        var stderrRlInterface = readline.createInterface({input: parent.stderr});
        stderrRlInterface.on('line', (line) => {
            parentStderr.push(line);
        });

        parent.on('exit', () => {
            expect(parentStderr).to.include('[Aborted]: connect ECONNREFUSED 127.0.0.1:8001');

            // wait for a second for the beacons to clear there data structures
            setTimeout(done, 1500);
        });
    });

    it('ensures that the beacons aborted gracefully (by running a job)', function(done) {

        tcpBeacons[1] = spawn('node', [tcpBeaconsPath, 8001]);

        var parent = spawn('node', [runnerPath, '-n', 3, '-m', machinesWithLocalPath, jobPath]);
        var parentStdout = [];

        var stdoutRlInterface = readline.createInterface({input: parent.stdout});

        stdoutRlInterface.on('line', (line) => {
            parentStdout.push(line);
        });

        parent.stderr.on('data', (chunk) => {
            console.log(chunk.toString().trim());
        });

        parent.on('exit', () => {
            for(var i = 0; i < 3; ++i) {
                for(var j = 0; j < 3; j++) {
                    if(i !== j) {
                        var msg = "Greetings P" + i + " from P" + j;
                        expect(parentStdout).to.include(msg);
                    }
                }
            }
            done();
        });
    });

    it('aborts when one of the remote node fails during the job', function(done) {

        var parent = spawn('node', [runnerPath, '-n', 3, '-m', machinesWithLocalPath, badJobPath]);
        var parentStdout = [];
        var parentStderr = [];

        var stdoutRlInterface = readline.createInterface({input: parent.stdout});
        var stderrRlInterface = readline.createInterface({input: parent.stderr});

        stderrRlInterface.on('line', (line) => {
            parentStderr.push(line);
        });

        stdoutRlInterface.on('line', (line) => {
            parentStdout.push(line);
        });

        setTimeout(() => tcpBeacons[1].kill(), 5000);

        parent.on('exit', () => {

            for(var i = 0; i < 3; ++i) {
                for(var j = 0; j < 3; j++) {
                    if(i !== j) {
                        var msg = "Greetings P" + i + " from P" + j;
                        expect(parentStdout).to.include(msg);
                    }
                }
            }

            expect(parentStderr).to.include('[Aborted]: connect ECONNREFUSED 127.0.0.1:8001');

            // wait for a second for the beacons to clear there data structures
            setTimeout(done, 1500);
        });
    });

    it('ensures that the beacons aborted gracefully (by running a job)', function(done) {

        tcpBeacons[1] = spawn('node', [tcpBeaconsPath, 8001]);

        var parent = spawn('node', [runnerPath, '-n', 3, '-m', machinesWithLocalPath, jobPath]);
        var parentStdout = [];

        var stdoutRlInterface = readline.createInterface({input: parent.stdout});

        stdoutRlInterface.on('line', (line) => {
            parentStdout.push(line);
        });

        parent.stderr.on('data', (chunk) => {
            console.log(chunk.toString().trim());
        });

        parent.on('exit', () => {
            for(var i = 0; i < 3; ++i) {
                for(var j = 0; j < 3; j++) {
                    if(i !== j) {
                        var msg = "Greetings P" + i + " from P" + j;
                        expect(parentStdout).to.include(msg);
                    }
                }
            }
            done();
        });
    });

    it('aborts when the local beacon fails during the job', function(done) {

        var parent = spawn('node', [runnerPath, '-n', 3, '-m', machinesWithLocalPath, badJobPath]);
        var parentStdout = [];
        var parentStderr = [];

        var stdoutRlInterface = readline.createInterface({input: parent.stdout});
        var stderrRlInterface = readline.createInterface({input: parent.stderr});

        stderrRlInterface.on('line', (line) => {
            parentStderr.push(line);
        });

        stdoutRlInterface.on('line', (line) => {
            parentStdout.push(line);
        });

        setTimeout(() => localBeacon.kill(), 5000);

        parent.on('exit', () => {

            for(var i = 0; i < 3; ++i) {
                for(var j = 0; j < 3; j++) {
                    if(i !== j) {
                        var msg = "Greetings P" + i + " from P" + j;
                        expect(parentStdout).to.include(msg);
                    }
                }
            }

            expect(parentStderr).to.include('[Aborted]: Lost connection to local beacon');

            // wait for a second for the beacons to clear there data structures
            setTimeout(done, 3000);
        });
    });

    it('ensures that the beacons aborted gracefully (by running a job)', function(done) {

        localBeacon = spawn('node', [beaconPath]);

        var parent = spawn('node', [runnerPath, '-n', 3, '-m', machinesWithLocalPath, jobPath]);
        var parentStdout = [];

        var stdoutRlInterface = readline.createInterface({input: parent.stdout});

        stdoutRlInterface.on('line', (line) => {
            parentStdout.push(line);
        });

        parent.stderr.on('data', (chunk) => {
            console.log(chunk.toString().trim());
        });

        parent.on('exit', () => {
            for(var i = 0; i < 3; ++i) {
                for(var j = 0; j < 3; j++) {
                    if(i !== j) {
                        var msg = "Greetings P" + i + " from P" + j;
                        expect(parentStdout).to.include(msg);
                    }
                }
            }
            done();
        });
    });

    it('aborts when the runner closes abruptly during a job', function(done) {
        var parent = spawn('node', [runnerPath, '-n', 3, '-m', machinesWithLocalPath, badJobPath]);
        var parentStdout = [];

        var stdoutRlInterface = readline.createInterface({input: parent.stdout});

        stdoutRlInterface.on('line', (line) => {
            parentStdout.push(line);
        });

        parent.stderr.on('data', (chunk) => {
            console.log(chunk.toString().trim());
        });

        setTimeout(() => parent.kill(), 5000);

        parent.on('exit', () => {
            for(var i = 0; i < 3; ++i) {
                for(var j = 0; j < 3; j++) {
                    if(i !== j) {
                        var msg = "Greetings P" + i + " from P" + j;
                        expect(parentStdout).to.include(msg);
                    }
                }
            }
            setTimeout(done, 3000);
        });
    });

    it('ensures that the beacons aborted gracefully (by running a job)', function(done) {

        var parent = spawn('node', [runnerPath, '-n', 3, '-m', machinesWithLocalPath, jobPath]);
        var parentStdout = [];

        var stdoutRlInterface = readline.createInterface({input: parent.stdout});

        stdoutRlInterface.on('line', (line) => {
            parentStdout.push(line);
        });

        parent.stderr.on('data', (chunk) => {
            console.log(chunk.toString().trim());
        });

        parent.on('exit', () => {
            for(var i = 0; i < 3; ++i) {
                for(var j = 0; j < 3; j++) {
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
