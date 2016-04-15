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
             ipc.of[id].on('connect', function() {
                 resolve(ipc.of[id]);
             });

             ipc.of[id].on('error', function(error) {
                if(ipc.of[id].retriesRemaining === 0) {
                    reject(error);
                }
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

  /*
   * carries the key exchange process between the communicating nodes
   * @param connection {Socket}: the socket to between the nodes
   * @return {Promise}: a promise of the shared secret
   */
  function exchangeKeyOver(connection) {
      return new Promise(function(resolve, reject) {
          var dhObj = utils.diffieHellman();
          var sharedPrime = dhObj.prime;
          var publicKey = dhObj.publicKey;

          connection.emit('KEY-EXT:PARAMS', {prime: sharedPrime, key: publicKey});
          connection.on('KEY-EXT:PUBLIC', function(data) {
              var sharedSecret = dhObj.computeSecret(data.key);
              resolve({connection: connection, secret: sharedSecret});
          });
      });
  }

  /*
   * authenticates and authorize access to remote node with password
   * @param connection {Socket}: the socket connecting to the remote node
   * @param secret {String}: the encryption seceret key
   * @param passwd {String}: the remote node password
   */
  function authOver(connection, secret, passwd) {
     return new Promise(function(resolve, reject) {
         connection.emit('AUTH', utils.secure({data: passwd}, secret));
         connection.on('AUTH:STATUS', function(data) {
             resolve({connection: connection, secret: secret, status: data.status});
         });
     });
  }

  /*
   * sends a job descriptor securly to a remote beacon over a given connection
   * @param connection {Socket}: the socket connection to the remote node
   * @param secret {String}: the encryption secret key
   * @param job {Object}: the job descriptor object
   * @param plan {Object}: the job plan object
   * @return {Promise}
  */
  function sendJobOver(connection, secret, job, plan) {
      return new Promise(function(resolve, reject) {

          var target_params = connection.path + "@" + connection.port;
          var modified_plan = {};

          for(var host in plan) {
              if(host === "local") {
                  // replace local with parent to refer to the parent node in target node
                  modified_plan.parent = plan.local;
              }
              else if(host === target_params) {
                  // replace the target node params in the plan with local
                  modified_plan.local = plan[host];
              }
              else {
                  // keep irrelevant hosts intact
                  modified_plan[host] = plan[host];
              }
          }

          job.plan = modified_plan;

          connection.emit('KLYNG:JOB', utils.secure({data: job}, secret));
          connection.on('JOB:ACK', function(data) {
              if(!data.status) {
                  reject(new Error(data.error));
              }
              else {
                  resolve(true);
              }
          });
      });
  }

  module.exports = {
      connectTo: connectTo,
      disconnectFrom: disconnectFrom,
      exchangeKeyOver: exchangeKeyOver,
      authOver: authOver,
      sendJobOver: sendJobOver
  };
