# Getting Started

In this section we'll get started on working with klyng through the simple problem of summing a large list of numbers. We'll attempt to write a klyng program to divide this summation over a number of processes and collect back the result to the user.

We'll start off by installing klyng on our system.

### Installation
The klyng framework is divided into two parts: the API that you're going to import in your program, and command-line interface (the CLI) that you're going to use to run your program.

So first of all, your going to have[¹](#foot-note1) to install klyng globally on your system to easily access the CLI when you attempt to run your programs. Then for each klyng program you going to write you'll need[²](#foot-note2) to install klyng as a dependency to import the API into your program.

Installing klyng is not a fancy complicated process, it's just an npm install:
* `npm install -g klyng` for the initial global installation
* `npm install klyng` for the dependency installation.

However, on Unix systems there is a little detail that you need to consider. On such system, npm by default installs global packages in `/usr/local/lib/node_modules`. This is probably going to cause security and permission problems as klyng would need to write files in its installation folder (The packed job files form remote nodes).

To avoid these possible issues in a secure way, it's recommended that you install klyng in another location than the npm's default. For example, you can create the following directory `~/.npm-modules/` and add the following line in your `~/.profile` file:

```
export PATH=~/.npm-modules/bin:$PATH
```

This line ensures that you'll end up with klyng's CLI in your PATH so that you can run it from anywhere. Now when you attempt to install klyng globally you do:

```
NPM_CONFIG_PREFIX=~/.npm-modules npm install -g klyng
```

### Program Structure

Klyng doesn't enforce any particular organizational structure for your code, it just requires two things:
* That your code have an entry function to initialize your klyng progarm with.
* That before your program exits, you explicitly say that the klyng program has ended.

So you just have to pass an entry function to `klyng.init` and put a call to `klyng.end` at the end of your program logic, after that you're totally free to organize your code the way you want.

So for example, here's how our code for the summation problem would start off:

```javascript
var klyng = require('klyng');

// This is the entry function
function main() {

    // <---
    // Here goes any logic you want to put in the entry
    // --->

    // This says that the program ended
    // without it, it won't exit
    klyng.end();
}

// here we start the program from the entry function
// without it, it won't start
klyng.init(main);
```
Note that the call to `klyng.end` doesn't have to be at the end of the entry function, it's just have to be in the **logical** end of the program, not necessarily the **physical**. Say that you have a function in your code that at the end cleans any side-effect that might have happed by the process, the call to `klyng.end` could go there.

```javascript
var klyng = require('klyng');

function cleanAndExit() {

    // Do some cleaning
    klyng.end();  // then exit
}

// This is the entry function
function main() {

    // <---
    // Here goes any logic you want to put in the entry
    // --->

    cleanAndExit();
}

// here we start the program from the entry function
// without it, it won't start
klyng.init(main);
```
The same thing goes for `klyng.init`, it has to be at the logical start of your program which doesn't necessarily align with the physical start.

In order to generate the data on which the program will work, we're gonna have a function that generates an array of 1 million random number. It's your choice where you're gonna put this function. You may put in the same file as the entry function, you could possibly put in a separate module, or you can even put it on a remote HTTP server and call it via a GET request; whatever floats your boat. Here we'll treat it as if it's in the same file as the entry function.

```javascript
function generateRandomData() {
    var min = -10, max = 10;
    var list = new Array(1000000);
    for(var i = 0; i < 1000000; ++i) {
        list[i] = Math.random() * (max - min) + min;
    }

    return list;
}
```

### Dividing the Job

In order to be able to divide the job between the participating processes, we need to know two things:
* The number of processes participating in the job (aka the job size).
* How to tell processes apart. For this a unique identifier is needed for each process.

The first information can be retrieved by calling `klyng.size` which returns the number of the processes the job was started with. We can get the second piece of info by calling `klyng.rank`, which returns the unique identifier of the calling process. If a job started with *n* processes, each process gets a unique identifier from *0,...,n-1*.

After acquiring these information, we can easily tell the rank 0 process (aka the root process), which is usually responsible for distributing the job over the other processes, how the job can be divided.


```javascript
var klyng = require('klyng');

// This is the entry function
function main() {

    var size = klyng.size();
    var rank = klyng.rank();

    if(rank === 0) {
        // This the whole data
        var list = generateRandomData();

        // This is how much of the data each process would at least get
        var portionSize = Math.floor(1000000 / size);

        for(var p = 1; p < size; ++p) {
            // This is the portion of the data to be sent to process p
            var portion = list.slice((p - 1) * portionSize, p * portionSize);

            // we still need to send the portion
        }

        // After the root has given each process its job, it's time to do its own
        // its portion the rest of the remaining data
        var rootPortion = portion.slice((size - 1) * portionSize, 1000000);

        var localSum = rootPortion.reduce((prev, next) => prev + next);
    }
    else {
        // other processes need to wait to receive their portions from the root
    }

    klyng.end();
}

klyng.init(main);
```

### Sending and Receiving Messages

After the job was partitioned over the participating processes, the root needs to send each other process its partition and each other process needs to receive it.

For sending messages, the `klyng.send` method is used. The method takes a simple object that describes the message to be sent. This object must contain two fields: `to` which is the rank of the receiving process, and `data` which is the data to be sent (any serializable data can be sent). An optional `subject` field may be provided as an extra info to identify a message, it can be any data type that can be tested for equality in a shallow manner.

For example, this call `klyng.send({to: 5, data: "Hello", subject:"Greetings"})` will send to the process ranked 5 a message carrying "Hello" with a subject "Greetings".

In our summation problem, the following demonstrates how the root process would send each other process its data portion:

```javascript

        ...

        for(var p = 1; p < size; ++p) {
            // This is the portion of the data to be sent to process p
            var portion = list.slice((p - 1) * portionSize, p * portionSize);

            // sending the portion to process p
            klyng.send({to: p, data: portion});
        }

        ...
```
To receive messages on the other end, the `klyng.recv` method is used. It takes an object that describes the criteria of the message it's waiting for. The criteria object can have a `from` field which indicates the rank of the source process it's waiting a message from. It can also have a `subject` field indicating the subject of the message it's waiting.

Note that after calling `klyng.recv` the execution blocks until a message with the desired criteria is received; and when it returns, it returns the `data` field that was sent in the message. If other messages come to the process, they will be queued for later calls of `klyng.recv`.

If any one of the criteria fields is missing, the process will wait for any message that has any value of that missing criteria. For example, `klyng.recv({from: 0})` will accept messages form process 0 with any subject. On the other hand, `klyng.recv({subject: "Greetings"})` will accept messages with subject "Greetings" from any source. If both criteria are missing (aka an empty object is passed) or nothing is passed at all, `klyng.recv` would wait for a message from any source with any subject.

The following shows how each of the other processes would receive its data portion from root and compute its sum:

```javascript

    ...

    else {
        var portion = klyng.recv({from: 0});
        var partialSum = portion.reduce((prev, next) => prev + next);
    }

    ...
```
The only thing that is remaining now is for each process to send its partial sum to the root process and for the root process to collect those. This is shown in the following full version of the code.

```javascript
var klyng = require('klyng');

// This is the entry function
function main() {

    var size = klyng.size();
    var rank = klyng.rank();

    if(rank === 0) {
        var list = generateRandomData();
        var portionSize = Math.floor(1000000 / size);

        for(var p = 1; p < size; ++p) {
            var portion = list.slice((p - 1) * portionSize, p * portionSize);

            klyng.send({to: p, data: portion});
        }

        var rootPortion = portion.slice((size - 1) * portionSize, 1000000);

        var localSum = rootPortion.reduce((prev, next) => prev + next);

        // here the root will wait for other processes partial sums
        for(var p = 1; p < size; ++p) {
            // it doesn't matter from where the partial sum is coming
            // we'll collect them all anyway, so no need to pass criteria
            var partialSum = klyng.recv();
            localSum += partialSum;
        }

        // report back the total sum to the user
        console.log("The Total Sum is %d", localSum);
    }
    else {
        var portion = klyng.recv({from: 0});
        var partialSum = portion.reduce((prev, next) => prev + next);

        // report back the partial sum to the root process
        klyng.send({to:0 , data: partialSum});
    }

    klyng.end();
}

klyng.init(main);
```

### Running Locally

Now the program is ready to be run. To run it on your local machine, you just write in your terminal:

```
klyng -n <the number of processes you want> <the path to your js entry file>
```

So assuming that the file containing the code above is named **distributed.summation.js** and it's in the terminal's current directory. And assuming that you want to run your code across 8 processes, you would write:

```
klyng -n 8 distributed.summation.js
```
And the program will run on your local machines across 8 processes divided over your available CPU cores.

### Configuring your Device for Remote Jobs

In case you want to distribute your job across remote devices, you first need to make sure that your device is ready to listen for and accept such jobs.

The first thing is to make sure that the klyng's **beacon** is up and running on the device. So what is that beacon?

Simply and without going into much details, the beacon is a daemon process that runs in the background of your system and is responsible for running your klyng jobs. It needs to be up and running for any klyng job to run on the machine, even in the case of running locally. You may have noticed that we didn't make explicit action to start the beacon when we ran the job locally, that's because it was automatically taken care of by the klyng command we wrote to run the job. It checks first if the beacon is running and starts it if it's not.

However, in the case of running a job on remote devices where the run command will be on a different machine, this automatic check cannot be carried out and you need to make sure that the beacon is running yourself.

This can be easily done by running this command on the machine's terminal:

```
klyng --beacon-up
```
This will start the beacon in the background if it's not already started. The beacon by default starts to listen for remote requests on port 2222 and is not protected by any password. To change that you can edit the `config.json` file with the desired port and password.

You'll find the `config.json` in the directory in which klyng is installed. On Unix systems, assuming that you have followed the installation procedure described in the beginning, you would find it in `~/.npm-modules/lib/node_modules/klyng`. On Windows, assuming you didn't change npm global prefix, you would find it in `%AppData%\Roaming\npm\node_modules\klyng`.

Note that any changes in the `config.json` won't take effect until the beacon is started. If the beacon was already running, you'll need to take it down and then start it again. To stop the beacon, you just write:

```
klyng --beacon-down
```

### Running on Remote Devices

Once you have your remote devices ready, you'll need to prepare a ***machines file*** that lists the information about the devices you want to run your job across.

A machines file is a simple JSON file where each key is the IP adderess (or the host name if your hosts file or DNS can resolve it) of a remote machine you want to distribute part of your job to. The value of that key is an object that can possibly take three fields:
* `max_procs`: The maximum number of processes that you want to run on that machine. Klyng will attempt to respect that limit as far the environment allows[³](#foot-note3). If this field is missing, it defaults to infinity.

* `port`: The port number this machine would be listening on. If it's missing, the default port number 2222 is assumed.

* `passwd`: The password of that machine's beacon. If missing, it defaults to an empty string.

If you wish to include the local machine in the job, you'll need to add another entry to the machines file keyed by `"local"` that takes an object value optionally containing the `max_procs` field.

The following is an example of a machines file to run a job across the local machine and two other machines on LAN:

```javascript
{
    "local": {
        "max_procs": 2
    },

    "192.168.1.104": {
        "max_procs": 4,
        "passwd": "dummy",
        "port": 9865
    },

    "192.168.1.109": {
        "max_procs": 4,
    }
}
```

Now to run the program across the specified machines in your machines file, you just need to write in your terminal:

```
klyng -n <processes number> <path to program> -m <path to machines file>
```

Assuming that the machines file is called **machines.json** and is located in the same directory where the program code and the terminal is, you would write:

```
klyng -n 8 distributed.summation.js -m machines.json
```

Klyng will handle every thing from here and logs or errors from the remote processes will appear at your local terminal.

---
<a name="foot-note1">1</a>: You don't necessarily have to do that. You can run the CLI from the local dependency, but this may lead into problems when you have more than one program if you're not careful. So it's not recommended.

<a name="foot-note2">2</a>: Again, you don't necessarily need to do that, you can import the API directly from your globally installed version, but that's also not recommended especially if you intend to package and distribute your program.

<a name="foot-note3">3</a>: Klyng divides the job over the nodes in a round-robin fashion to ensure the most balanced division possible. If a node reached its specified maximum number of processes during the division, klyng will attempt to allocate the remaining processes to other nodes that didn't reach the maximum yet. If all nodes reached the maximum, klyng will have to cross the `max_procs` limit.
