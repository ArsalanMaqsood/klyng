var klyng = require('./../../../../index');

function approx_pi(from, to) {
    var pi = 0;

    for(var i = from; i < to; i++) {
        if((i + 1) % 2 == 0)
            pi += 1 / (2 * i - 1);
        else
            pi -= 1 / (2 * i - 1);
    }
    pi *= 4;

    return pi;
}

function main() {

    var size = klyng.size();
    var rank = klyng.rank();

    if(rank === 0) {

        var start = Date.now();

        var batch_size = 5000000000 / size;

        // distribute the range over the other processes
        for(var proc = 1; proc < size; proc++) {
            var range = [proc * batch_size, (proc + 1) * batch_size];
            klyng.send({to: proc, data: range});
        }

        // process own's range
        var local_pi = approx_pi(1, batch_size);

        // wait for the others
        for(var proc = 1; proc < size; proc++) {
            var other_pi = klyng.recv();
            local_pi += other_pi;
        }

        var end = Date.now();

        console.log("Time: " + (end - start) / 1000 + " seconds");
    }
    else {
        var range = klyng.recv({from: 0});
        var local_pi = approx_pi(range[0], range[1]);
        klyng.send({to: 0, data: local_pi});
    }

    klyng.end();
}

klyng.init(main);
