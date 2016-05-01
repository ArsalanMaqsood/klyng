var klyng = require('../../../index');

function main() {

    var size = klyng.size();
    var rank = klyng.rank();

    // send greeting messages to all other processes
    for(var p = 0; p < size; ++p) {
        if(p !== rank) {
            var greetings = "Greetings P" + p + " from P" + rank;
            klyng.send({to: p, data: greetings});
        }
    }

    for(var p = 0; p < size - 1; ++p) {
        var othersGreetings = klyng.recv();
        console.log(othersGreetings);
    }

    klyng.end();
}

klyng.init(main);
