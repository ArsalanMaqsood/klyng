var cp = require('child_process');
var path = require('path');
var fs = require('fs');
var zipper = require('zip-local');
var _ = require('underscore');
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
 * unpacks a packed app from remote root
 * @param app {Object}: the app descriptor recived from remote root
 */
 function unpack(app) {
     return new Promise(function(resolve, reject) {
         // check if the unpaking directory exists
         fs.stat(__dirname + '/../.unpacks', function(err, stats) {
             if(err) {
                 fs.mkdirSync(__dirname + '/../.unpacks');
             }

             var data = new Buffer(app.data, 'base64');
             var appdir = __dirname + '/../.unpacks/app_' + Date.now();
             fs.mkdirSync(appdir);

             zipper.unzip(data, function(unzipped) {
                 unzipped.save(appdir, function() {
                     resolve(appdir + "/" + app.entry);
                 });
             });
         });
     });
 }

 /*
  * divides the job processes over the specified hosts using round-robin divison
  * @param job {Object}: the job specs
  * @return {Object}: a job distribution plan
 */
 function divide(job) {

     // strip out the password from job.hosts
     var hosts = _.object(
         _.map(_.keys(job.hosts), function(host) {
             if(host !== "local")
                return host.match(/([0-9\.]*@[0-9]*):/)[1];
             return "local";
         }),
         _.map(_.values(job.hosts), function(max) {
             return {count: 0, max: max};
         })
     );

     // round-robin over the hosts and allocated processes numbers
     var hosts_list = _.keys(hosts);
     var allocated = 0;
     var next = 0;
     var counter = 0;
     var overallocate = false;  // if true: hosts will be overallocated with processes to meet job.size
     while(allocated < job.size) {
         var host = hosts[hosts_list[next++ % hosts_list.length]];
         if(host.count != host.max || overallocate) {
             host.count++;
             allocated++;
             if(!overallocate) {
                 // if not in overallocate mode already, reset the counter to indicate allocation
                 counter = 0;
             }
         }
         else {
             counter++;
             // set the overallocate to true if gone through the list without allocation
             overallocate = (counter === hosts_list.length);
         }
     }

     var start_index = 0;
     // register the 0 index process to the local host if exists
     if(_.has(hosts, "local")) {
         hosts.local.start = 0;
         start_index += hosts.local.count;
     }
     // assign the rest of indecies to the rest of hosts
     for(var host in hosts) {
         if(host !== "local") {
             hosts[host].start = start_index;
            start_index += hosts[host].count;
        }
        delete hosts[host]["max"];
     }

     return hosts;
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
    unpack: unpack,
    divide,
    runLocally: runLocally
};
