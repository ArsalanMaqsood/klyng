var klyng = require('../../../index.js');

function main() {
    klyng.send({to: 1});
    klyng.end();
}

klyng.init(main);
