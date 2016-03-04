var ipc = require('node-ipc');

/*
 * stores information about the location of participating processes in the job
 * each process key has a value of either 'local' or 'remote'
 * a special 'parent' key is present for the location of the klyng process
 */
var meta_routing_table = {};

/*
 * stores the ipc channels of each local process participating in the job
 * @key {String}: 'proc' + process rank
 * @value {ChildProcess}: a refernce to the process
 */
var locals_routiung_channels = {};

/*
 * stores the ipc tcp channels of each remote beacon participating in the job
 * @key {String}: 'sock_' + ip:port
 * @value {Socket}
 */
var remote_routing_channels = {};

// holds a reference to the socket connected to klyng process
// to send monitoring messages across
var monitor_socket = null;

/*
 * checks if the routing data structures are empty
 * @return {Boolean}: true if empty, false otherwise
 */
function isClean() {
    var clean_meta = !Object.keys(meta_routing_table).length;
    var clean_locals = !Object.keys(locals_routiung_channels).length;
    var clean_remotes = !Object.keys(remote_routing_channels).length;
    var clean_monitor = (monitor_socket === null);

    return clean_meta && clean_locals && clean_remotes && clean_monitor;
}

/*
 * checks if the routing table contains remote members
 * @return {Boolean}: true if it has remotes, false otherwise
 */
 function hasRemotes() {
     return !Object.keys(remote_routing_channels).length;
 }

/*
 * builds a pure local routing table for jobs with no remotes
 * @param size {Number}: the size of the job
 * @return {Object}: the built table;
 */
function buildPureLocalTable(size) {
    var pureLocal = {};
    for(var id = 0; id < size; id++)
        pureLocal['proc' + id] = 'local';
    pureLocal.parent = 'local';

    return pureLocal;
}

/*
 * sets the meta routing table
 * @param table {Object}: the new job's table
 */
function setMetaTable(table) {
    meta_routing_table = table;
}

/*
 * sets the routing socket of the table
 * @param socket {Socket}
 */
function setMonitorSocket(socket) {
    monitor_socket = socket;
}

/*
 * sets a local channel of a process
 * @param rank {Number}
 * @param proc {ChildProcess}
 */
function setLocalChannel(rank, proc) {
    locals_routiung_channels['proc' + rank] = proc;
}

/*
 * sets a remote channel of a beacon
 * @param id {String}: the identifing 'ip:port' connection string
 * @param sock {Socket}: the socket to the beacon
 */
 function setRemoteChannel(id, sock) {
     remote_routing_channels['sock_' + id] = sock;
 }

/*
* clears the router data structures
*/
function clear() {
    meta_routing_table = {};
    locals_routiung_channels = {};
    remote_routing_channels = {};
    monitor_socket = null;
}

/*
 * routes a message to the parent process
 * @param id {Number}: the job's id
 * @param message {Object}: the message to be routed
 */
 function routeToParent(message) {
    if(meta_routing_table.parent === 'local') {
        ipc.server.emit(monitor_socket, 'MONITOR:MSG', message);
    }
    else {
        monitor_socket.emit('MONITOR:MSG', message);
    }
}

/*
 * routes a message to a process by rank
 * @param to {Number}: the recepient's rank
 * @param msg {Object}: the message to route
 */
function routeTo(to, msg) {
    if(meta_routing_table['proc' + to] === 'local') {
        locals_routiung_channels['proc' + to].send(msg);
    }
    else {
        var id = meta_routing_table['proc' + to];
        remote_routing_channels['sock_' + id].emit('KLYNG:MSG', msg);
    }
}

module.exports = {
    isClean: isClean,
    hasRemotes: hasRemotes,
    buildPureLocalTable: buildPureLocalTable,
    setMetaTable: setMetaTable,
    setMonitorSocket: setMonitorSocket,
    setLocalChannel: setLocalChannel,
    setRemoteChannel: setRemoteChannel,
    clear: clear,
    routeToParent: routeToParent,
    routeTo: routeTo
};
