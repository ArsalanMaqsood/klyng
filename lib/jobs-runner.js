var cp = require('child_process');
var router = require('./router.js');

/*
 * runs the given subjob on the local machine
 * @param subjob {Object}: subjob description
 */
exports.runLocally = function(subjob) {

    for(var i = subjob.startId; i < subjob.size; i++) {

        var jobInstance = cp.spawn('node', [subjob.app, subjob.size, i], {
            stdio: [null, null, null, 'ipc']
        });

        // register a handler for instance's stdout data
        // reports back to the parent klyng process
        jobInstance.stdout.on('data', function(log) {
            log = log.toString().replace('\n', '');
            router.routeToParent({type: "process:stdout", data: {line: log}});
        });

        // register a handler for instance's stderr data
        // reports back to the parent klyng process
        jobInstance.stderr.on('data', function(elog) {
            elog = elog.toString().replace('\n', '');
            router.routeToParent({type: "process:stderr", data: {line: elog}});
        })

        // register a handler for instance exit event
        // reports back to the parent klyng process
        jobInstance.on('exit', function(code) {
            router.routeToParent({type: "process:exit", data: {code: code}});
        });

        // register a handler for instance's messages
        jobInstance.on('message', function(msg) {
            if(msg.type === 'klyng:msg') {
                router.routeTo(msg.header.to, msg);
            }
        });

        jobInstance.unref();

        router.setLocalChannel(i, jobInstance);
    }
};
