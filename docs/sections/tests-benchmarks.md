# Tests and Benchmarks

## Unit and Integration Tests

**Unit tests** can be found under the directory `tests/specs` and it's organized into three directories: one for the beacon components, the other for the CLI components, and the last is for the API components. Each component in these directory has its own `*.specs.js` file where tests for each functional unit in the component are listed.

The tests are written in BDD style with `chai.expect` and run under Mocha testing framework. You can run the unit tests either with `glup` or `npm` scripts as follows:

```
gulp unit-tests
npm run unit-tests
```

**Integration tests** on the other hand can be found under the `tests/integration` directory and the tests are listed in the `run.js` file there. The tests ensures that the local and remote components communicate correctly and recover gracefully form errors that might occur during the job so that they remain available for later jobs.

Integration tests are also written in BDD style and can be run using either `gulp` or `npm`:

```
gulp integration-tests
npm run integration-tests
```

To run both the unit and integration tests sequentially (this is what is used in the ci services), you can use `gulp test` or `npm test`.

*Note 1*: The seemingly large amount of time that the tests take are due to intentional waits and do not reflect the framework's performance.

*Note 2*: There could be some instability in the tests (specially in the integration tests) due to the fact delays in network communications may not align with the waits mentioned above. So please make sure that if the tests fail, they fail all the time in a consistent manner before reporting an issue.

## Benchmarks
***Important Note: For now, the benchmarks cannot be run on Windows***

The benchmarks can be found under the `tests/benchmarks` directory, it's organized in the following manner:

* `tasks/` **directory**: which contains a list of directories, one for each task that can be run by the benchmarking script. Each task folder need to have 2 files:
    * `mpi.cpp`: This is the task written in C/C++ with MPI. If one task is missing this file, MPI runs will not be carried out throughout all the tasks.
    * `klyng.js`: This is the task written in javascript with klyng. This file is necessary!
* `utilis/` **directory**: this contains C/C++ utility function to retrieve a CPU time. It's only supports Unix-based systems for now.

* `tasks.js` **file**: this is like a registry index for the tasks in the `tasks/` directory where each task gets a name, an alias (which must be the same as its directory name), and description. This helps the bench locate the task sources and display descriptive information of the task while running.

* `run.js` **file**: which is the benchmarking script itself. This script runs each of the given tasks on each framework across each specified number of processes for a specific number of times and collects the specified metrics. By default: the script runs all tasks in the `tasks.js` file on each framework across 1, 2, and 4 processes for 100 times and collects the ***Maximum Process CPU Time*** [¹](#foot-note1) (MPCT) and the ***Runner total execution time*** (RTET) metrics. However these parameters are configurable through command line arguments.

### Running the Benchmarks

```
npm run benchmarks -- [options]
```

### Options

| Option            | Description                                                                                                                                                         |
|-------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| --process-counts  | Takes a list of numbers to be process counts to run the benchmarks across <br> **Default**: [1, 2, 4] <br> **Example**: `npm run benchmarks -- --process-counts 2 4 8`
| --iterations      | Takes a number to define how many times each task should be run <br> **Default**: 100 <br> **Example**: `npm run benchmarks -- --iterations 1000`                             |
| --tasks           | Takes a list of strings that represent aliases of the tasks to run by the benchmark <br> **Default**: ['pi', 'primes'] <br> **Example**: `npm run benchmarks -- --tasks pi`   |
| --no-mpi          | If present, stops the execution of the MPI version of the tasks                                                                                                     |
| --metrics         | Takes a list of strings representing which metrics to be reported by the bechmark <br> **Default**: ['mpct', 'rtet'] <br> **Example**: `npm run benchmarks -- --metrics rtet` |

---
<a name="foot-note1">1</a> The benchmarks collects each process CPU time through the process's stdout. So each process, before exiting must report its total CPU time to stdout (check the tasks source code to have a better understanding)
