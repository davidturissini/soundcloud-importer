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
				});

				foundTracks.push(track);
				
				
			});

			return foundTracks;
		})

}


function importTracksFromArtist (artistPermalink, edgeLimit) {
	var totalFollowings = [];
	var numFetched = 0;
	var artist;
	var importedArtists;


	return soundcloud.api('/users/' + artistPermalink)

		.then(function (artistData) {
			artist = new Artist(artistData);
			console.log(artist);
		})

		.then(function () {
			return artist.soundcloudGetAdjacentArtists({
				select:['permalink', 'track_count', 'followers_count', 'followings_count']
			});
		})

		.then(artistAdjacentArtistsReady.bind(undefined, edgeLimit, artistPermalink))

		.fail(function (e) {
			console.log(e.stack);
		})
	

}

module.exports = importTracksFromArtist;