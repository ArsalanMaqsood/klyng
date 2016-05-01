var cp = require('child_process');
var path = require('path');
var fs = require('fs');
var readline = require('readline');
var zipper = require('zip-local');
var browserify = require('browserify');
var router = require('./router.js');

/*
 * packs the app into a zip file
 * @param job {Object}: the job specs
 * @return {Promise}: of the app descriptor {pckg, id}
 */
function pack(job) {
    return new Promise(function(resolve, reject) {

        browserify(job.app, {
            builtins: false,
            browserField: false,
            insertGlobalVars: {
                'process': undefined
            }
        })
        .external('fibers')
        .bundle(function (err, buffer) {
            if(err) {
                return reject(err);
            }

            var app_id = Date.now().toString();

            zipper.zip(buffer, "app_" + app_id + ".js", function(err, zipped) {
                if(err) {
                    return reject(err);
                }

                var packed_buff = zipped.compress().memory();
                resolve({
                    id: app_id,
                    pckg: packed_buff.toString('base64')
                });
            });
        });
    });
}

/*
 * unpacks a packed app from remote root
 * @param app {Object}: the app descriptor recived from remote root
 */
 function unpack(app) {
     return new Promise(function(resolve, reject) {
         // check if the unpaking directory exists
         var unpacks_dir = __dirname + '/../.unpacks/';
         fs.stat(unpacks_dir, function(err, stats) {
             if(err) {
                 try {
                    fs.mkdirSync(unpacks_dir);
                 }
                 catch(err) { return reject(err); }
             }

             var data = new Buffer(app.pckg, 'base64');

             zipper.unzip(data, function(err, unzipped) {
                 if(err) {
                     return reject(err);
                 }

                 unzipped.save(unpacks_dir, function(err) {
                     if(err) {
                         return reject(err);
                     }

                     resolve(unpacks_dir + "app_" + app.id + ".js");
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

     var hosts = {};

     for(var host in job.hosts) {
         hosts[host] = {count: 0, max: job.hosts[host].max_procs}
     }

     // round-robin over the hosts and allocated processes numbers
     var hosts_list = Object.keys(hosts);
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
     if(!!hosts["local"]) {
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

    for(var i = 0; i < subjob.subsize; i++) {

        var rank = subjob.start + i;
        var jobInstance = cp.spawn('node', [subjob.app, subjob.size, rank], {
            stdio: [null, null, null, 'ipc']
        });

        var stdoutRlInterface = readline.createInterface({input: jobInstance.stdout});
        var stderrRlInterface = readline.createInterface({input: jobInstance.stderr});

        // register a handler for instance's stdout data
        // reports back to the parent klyng process
        stdoutRlInterface.on('line', function(log) {
            router.routeToParent({type: "process:stdout", data: {line: log}});
        });

        // register a handler for instance's stderr data
        // reports back to the parent klyng process
        stderrRlInterface.on('line', function(elog) {
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

        router.setLocalChannel(rank, jobInstance);
    }
};

module.exports = {
    pack: pack,
    unpack: unpack,
    divide,
    runLocally: runLocally
};
