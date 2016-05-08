# API Documentation

* [Environment Methods](#environment-methods)
    * [klyng.init(app_main)](#klynginitapp-main)
    * [klyng.size()](#klyngsize)
    * [klyng.rank()](#klyngrank)
    * [klyng.end()](#klyngend)
* [Communication Methods](#communicationmethods)
    * [klyng.send(message)](#klyngsendmessage)
    * [klyng.recv([criteria])](#klyngrecvcriteria)

## Environment Methods

### klyng.init(app_main)
Starts and initializes the klyng program.

**Parameter** `app_main` *{Function}*: The entry point function of the program.

---

### klyng.size()
Gets the size of the current job, which is the number of processes the current job was started with (the value of the `-n` option in the running command)

**Returns** *{Number}*: The job's size.

---

### klyng.rank()
Gets the rank of the calling process, which is a unique identifier given to the process form 0 to n-1 where n is the job's size.

**Returns** *{Number}*: The process' rank.

---

### klyng.end()
Marks the end of the klyng program and allows the process to exit.

## Communication Methods

### klyng.send(message)
Sends a message to another process in the job. Blocks the execution until the message is out of the process, so sending large messages would affect the performance.

**Parameter** `message` *{object}*: An object representing the message to be sent. The effective fields that would exist are:
* `to`: the rank of the process to which the message will be sent. **[required]**
* `data`: the data to be sent in the message. This can be any serializable data. **[required]**
* `subject`: An extra identifier for the message. This can be any data type that can be checked for equality in a shallow manner. *[optional]*

**Throws** `Error`: if one or more of the two required fields in the `message` argument is missing.

---

### klyng.recv([criteria])
Receives a message form another process in the job. Blocks the execution until a message that matches the given criteria is received.

**Parameter** `criteria` *{object}*: A representation of the message the process will be waiting for, it only has two effective fields:
* `from`: the rank of the process to wait for the message from.
* `subject`: the subject of the message to be waiting for.

If any of the fields of `criteria` is missing, klyng will wait for a message with **any** value of that field. For example, if `from` is missing, klyng will wait for a message form any source, the same is for `subject`. If nothing is passed to the method, klyng will wait for a message form any source with any subject.

**Returns** *{Object}*: the contents of the `data` field in the received message.

*Note*: While the execution is blocked waiting for a message, if a message that doesn't match the criteria of the current wait is received, this message will be queued for later use. Later, when another call to `klyng.recv` is made, it first checks that queue for the message it wants, if the message exist in the queue it will be immediately consumed, otherwise it'll block and wait.
