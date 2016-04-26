var colors = require('colors');
var spawn = require('child_process').spawnSync;
var cmdargs = require('command-line-args');
var tasks = require('./tasks');

var params = cmdargs([
    {
        name: "process-counts",
        type: Number,
        multiple: true,
        defaultValue: [1, 2, 4]
    },

    {
        name: "iterations",
        type: Number,
        defaultValue: 100
    }
]);

var args = params.parse();

var pcounts = args['process-counts'];
var iterations = args['iterations'];

/*
 * checks if mpi binaries {mpicc, mpiexec/mpirun} exist on the system
 * @return {Object}: {'exists': true/false, 'runner': 'mpirun'/'mpiexec'/undefined}
 */
function checkmpi() {
    var compiler = spawn('mpicc');
    if(!compiler.error) {
        var run = spawn('mpirun');
        if(!run.error) {
            return {exits: true, runner: 'mpirun'};
        }
        else {
            var exec = spawn('mpiexec');
            if(!exec.error) {
                return {exists: true, runner: 'mpiexec'};
            }
        }
    }

    return {exists: false};
}

/*
 * compiles the mpi.cpp file in the task_dir to mpi.out file
 * @param task_dir {String}: the directory of the task
 * @return {Object}: the result of the operation (errored or not)
 */
function compile(task_dir) {
    var mpi_src = task_dir + '/mpi.cpp';
    var mpi_exe = task_dir + '/mpi.out';

    var compilation = spawn('mpicc', [mpi_src, '-o', mpi_exe]);
    var status = { success: true };

    if(compilation.error || compilation.stderr.length > 0) {
        status.success = false;
        status.error = compilation.stderr.toString();
    }

    return status;
}

/*
 * reports on the current line of stdout the progress of the running task
 * @param msg {String}: a descriptive message
 * @param done {Number}: the portion done of the task
 * @param size {Number}: task size
 */
function report_progress(msg, done, size) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(msg + " " + done + "/" + size);
}

console.log("Klyng v0.1.0 Benchmarks".cyan.bold);
console.log("");

var frameworks = ['MPI', 'klyng'];

var runmpi = true;
var mpirunner = "";

process.stdout.write("Checking MPI Binaries ...");
var mpicheck = checkmpi();
if(mpicheck.exits) {
    process.stdout.write(" Found!\n".green);
    mpirunner = mpicheck.runner;
    report_progress("Compiling MPI Files:", 0, tasks.length);

    for(var i = 0; i < tasks.length; ++i) {
        var task_dir = __dirname + '/tasks/' + tasks[i].alias;
        var compilation = compile(task_dir);

        if(compilation.success) {
            report_progress("Compiling MPI Files:", i + 1, tasks.length);
        }
        else {
            console.log("\nError.".red.bold);
            console.log(compilation.error.italic);
            runmpi = false;

            break;
        }
    }
}
else {
    process.stdout.write(" Not Found!\n".red);
    process.stdout.write("Skipping MPI Compilation".yellow);
    runmpi = false;
}

process.stdout.write("\n");

process.stdout.write("Retarting klyng's Beacon ...");
var status = spawn("node", [__dirname + "/../../bin/main.js", '-d']);
var status = spawn("node", [__dirname + "/../../bin/main.js", '-u']);
if(!status.err && !status.stderr.length) {
    process.stdout.write(" Done!\n".green);
}
else {
    process.stdout.write(" Error!\n".red);
    console.log(status.stderr.toString().italic);
    process.exit();
}

process.stdout.write("\n");

for(var i = 0 ; i < tasks.length ; ++i) {
    var task = tasks[i];

    console.log(("Task: " + task.name).red.bold);
    console.log(task.description);
    console.log("");

    var baseline = {MPI : 0, klyng: 0};

    for(var j = 0 ; j < pcounts.length; ++j) {

        var np = pcounts[j];

        console.log("  " + "Running on %d process(es)".blue.underline, np);

        for(var k = 0 ; k < 2 ; k++) {
            var framework = frameworks[k];

            if(framework === "MPI" && !runmpi) {
                console.log("    MPI:".bold + " Skipped");
                continue;
            }

            var runner = (framework === "klyng") ? __dirname + "/../../bin/main.js" : mpirunner;
            var task_path = __dirname + "/tasks/" + task.alias;
            task_path += (framework === "klyng") ? "/klyng.js" : "/mpi.out";

            var min = Infinity;
            var max = -1;
            var avg = 0;

            for(var itr = 0; itr < iterations; itr++) {
                report_progress("    " + (framework + ": ").bold + "Iteration", itr + 1, iterations);

                var start = process.hrtime();
                if(framework === "MPI") {
                    var output = spawn(runner, ['-n', np, task_path]);
                }
                else {
                    var output = spawn('node', [runner, '-n', np, task_path]);
                }
                var diff = process.hrtime(start);

                var duration = diff[0] + diff[1] * 1e-9;

                min = (duration <= min) ? duration : min;
                max = (duration >= max) ? duration : max;
                avg += duration;
            }

            avg /= iterations;

            var report = "min = " + min.toFixed(3) + "s, max = " + max.toFixed(3) + "s, avg = " + avg.toFixed(3) + "s";

            if(np === pcounts[0]) {
                baseline[framework]  = avg;
            }
            else {
                var speedup = (baseline[framework] - avg) * 100 / baseline[framework];
                var speedup_str = speedup.toFixed(3) + "%";
                speedup_str = (speedup > 0) ? ("+" + speedup_str).green : (speedup_str).red;

                report += " (" + speedup_str + ")";
            }

            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            console.log("    " + (framework + ": ").bold + report);
        }
    }
}
