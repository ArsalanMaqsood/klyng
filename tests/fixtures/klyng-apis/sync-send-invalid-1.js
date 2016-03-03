var klyng = require('../../../index.js');

function main() {
    klyng.send({data: "Hello"});
    klyng.end();
}

klyng.init(main);
