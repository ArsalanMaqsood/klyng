var cp = require('child_process');
var path = require('path');
var zipper = require('zip-local');
var router = require('./router.js');

/*
 * packs the app into a zip file
 * @param job {Object}: the job specs
 * @return {Object}: a packed app descriptor
 */
function pack(job) {
    var app = path.parse(job.app);
    var packed_buff = zipper.sync.zip(app.dir).compress().memory();

    var descriptor = {
        entry: app.base,
        data: packed_buff.toString('base64')
    }

    return descriptor;
}

/*
 * runs the given subjob on the local machine
 * @param subjob {Object}: subjob description
 */
function runLocally(subjob) {

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

module.exports = {
    pack: pack,
    runLocally: runLocally
};
