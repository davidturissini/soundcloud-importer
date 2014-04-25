var importTracksFromArtist = require('./import_tracks_from_artist');

exports.import = importTracksFromArtist.importTracksFromArtist
exports.findSimilarArtists = importTracksFromArtist.findAdjacentArtists;