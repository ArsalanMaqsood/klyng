var klyng = require('../../../index.js');

function main() {

    var msg = klyng.recv({subject: "sub2"});

    console.log(msg);

    klyng.end();
}

klyng.init(main);
