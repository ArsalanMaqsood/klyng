process.on('message', function(msg) {
    console.log(msg.data);
    process.exit(0);
});

process.stdin.resume();
