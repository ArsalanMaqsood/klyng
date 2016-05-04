var crypto = require('crypto');

/*
 * blends two objects together, with second overriding the first
 * @param first {Object}
 * @param second {Object}
 */
function blend(first, second) {
    var mix = {};

    for(var key in first)
        mix[key] = first[key];
    for(var key in second)
        mix[key] = second[key];

    return mix;
}

/*
 * matches a criteria object with a message header
 * @param criteria {Object}
 * @param header {Object}
 * @return {Boolean}: true if they match, false otherwise
 */
function match(criteria, header) {
    var matches_source = (criteria.from === header.from || criteria.from === -1);
    var matches_subject = (criteria.subject === header.subject || criteria.subject === "-1");

    return matches_source && matches_subject;
}

/*
 * encrypts a message and signs it with HMAC
 * @param msg {Object}: the message to be secured
 * @param key {String}: the secret key to be used
 * @return {Object}: the secured message
 */
function secure(msg, key) {
    var cipher = crypto.createCipher('aes-256-ctr', key);
    var hmac = crypto.createHmac('sha256', key);
    var plaintext = (typeof msg === "object") ? JSON.stringify(msg) : msg.toString();

    var ciphertext = cipher.update(plaintext, 'utf8', 'base64') + cipher.final('base64');

    hmac.update(ciphertext);
    var mac = hmac.digest('base64');

    return {payload: ciphertext, mac: mac};
}

/* verifies an encrypted message and decryptes it if verified
 * @param msg {Object}: the encrypted message
 * @param key {String}: the secret key to be used
 * @return {Object|Boolean}: the decrypted message if verified, false otherwise
 */
function verify(msg, key) {
    var hmac = crypto.createHmac('sha256', key);

    hmac.update(msg.payload);
    var mac = hmac.digest('base64');

    if(mac === msg.mac) {
        var decipher = crypto.createDecipher('aes-256-ctr', key);
        var plaintext = decipher.update(msg.payload, 'base64', 'utf8') + decipher.final('utf8');

        // attempt to parse as json
        try {
            return JSON.parse(plaintext);
        }
        catch(err) {
            // if failed, return plaintext directly
            return plaintext;
        }
    }

    return false;
}

/*
 * returns a wrapper over crypto.DiffieHellman
 * @param prime {String}: a prime number to initialize with (optional)
 * @return {Object}
 */
function diffieHellman(prime) {
    var dhObj = null;
    var wrapper = {};

    if(!!prime)
        dhObj = crypto.createDiffieHellman(prime, 'base64');
    else
        dhObj = crypto.createDiffieHellman(512);

    wrapper.prime = dhObj.getPrime('base64');
    wrapper.publicKey = dhObj.generateKeys('base64');

    wrapper.computeSecret = function(remotePublicKey) {
        return dhObj.computeSecret(remotePublicKey, 'base64', 'base64');
    };

    return wrapper;
}

module.exports = {
    blend: blend,
    match: match,
    startTimeout: startTimeout,
    stopTimeout: stopTimeout,
    secure: secure,
    verify: verify,
    diffieHellman: diffieHellman
};
