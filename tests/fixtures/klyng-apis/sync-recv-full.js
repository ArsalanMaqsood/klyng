var klyng = require('../../../index.js');

function main() {

    var msg = klyng.recv({from: 5, subject: "sub2"});

    console.log(msg);

    klyng.end();
}

klyng.init(main);
