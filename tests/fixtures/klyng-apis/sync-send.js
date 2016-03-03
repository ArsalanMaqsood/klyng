var klyng = require('../../../index.js');

function main() {
    klyng.send({to: 1, data: "Hello"});
    klyng.end();
}

klyng.init(main);
