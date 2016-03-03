var fiber = require('fibers');
var utils = require('./lib/utils.js');

// holds the size of the job the process is participating in
var job_size = -1;

// holds the rank of the process inside the job
var process_rank = -1;

// holds the criteria of latest unmatched recieve request
var registered_sync_request = null;

// holds unexpected messages as they arrive to the process
var queue = [];

// the holds the fiber in which the klyng code runs
var process_fiber = undefined;

process.on('message', function(message) {
    if(message.type === 'klyng:msg') {
        if(utils.match(registered_sync_request, message.header)) {
            // reset and resume
            registered_sync_request = null;
            process_fiber.run(message.data);
        }
        else {
            queue.push(message);
        }
    }
});

/*
 * initiates the klyng app parameters and runs the app in a fiber
 * @param app_main {Function}: the entry function of the app
 */
function init(app_main) {

    // first check if the process is running as a child process with an open ipc
    if(!process.send) {
        console.log("klyng apps cannot be run directly with node");
        console.log("You must run it using klyng");
        process.exit(1);
    }
    else {
        // read the app parameters from the process arguments
        job_size = parseInt(process.argv[2]);
        process_rank = parseInt(process.argv[3]);

        process_fiber = fiber(app_main);
        process_fiber.run();
    }
}

/*
 * returns the size of the job the process is participating in
 * @retrun {Number}
 */
function size() {
    return job_size;
}

/*
 * returns the rank of the process in the job
 * @return {Number}
 */
function rank() {
    return process_rank;
}

/*
 * dispatches a message to the beacon process to be routed to the intended process
 * @param message {Object}: the message object to be sent
 */
function send(message) {
    /*
     * the message object contains the following keys
     * to {Number}: the rank of the process to recive that message (required)
     * data {Any JSON serializable data}: the data to be sent (required)
     * subject {String}: a mark for the message (optional)
     */
     if((!message.to && message.to !== 0) || (!message.data && message.data !== 0)) {
         throw new Error("'to' or 'data' fields are missing from the message");
     }

     var enveloped_message = {
         type: 'klyng:msg',
         header: {
             from: process_rank,
             to: message.to
         },
         data : message.data
     };

     if(!!message.subject)
        enveloped_message.header.subject = message.subject;

     process.send(enveloped_message);
}

/*
 * consumes a matching message from the queue or blocks and waits for the message to arrive
 * @param criteria {Object}: contains the criteria of the message to be recieved (optional)
 * @return {Any JSON serializable data}: the message's data
 */
function recv(criteria) {
    /*
     * the criteria object may containe:
     * @key from {Number}: the source of the message to be received (any source if ommitted or -1)
     * @key subject {String}: the subject of the message to be received (any subject if omitted or "-1")
     * if the criteria object wasn't provided, a default criteria of any source, any subject will be used
     */
    var default_criteria = {
        from : -1,  // from any source
        subject: "-1", // with any subject
    };

    var used_criteria = utils.blend(default_criteria, criteria);

    // first check the queue for a message matching the criteria
    // TODO: come up with a more effcient and scalable implementation for the queue checking
    var queue_size = queue.length;
    for(var i = 0; i < queue_size; i++) {
        var message = queue[i];
        if(utils.match(used_criteria, message.header)) {
            queue.splice(i, 1);  // removes the message from the queue
            return message.data;
        }
    }

    // if no matching messsage was found in the queue
    // register the criteria for upcoming messages
    registered_sync_request = used_criteria;

    // block the execution
    return fiber.yield();
}

/*
 * marks the end of the klyng app
 */
function end() {
    process.exit(0);
}

module.exports = {
    init: init,
    size: size,
    rank: rank,
    send: send,
    recv: recv,
    end: end
};
