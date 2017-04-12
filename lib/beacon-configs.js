var fs = require('fs');

/*
 * configures an ipc with the configurations specific to remote communincation
 * @param ipc {IPC}: the ipc to be configured
*/
function configureRemoteIPC(ipc) {
    ipc.config.maxRetries = 3;
    ipc.config.retry = 600;
    //ipc.config.silent = true;
}

function configureLocalIPC(ipc) {
    ipc.config.sync = true;
    //ipc.config.silent = true;
    ipc.config.id = 'klyng_beacon';
    ipc.config.maxRetries = 0;
}

// read and parse the configurations file
var configs_data = fs.readFileSync(__dirname + "/../config.json", "utf8");
var configs = JSON.parse(configs_data);

module.exports = {
    klyngConfigs: configs,
    configureRemoteIPC: configureRemoteIPC,
    configureLocalIPC: configureLocalIPC
};
