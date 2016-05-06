<p align='center'>
![klyng](https://googledrive.com/host/0BwJ57iK3uPsVUUkzRGJyZ0FEeTg/klyng-logo.png)
</p>

<p align='center'>
    [![Build Status](https://travis-ci.org/Mostafa-Samir/klyng.svg?branch=master)](https://travis-ci.org/Mostafa-Samir/klyng)

    [![Build status](https://ci.appveyor.com/api/projects/status/ni8fbuou6o2qns1t?svg=true)](https://ci.appveyor.com/project/Mostafa-Samir/klyng)

    ![Node Version >= 4.2.3](https://img.shields.io/badge/node-%3E%3D4.2.3-blue.svg)
</p>

<p align='center'> **Write and execute distributed code on *any*\* platform that can run node.js**
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

![Distributed Hello World](https://googledrive.com/host/0BwJ57iK3uPsVUUkzRGJyZ0FEeTg/dist-hello.gif)
