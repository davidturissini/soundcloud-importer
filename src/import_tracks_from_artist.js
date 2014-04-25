var soundcloud = require('soundcloud').soundcloud;
var Artist = require('./model/Artist');

soundcloud.configure({
	client_id:'99308a0184193d62e064cb770f4c1eae'
});


function artistAdjacentArtistsReady (edgeLimit, artistPermalink, adjacentArtists) {
	var artists = adjacentArtists.getCluster(edgeLimit);
	var queue = [];
	var numExecuted = 0;
	var foundTracks = [];


	return artists.soundcloudGetTracks()
		.then(function (tracks) {
			tracks.forEach(function (track) {
				var ranking;
				artists.each(function (artist, index) {
					if (artist.permalink === track.user.permalink) {
						ranking = (edgeLimit - index);
					}

					track.ranking = ranking;
				});

				foundTracks.push(track);
				
				
			});

			return foundTracks;
		})

}


function findAdjacentArtists (artistPermalink) {
	var artist;
	return soundcloud.api('/users/' + artistPermalink)

		.then(function (artistData) {
			artist = new Artist(artistData);
		})

		.then(function () {
			return artist.soundcloudGetAdjacentArtists({
				select:['permalink', 'track_count', 'followers_count', 'followings_count']
			});
		})
}


function importTracksFromArtist (artistPermalink, edgeLimit) {
	edgeLimit = edgeLimit || 50;
	var time = new Date().getTime();


	return findAdjacentArtists(artistPermalink)

		.then(artistAdjacentArtistsReady.bind(undefined, edgeLimit, artistPermalink))

		.then(function (a) {
			console.log('time:', new Date().getTime() - time);
			return a;
		})

		.fail(function (e) {
			console.log(e.stack);
		})
	

}

exports.importTracksFromArtist = importTracksFromArtist;
exports.findAdjacentArtists = findAdjacentArtists;