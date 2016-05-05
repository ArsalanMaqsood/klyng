var spawn = require('child_process').spawn;
var expect = require('chai').expect;
var cli = require('../../../lib/cli-controller');

describe('CLI Controller', function() {

    it("parses a valid hosts file correctly", function() {

        var hosts = cli.parseHosts(__dirname + "/../../fixtures/cli/fake-hosts.valid.json");

        expect(hosts.error).to.not.exist;
        expect(hosts.local.max_procs).to.equal(2);
        expect(hosts["192.168.0.10:2222"].max_procs).to.equal(Infinity);
        expect(hosts["192.168.0.10:2222"].password).to.equal("");
        expect(hosts["192.168.0.2:4578"].max_procs).to.equal(3);
        expect(hosts["192.168.0.2:4578"].password).to.equal("");
        expect(hosts["192.168.0.103:2222"].max_procs).to.equal(5);
        expect(hosts["192.168.0.103:2222"].password).to.equal("h3llo");
        expect(hosts["192.168.0.20:5986"].max_procs).to.equal(1);
        expect(hosts["192.168.0.20:5986"].password).to.equal("oll3h");

    });

    it('fails to parse a non-existing hosts file', function() {
        var hosts = cli.parseHosts("fake-hosts.that.is.not.there.json");

        expect(hosts.error).to.exist;
        expect(hosts.error).to.have.string('ENOENT');
    });

    it('fails to parse a non-json hosts file', function() {
        var hosts = cli.parseHosts(__dirname + "/cli.specs.js");

        expect(hosts.error).to.exist;
        expect(hosts.error).to.have.string('Unexpected token');
    });

    it('fails to parse a hosts file with non-object entry', function() {
        var hosts = cli.parseHosts(__dirname + "/../../fixtures/cli/fake-hosts.invalid-1.json");

        expect(hosts.error).to.exist;
        expect(hosts.error).to.have.string('INVALID: an entry in hosts file is not an object');
    });

    it('fails to parse a hosts file with an entry of a non-number pCount', function() {
        var hosts = cli.parseHosts(__dirname + "/../../fixtures/cli/fake-hosts.invalid-2.json");

        expect(hosts.error).to.exist;
        expect(hosts.error).to.have.string("INVALID: an entry's processes count is not a number");
    });

    it('fails to parse a hosts file with an entry of a non-positive pCount', function() {
        var hosts = cli.parseHosts(__dirname + "/../../fixtures/cli/fake-hosts.invalid-5.json");

        expect(hosts.error).to.exist;
        expect(hosts.error).to.have.string("INVALID: an entry's processes count is less than one");
    });

    it('fails to parse a hosts file with an entry of a non-number port', function() {
        var hosts = cli.parseHosts(__dirname + "/../../fixtures/cli/fake-hosts.invalid-3.json");

        expect(hosts.error).to.exist;
        expect(hosts.error).to.have.string("INVALID: an entry's port number is not a number!");
    });

    it('fails to parse a hosts file with an entry of a non-string password', function() {
        var hosts = cli.parseHosts(__dirname + "/../../fixtures/cli/fake-hosts.invalid-4.json");

        expect(hosts.error).to.exist;
        expect(hosts.error).to.have.string("INVALID: an entry's password is not a string");
    });

});
