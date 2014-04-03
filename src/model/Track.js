var Q = require('q');


function createTrack (trackData, artistData) {


    var defer = Q.defer();
    var track = new Track(trackData);
    track.artist_permalink = artistData.permalink;

    track.save(function (err, result) {
        defer.resolve(track);
    });

    return defer.promise;

}



var Track = function (params) {
    for(var x in params) {
        if (params.hasOwnProperty(x)) {
            this[x] = params[x];
        }
    }
}

Track.create = createTrack;

Track.findOrCreate = function (trackData, artist) {
    if (!artist || (artist && !artist.permalink)) {
        throw new Error('Could not create track, artist not specified');
    }

    var query = Track.findOne({
        permalink_url:trackData.permalink_url
    });

    return query.exec()
        .then(function (track) {

            if (!track) {
                return Track.create(trackData, artist);

            }
            
            return track;
            
        });

    
}



module.exports = Track;