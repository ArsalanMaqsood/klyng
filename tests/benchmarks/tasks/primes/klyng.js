var klyng = require('./../../../../index');

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
    for(var num = rank + 1; num <= max; num += size) {
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

    klyng.end();

}

klyng.init(main);
