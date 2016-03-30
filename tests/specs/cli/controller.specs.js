var spawn = require('child_process').spawn;
var expect = require('chai').expect;
var cli = require('../../../lib/cli-controller');

describe('CLI Controller', function() {

    it("parses a valid hosts file correctly", function() {

        var hosts = cli.parseHosts(__dirname + "/../../fixtures/cli/fake-hosts.valid.json");

        expect(hosts.local).to.equal(2);
        expect(hosts["192.168.0.10@2222:"]).to.equal(Infinity);
        expect(hosts["192.168.0.2@4578:"]).to.equal(3);
        expect(hosts["192.168.0.103@2222:h3llo"]).to.equal(5);
        expect(hosts["192.168.0.20@5986:olleh"]).to.equal(1);

    })
})
