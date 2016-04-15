var beacon = require('../lib/beacon-controller.js');
var parameters = require('../lib/command-line-parameters.js');
var path = require('path');
var fs = require('fs');
var ipc = require('node-ipc');

// ipc configurations
ipc.config.retry = 600;
ipc.config.maxRetries = 3;
ipc.config.sync = true;
ipc.config.silent = true;


/*
 * prints an alert to consult help guide in no options are provided
 */
function noOptionsAlert() {
    console.log("You didn't specify any options.")
    console.log("Run (klyng --help) for more info.");
}

/*
 * prints the help guide of the cli tool
 */
function help() {

    var guide = parameters.getUsage({
        title: "klyng",
        hide: ["app"],
        description: [
            "A command line tool to run klyng apps"
        ],
        synopsis: [
            "klyng --help",
            "klyng --beacon-up",
            "klyng --beacon-down",
            "klyng -n <number-of-processes> <path-to-klyng-app-entry>"
        ]
    });

    console.log(guide);
}

/*
 * starts the beacon process in the background
 */
function beaconUp() {

    beacon.checkIfRunning()
    .then(function(running) {
        if(running)
            console.log('The beacon is already up and listening.');
        else
            return beacon.start();
    })
    .then(function(started) {
        if(started)
            console.log('The beacon is now up and listening.');
        else if(started === false)
            console.log("Some Error Occured");
    })
    .then(function() {
        ipc.disconnect('klyng_beacon');
    });
}

/*
 * shuts the beacon process down if running
 */
 function beaconDown() {

    beacon.checkIfRunning()
    .then(function(running) {
        if(running) {
            return beacon.stop();
        }
        else {
            console.log("The beacon is not up.");
        }
    })
    .then(function(stopped) {
        if(stopped) {
            console.log("The beacon is now down.");
        }
        else if(stopped === false) {
            console.log("Some Error Occured");
        }
    });
}

/*
 * initaites a specified klyng job
 * signals the beacon process to spawn the parallel process
 * starts listening for control and monitoring messages from the beacon
 * @param job {Object}: the klyng job description
 */
function run(job) {

    beacon.checkIfRunning()
    .then(function(running) {
        if(running) {
            return true;
        }
        else {
            return beacon.start();
        }
    })
    .then(function(started) {
        if(started) {
            return beacon.signalToRun(job);
        }
        else {
            console.log("Some Error Occured");
        }
    })
    .then(function(signaled) {
        if(signaled) {
            if(signaled === 'busy') {
                console.log('The beacon is busy.');
                ipc.disconnect('klyng_beacon');
            }
            else {

                var remainingProcessesCount = job.size;

                ipc.of.klyng_beacon.on('MONITOR:MSG', function(message, socket) {

                    if(message.type === 'process:stdout') {
                        console.log(message.data.line);
                    }
                    else if(message.type === 'process:exit') {
                        remainingProcessesCount--;
                        if(!remainingProcessesCount)
                            beacon.signalDone()
                    }
                });
            }
        }
        else {
            console.log("Some Error Occured");
        }
    });
}

/*
 * parses a hosts file into an object
 * @param path {String}: the path to the hosts file
 * @return {Object|Boolean}: the parsed hosts object, or error object if any occured
 */
function parseHosts(path) {
    try {
        var hFile = fs.readFileSync(path, {encoding: 'utf8'});
        var _hosts = JSON.parse(hFile);
        var hosts = {}; // the parsed hosts object

        // iterate over the entries, check for errors, fill in missing data, and parse
        for(var host in _hosts) {
            var current = _hosts[host];

            if(typeof current !== "object") {
                throw new Error("INVALID: an entry in hosts file is not an object");
            }

            // fill in data if missing
            current.pCount = current.pCount || Infinity;
            if(host !== "local") {
                current.port = current.port || 2222;
                current.passwd = current.passwd || "";
            }

            // check for errors in entry's data
            if(typeof current.pCount !== "number") {
                throw new Error("INVALID: an entry's processes count is not a number");
            }
            if(current.pCount < 1) {
                throw new Error("INVALID: an entry's processes count is less than one");
            }
            if(host !== "local") {
                if(typeof current.port !== "number") {
                    throw new Error("INVALID: an entry's port number is not a number!");
                }
                if(typeof current.passwd !== "string") {
                    throw new Error("INVALID: an entry's password is not a string");
                }
            }

            if(host === "local") {
                hosts.local = current.pCount;
            }
            else {
                hosts[host + "@" + current.port + ":" + current.passwd] = current.pCount;
            }
        }

        return hosts;
    }
    catch(error) {
        return {error: error.message};
    }
}

module.exports = {
    noOptionsAlert: noOptionsAlert,
    help: help,
    beaconUp: beaconUp,
    beaconDown: beaconDown,
    run: run,
    parseHosts: parseHosts
};
