var Track = function (params) {
    for(var x in params) {
        if (params.hasOwnProperty(x)) {
            this[x] = params[x];
        }
    }
}

Track.prototype = {};


module.exports = Track;