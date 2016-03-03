var spawn = require('child_process').spawn;
var expect = require('chai').expect;

describe("klyng sync-primitives", function() {

    it('initializes and ends a klyng app without errors', function(done) {
        var app = spawn('node', ['./tests/fixtures/klyng-apis/sync-init.js', 1, 2], {stdio: [null,null,null,'ipc']});
        app.on('exit', function(code) {
            expect(code).to.equal(0);
            done();
        });
    });

    it('fails to initialize a klyng app with no ipc', function(done) {
        var app = spawn('node', ['./tests/fixtures/klyng-apis/sync-init.js', 1, 2]);
        app.on('exit', function(code) {
            expect(code).to.equal(1);
            done();
        });
    })

    it('gets the rank and size of the process correctly', function(done) {
        var app = spawn('node', ['./tests/fixtures/klyng-apis/sync-rank-size.js', 2, 0], {stdio: [null,null,null,'ipc']});
        var app_stdout = "";
        app.stdout.on('data', function(chunck) { app_stdout += chunck.toString().trim(); });
        app.on('exit', function(code) {
            expect(code).to.equal(0);
            expect(app_stdout).to.equal("0:2");
            done();
        });
    });

    it('sends a message correctly', function(done) {
        var app = spawn('node', ['./tests/fixtures/klyng-apis/sync-send.js', 2, 0], {stdio: [null,null,null,'ipc']});
        var recieved_msg = null;
        app.on('message', function(msg) { recieved_msg = msg; });
        app.on('exit', function(code) {
            expect(code).to.equal(0);
            expect(recieved_msg).to.not.equal(null);
            expect(recieved_msg.type).to.equal('klyng:msg');
            expect(recieved_msg.header.from).to.equal(0);
            expect(recieved_msg.header.to).to.equal(1);
            expect(recieved_msg.data).to.equal("Hello");
            done();
        });
    });

    it('raises an error when send is called with no \'to\' field', function(done) {
        var app = spawn('node', ['./tests/fixtures/klyng-apis/sync-send-invalid-1.js', 2, 0], {stdio: [null,null,null,'ipc']});
        app.on('exit', function(code) {
            expect(code).to.equal(1);
            done()
        });
    });

    it('raises an error when send is called with no \'data\' field', function(done) {
        var app = spawn('node', ['./tests/fixtures/klyng-apis/sync-send-invalid-2.js', 2, 0], {stdio: [null,null,null,'ipc']});
        app.on('exit', function(code) {
            expect(code).to.equal(1);
            done()
        });
    });

    it('recieves a message correctly with no criteria specified', function(done) {
        var app = spawn('node', ['./tests/fixtures/klyng-apis/sync-recv-no-criteria.js', 2, 0], {stdio: [null,null,null,'ipc']});
        var app_stdout = "";
        app.stdout.on('data', function(chunck){ app_stdout += chunck.toString().trim(); });
        app.send({type: 'klyng:msg',header: {to:0,from: 1,},data: "Hello"});
        app.on('exit', function(code) {
            expect(code).to.equal(0);
            expect(app_stdout).to.equal("Hello");
            done();
        });
    });

    it('recieves a message correctly with source specified', function(done) {
        var app = spawn('node', ['./tests/fixtures/klyng-apis/sync-recv-from.js', 2, 0], {stdio: [null,null,null,'ipc']});
        var app_stdout = "";
        app.stdout.on('data', function(chunck){ app_stdout += chunck.toString().trim(); });
        app.send({type: 'klyng:msg',header: {to:0,from: 2,},data: "Hello from 2"});
        app.send({type: 'klyng:msg',header: {to:0,from: 5,},data: "Hello from 5"});
        app.on('exit', function(code) {
            expect(code).to.equal(0);
            expect(app_stdout).to.equal("Hello from 5");
            done();
        });
    });

    it('recieves a message correctly with subject specified', function(done) {
        var app = spawn('node', ['./tests/fixtures/klyng-apis/sync-recv-subject.js', 2, 0], {stdio: [null,null,null,'ipc']});
        var app_stdout = "";
        app.stdout.on('data', function(chunck){ app_stdout += chunck.toString().trim(); });
        app.send({type: 'klyng:msg',header: {to:0,from: 2,subject: "sub1"},data: "Hello with sub1"});
        app.send({type: 'klyng:msg',header: {to:0,from: 5,subject: "sub2"},data: "Hello with sub2"});
        app.on('exit', function(code) {
            expect(code).to.equal(0);
            expect(app_stdout).to.equal("Hello with sub2");
            done();
        });
    });

    it('recieves a message correctly with full criteria', function(done) {
        var app = spawn('node', ['./tests/fixtures/klyng-apis/sync-recv-full.js', 2, 0], {stdio: [null,null,null,'ipc']});
        var app_stdout = "";
        app.stdout.on('data', function(chunck){ app_stdout += chunck.toString().trim(); });
        app.send({type: 'klyng:msg',header: {to:0,from: 2,subject: "sub1"},data: "Hello with sub1 form 2"});
        app.send({type: 'klyng:msg',header: {to:0,from: 5,subject: "sub2"},data: "Hello with sub2 form 5"});
        app.on('exit', function(code) {
            expect(code).to.equal(0);
            expect(app_stdout).to.equal("Hello with sub2 form 5");
            done();
        });
    });

});
