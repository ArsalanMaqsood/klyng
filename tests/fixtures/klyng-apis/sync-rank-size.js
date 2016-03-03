var klyng = require('../../../index.js');

function main() {
    console.log(klyng.rank() + ":" + klyng.size());
    klyng.end();
}

klyng.init(main);
