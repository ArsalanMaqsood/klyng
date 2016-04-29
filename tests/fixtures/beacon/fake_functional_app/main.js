var klyng = require('../../../../index');

function main() {

    klyng.send({to: 0, data: "Weee!"});

    klyng.end();
}

klyng.init(main);
