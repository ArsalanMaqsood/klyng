function approx_pi(from, to) {
    var pi = 0;
    var dx  = 0.0000000005;
    for(var x = from; x < to; x += dx) {
        pi += 4 / (1 + x * x);
    }

    return pi * dx;
}


var start = Date.now();
var pi = approx_pi(0, 1);
var end = Date.now();

console.log("Time: " + (end - start) / 1000 + " seconds");
