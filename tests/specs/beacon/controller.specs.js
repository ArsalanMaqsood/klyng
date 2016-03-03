var controller = require('../../../lib/beacon-controller.js');
var expect = require('chai').expect;

describe('Beacon\'s Controller', function() {

    this.timeout(3000);

    it('checks and finds the beacon not running', function(done) {
        controller.checkIfRunning()
        .then(function(running) {
            expect(running).to.equal(false);
            done();
        });
    });

    it('starts the beacon process', function(done) {
        controller.start()
        .then(function(started) {
            expect(started).to.equal(true);
            done();
        });
    });

    it('checks and finds the beacon running now', function(done) {
        controller.checkIfRunning()
        .then(function(running) {
            expect(running).to.equal(true);
            done();
        });
    });

    it('signals the beacon to run a job', function(done) {
        controller.signalToRun({size:1, app: './tests/fixtures/beacon/runner-fake-job.js'})
        .then(function(status) {
            expect(!!status).to.equal(true);
            done();
        });
    });

    it('signals the beacon that it\'s done with a job', function(done) {
        controller.signalDone()
        .then(function(signaled) {
            expect(signaled).to.equal(true);
            done();
        });
    });

    it('stops the beacon process', function(done) {
        controller.checkIfRunning()  // to re-open the socket closed in the last test case
        .then(function() {
            return controller.stop();
        })
        .then(function(stopped) {
            expect(stopped).to.equal(true);
            done();
        });
    });
    
});
