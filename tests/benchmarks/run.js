var colors = require('colors');
var spawn = require('child_process').spawn;

function spawn_node(args, cb) {
    var proc = spawn('node', args);
    var stdout = "";

    proc.stdout.on('data', function(chunck) {
        stdout += chunck.toString().trim();
    });

    proc.on('exit', function() {
        cb(stdout);
    });
}

/*
 * takes a taks name and runs it: sequential, klyng -n 2, klyng -n 4
 * @param task {Object}: task info
 */
function run(task) {

    console.log(("  Task: " + task.name).red.bold);
    console.log("  " + task.description);
    console.log("");

    var start = new Promise(function(resolve, reject) {
        console.log("  Running Sequentially".yellow);
        var regular_path = './tests/benchmarks/tasks/' + task.alias + '/regular.js';
        spawn_node([regular_path], function(time) {
            console.log("    " + time.italic);
            resolve();
        });
    })
    .then(function () {
        return new Promise(function(resolve, reject) {
            console.log("  Running with klyng -n 2".yellow);
            var klyng_path = './tests/benchmarks/tasks/' + task.alias + '/klyng.js';
            spawn_node(['./bin/main.js', '-n', '2', klyng_path], function(time) {
                console.log("    " + time.italic);
                resolve();
            });
        });
    })
    .then(function() {
        return new Promise(function(resolve, reject) {
            console.log("  Running with klyng -n 4".yellow);
            var klyng_path = './tests/benchmarks/tasks/' + task.alias + '/klyng.js';
            spawn_node(['./bin/main.js', '-n', '4', klyng_path], function(time) {
                console.log("    " + time.italic);
                resolve();
            });
        });
    });

    return start;
}

function WaterfallOver(list, iterator, callback) {
    var nextItemIndex = 0;

    function report() {

        nextItemIndex++;
        if(nextItemIndex === list.length)
            callback();
        else
            iterator(list[nextItemIndex], report);
    }

    iterator(list[0], report);
}

var tasks = [
    {
        name: "Pi Approximation",
        alias: "pi",
        description: "Approximates pi with Leibniz formula up to 5e9"
    }
];

console.log("Benchmarks".green.bold);
console.log("");

WaterfallOver(tasks, function(task, done) {
    run(task)
    .then(done);
});
