process.send({type: "klyng:msg", header: {from: 1, to: 0}, data:"Fake Hello"});

console.log("Hello from Fake");
