#!/usr/bin/env node

var parameters = require('../lib/command-line-parameters.js');
var cli = require('../lib/cli-controller.js');
var path = require('path');

// parse the command-line arguments
var args = parameters.parse();

if (Object.keys(args).length === 0) {
    cli.noOptionsAlert();
}
else if (args.help) {
    cli.help();
}
else if (!!args["beacon-up"]) {
    cli.beaconUp();
}
else if(!!args["beacon-down"]) {
    cli.beaconDown();
}
else if(!!args['num-processes'] && !!args['app']) {

    var job_descriptor = {
        size: args['num-processes'],
        app: path.resolve(process.cwd(), args['app'])
    };

    if(!!args['machines']) {
        var hosts = cli.parseHosts(args['machines']);
        if(!hosts.error) {
            job_descriptor.hosts = hosts;
        }
        else {
            console.error(hosts.error);
            process.exit();
        }
    }

    cli.run(job_descriptor);
}
