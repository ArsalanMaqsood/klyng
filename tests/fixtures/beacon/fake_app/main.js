var fiber = require('fibers');
var localDep = require('./local-dep')

console.log(!!fiber.yield ? "endency": "?!");
