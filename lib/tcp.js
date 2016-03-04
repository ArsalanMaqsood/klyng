var ipc = require('node-ipc');
var utils = require('./utils');

ipc.config.silent = false;

/*
 * connects to a remote beacon via ip:port
 * @param ip {String}
 * @param port {Number}
 * @return {Promise}: promise of the connection to be made
 */
 function connectTo(ip, port) {
     return new Promise(function(resolve, reject) {
        var id = "sock_" + ip + ":" + port;

        ipc.connectToNet(id, ip, port, function() {

            ipc.of[id].emit("PROBE:MSG", {});

            utils.startTimeout(function() {
                resolve(false);
                ipc.disconnect(id);
            });

            ipc.of[id].on('ALIVE:MSG', function(data) {
                utils.stopTimeout();
                resolve(ipc.of[id]);
            });
        });

     });
 }

 /*
  * disconnects from a remote beacon identified by ip:port
  * @param ip {String}
  * @param port {Number}
  */
  function disconnectFrom(ip, port) {
      var id = "sock_" + ip + ":" + port;
      ipc.disconnect(id);
  }

  module.exports = {
      connectTo: connectTo,
      disconnectFrom: disconnectFrom
  };
