var klyng = require('./../../../../index');
var getrusage = require('getrusage');

function isprime(number) {
    if(number === 2) { return true;}

    if(number % 2 === 0) { return false; }

    var k = 3;
    while(k * k <= number) {
        if(number % k === 0) { return false; }
        k += 2;
    }

    return true;
}

function main() {

    var size = klyng.size();
    var rank = klyng.rank();

    var max = 10000000;

    var counter = 0;
    var start = rank * (max / size);
    var end = (rank + 1) * (max/ size);

    for(var num = start; num < end; ++num) {
        if(isprime(num)) { ++counter; }
    }

    if(rank !== 0) {
        klyng.send({to: 0, data: counter});
    }
    else {
        for(var p = 1; p < size; ++p) {
            var other_count = klyng.recv();
            counter += other_count;
        }

        console.log(counter);
    }

    console.log("cputime:%s", getrusage.getcputime().toFixed(3));

    klyng.end();

}

klyng.init(main);
