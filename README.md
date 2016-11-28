<p align='center'>
<img src='https://drive.google.com/uc?export=view&id=0BwJ57iK3uPsVV3paZnVHTGp5blU' alt='klyng'>
</p>

<p align='center'>
<a href='https://travis-ci.org/Mostafa-Samir/klyng'>
<img src='https://travis-ci.org/Mostafa-Samir/klyng.svg?branch=master' alt='Build Status'>
</a>

<a href='https://ci.appveyor.com/project/Mostafa-Samir/klyng'>
<img src='https://ci.appveyor.com/api/projects/status/ni8fbuou6o2qns1t?svg=true' alt='Build Status'>
</a>

<img src='https://img.shields.io/badge/node-%3E%3D4.2.3-blue.svg' alt='Node Version >= 4.2.3'>
</p>

<p align='center'>
<strong>Write and execute distributed code on <i>any</i><a href='#system-requirements'>*</a> platform that can run node.js</strong>
</p>

# Distributed Hello World!

```javascript
var klyng = require('klyng');

function main() {
    var size = klyng.size();
    var rank = klyng.rank();

    console.log("Hello World! I'm Process %d-%d", rank, size);

    klyng.end();
}

klyng.init(main);
```
<p align='center'>
    <img src='https://drive.google.com/uc?export=view&id=0BwJ57iK3uPsVUzdSbzh0RmIzdkk' alt='Distributed Hello World'>
</p>

# System Requirements

You can use klyng anywhere; provided that you have node.js **v4.2.3 or later** installed. Also, because klyng is built on [node-fibers](https://github.com/laverdet/node-fibers), your need to be able to run or build fibers on your system. Fibers is naturally available via npm for Linux, OS X and Windows 7 (or later), for other operating systems you will probably need to compile fibers form its C/C++ source.

# Security
When it comes to running jobs on remote devices, klyng implements several measures to ensure a secure communication channel.

1. A key-exchange algorithm (Diffie-Hellman) is used to establish a shared secret key between the two communicating devices. This key is used later to encrypt the messages carrying sensitive data (with AES-256) and stamp them with an HMAC.

2. For now, each node (in klyng's jargon, a **beacon**) is protected with a password. Sending a password between two nodes for authorization is done through the secure channel established is step 1.

3. Once a node is authorized, it can pack the job's source in one file a sends it through the secure channel for the other node to run. Any control signals is also sent through this channel. Only the messages sent between the processes during the job is not secured.

# Performance

In order to evaluate klyng's performance and how well it scales with the number of processors, A benchmarking script was designed to compare klyng's performance to that of MPICH2 (with C/C++) on the same tasks. The benchmarks focused on two metrics:
* **Runner Total Execution Time (RTET):** which is actual time taken by the job, form the moment the runner is executed with the job to the moment it exits.

* **Max Process CPU Time (MPCT):** which is the maximum of the CPU time of all the participating processes in the job.

As the MPCT metric uses the actual time spent by an individual process on the CPU, it measure how well is the framework scaling as if each process is running on its own CPU, which is not the real case. The real case, in which there are multiple processes and a limited number of processors so processes will probably share time on a single processor, is captured with RTET metric.

Compared to MPICH2 with C/C++, the data shows that klyng and javascript scales with the number of processors just as well (and in some cases, even better).

![Pi-MPCT](https://drive.google.com/uc?export=view&id=0BwJ57iK3uPsVNXBiUVB1SEE1VHc)

![Primes-MPCT](https://drive.google.com/uc?export=view&id=0BwJ57iK3uPsVUGJTYWQ2Q2pZRzQ)

![Pi-RTET](https://drive.google.com/uc?export=view&id=0BwJ57iK3uPsVTnBMLWd1Tmgwd0k)

![Primes-RTET](https://drive.google.com/uc?export=view&id=0BwJ57iK3uPsVcFVVVHBzNDI2bWM)

The data represents how both MPICH2 and klyng scale with the number of processes on two computationally-intensive tasks:

*  **Pi Approximation:** which approximates the value of π with the [arctan integral formula](https://en.wikipedia.org/wiki/Inverse_trigonometric_functions#Expression_as_definite_integrals) using the a [Reimann sum](http://mathworld.wolfram.com/RiemannSum.html) with Δx = 2x10⁻⁹.

* **Counting Primes:** which counts the number of prime numbers between 1 and 10⁷ using the naive primality test of trial division.

These data were collected on a machine with an Intel Core i5 2410M CPU @ 2.30GHz (2 physical cores, with hyper-threading disabled), running node v5.4.1 on Ubuntu14.04. Each task of the two ran 100 times and the RTET and MPCT were collected for each run and averaged in the end into the data depicted in the charts. This process was repeated for each framework (MPICH2 and klyng) on each process count (1, 2, and 4).

To make these data reproducible, the benchmarking script along with the source code for the tasks in question are shipped with the framework. The benchmarking script is also customizable for different environment parameters and extensible for more tasks.

For more information on running the benchmarks, please refer to the [documentations](./docs/sections/tests-benchmarks.md#benchmarks).

# Relation to MPI Standards

The project was originally motivated by MPI, so it's greatly influenced by the MPI standards, and the standards was used more than one time as a reference in the implementations of some aspects of the project. However, the project in its current state cannot be considered as an implementation of the MPI standards; it can be considered, for now, as a *weak implementation of the MPI standards*.

# Dive In!

1. [Getting Started](./docs/sections/getting-started.md)
    1. [Installation](./docs/sections/getting-started.md#installation)
    2. [Program Structure](./docs/sections/getting-started.md#program-structure)
    3. [Dividing the Job](./docs/sections/getting-started.md#dividing-the-job)
    4. [Sending and Receiving Messages](./docs/sections/getting-started.md#sending-and-receiving-messages)
    5. [Running Locally](./docs/sections/getting-started.md#running-locally)
    6. [Configuring your Device for Remote Jobs](./docs/sections/getting-started.md#configuring-your-device-for-remote-jobs)
    5. [Running on Remote Devices](./docs/sections/getting-started.md#running-on-remote-devices)
2. [API Documentation](./docs/sections/api-doc.md)
    1. [Environment Methods](./docs/sections/api-doc.md#environment-methods)
    2. [Communication Methods](./docs/sections/api-doc.md#communication-methods)
3. [CLI Documentation](./docs/sections/cli-doc.md)
4. [Tests and Benchmarks](./docs/sections/tests-benchmarks.md)
    1. [Unit and Integration Tests](./docs/sections/tests-benchmarks.md#unit-and-integration-tests)
    2. [Benchmarks](./docs/sections/tests-benchmarks.md#benchmarks)

# License

### MIT
