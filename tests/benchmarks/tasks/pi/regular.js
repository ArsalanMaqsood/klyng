function approx_pi(from, to) {
    var pi = 0;

    for(var i = from; i < to; ++i) {
        if((i + 1) % 2 == 0)
            pi += 1 / (2 * i - 1);
        else
            pi -= 1 / (2 * i - 1);
    }
    pi *= 4;

    return pi;
}


var start = Date.now();
var pi = approx_pi(1, 5000000000);
var end = Date.now();

console.log("Time: " + (end - start) / 1000 + " seconds");
