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

module.exports = {
    blend: blend,
    match: match
};
