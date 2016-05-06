<p align='center'>
    <img src='https://googledrive.com/host/0BwJ57iK3uPsVUUkzRGJyZ0FEeTg/klyng-logo.png' alt='klyng'>
</p>

<p align='center'>
    <a href='https://travis-ci.org/Mostafa-Samir/klyng'>
        <img src='https://travis-ci.org/Mostafa-Samir/klyng.svg?branch=master' alt='Build Status'>
    </a>

    <a href='https://ci.appveyor.com/project/Mostafa-Samir/klyng'>
        <img src='https://ci.appveyor.com/api/projects/status/ni8fbuou6o2qns1t?svg=true' alt='Build Status'>
    </a>

    <img src='https://img.shields.io/badge/node-%3E%3D4.2.3-blue.svg' alt='Node Version >= 4.2.3'>
</p>

<p align='center'>
    <strong>Write and execute distributed code on <i>any</i>* platform that can run node.js</strong>
</p>

# Distributed Hello World!

```javascript
var klyng = require('klyng');

function main() {
    var size = klyng.size();
    var rank = klyng.rank();

    console.log("Hello World! I'm Process %d-%d", rank, size);

    klyng.end();
}

klyng.init(main);
```
<p align='center'>
    <img src='https://googledrive.com/host/0BwJ57iK3uPsVUUkzRGJyZ0FEeTg/dist-hello.gif' alt='Distributed Hello World'>
</p>
