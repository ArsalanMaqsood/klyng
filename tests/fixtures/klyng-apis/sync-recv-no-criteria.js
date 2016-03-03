var klyng = require('../../../index.js');

function main() {

    var msg = klyng.recv();

    console.log(msg);

    klyng.end();
}

klyng.init(main);
