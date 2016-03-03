var commandLineArgs = require('command-line-args');

var parameters = new commandLineArgs([

    {
        name: "help",
        alias: "h",
        type: Boolean,
        description: "shows this help guide and exits"
    },

    {
        name: "num-processes",
        alias: "n",
        type: Number,
        description: "sets the number of processes to run"
    },

    {
        name: "app",
        alias: "a",
        type: String,
        defaultOption: true,
        description: "sets the path to the klyng app entry point"
    },

    {
        name: "beacon-up",
        alias: "u",
        type: Boolean,
        description: "starts the beacon to listen for incoming jobs/messages"
    },

    {
        name: "beacon-down",
        alias: "d",
        type: Boolean,
        description: "stops the running beacon"
    }
]);

module.exports = parameters;
