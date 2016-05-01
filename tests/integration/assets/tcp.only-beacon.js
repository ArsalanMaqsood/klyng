var tcp = require('../../../lib/tcp');
console.log(process.argv[2]);
var customConfig = {
    port: parseInt(process.argv[2]),
    password: "dummy"
};

tcp.start(customConfig);
