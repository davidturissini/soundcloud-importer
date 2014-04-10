var Q = q = require('q');
var soundcloud = require('soundcloud').soundcloud;
var _ = require('underscore');
var Track = require('./Track');
var AdjacentArtists = require('./../collection/AdjacentArtists');
var Artists = require('./../collection/Artists');
var RequestQueue = require('./../util/RequestQueue');



var Artist = function (params) {

	for(var x in params) {
		if (params.hasOwnProperty(x)) {
			this[x] = params[x];
		}
	}

};


Artist.createIfNotExists = function (artistData) {

	var query = Artist.findOne({
		permalink:artistData.permalink
	});

	return query.exec()
		.then(function (artist) {
			var defer;

			if (artist) {
				return artist;
			}

			defer = Q.defer();

			artist = new Artist(artistData);

			console.log('saving artist', artist.permalink);
			artist.save(function () {
				console.log('artist saved', artist.permalink);
				defer.resolve();
			});

			return defer.promise;

		});

}

Artist.prototype.soundcloudGetTracks = function () {
	
	var trackParams = {
		'filter':'streamable',
		'duration[from]':1000*60*3,
		'duration[to]':1000*60*10
	};
	
	return soundcloud.joinPaginated('/users/' + this.permalink + '/tracks', 199, this.track_count, trackParams)
		.then(function (tracksData) {
			var tracks = [];

			tracksData.forEach(function (trackData) {
				tracks.push(new Track(trackData));
			});

			return tracks;
		});
};


Artist.create = function (artistData, options) {
	var params = {};
	options = options || {};
	

	if (options.select.length === 0) {
		params = artistData;
	} else {
		options.select.forEach(function (prop) {
			params[prop] = artistData[prop];
		});
	}

	return new Artist(params);
}

Artist.prototype.soundcloudGetAdjacentArtists = function (options) {
	options = _.extend({select:[]}, options || {});
	console.log('fetching ' + this.permalink);
	var artist = this;
	var max = 500;
	var limit = this.followers_count > max ? max : this.followers_count;
	var thisPermalink = this.permalink;

	return soundcloud.joinPaginated('/users/' + this.permalink + '/followers', 199, limit)
		.then(function (followers) {
			var queue = [];
			var defer = q.defer();
			var requestQueue;
			var followingsDictionary = {};

			function handleArtistCreate (artistData) {
				if (artistData.permalink === thisPermalink) {
					return;
				}

				return Artist.create(artistData, options);
			}

			function handleFollowings (followings) {
				
				var map = followings.map(handleArtistCreate);
				map = _.compact(map);


				for(var i = 0; i < map.length; i += 1) {
					if (followingsDictionary[map[i].permalink] === undefined) {
						followingsDictionary[map[i].permalink] = {
							artist:map[i],
							count:0,
							where:[]
						}
					}

					followingsDictionary[map[i].permalink].count += 1;
					followingsDictionary[map[i].permalink].where.push(this.permalink);
				}
	
			}

			var numRequests = 0;
			function eachFollower (follower) {
				var boundHandleFollowings = handleFollowings.bind(follower);
				numRequests += Math.ceil(follower.followings_count / 199);
				//console.log('fetching', follower.permalink, 'followings.', follower.followings_count, 'found');

				var promises = soundcloud.joinPaginatedPromises('/users/' + follower.permalink + '/followings', 199, follower.followings_count);
				var first = promises.shift();

				promises.forEach(function (promise, index) {
					requestQueue.add(function () {
						return promise().then(boundHandleFollowings);
					});
				});

				return first().then(boundHandleFollowings);
			}

			followers.forEach(function (follower) {
				queue.push(eachFollower.bind(undefined, follower));
			})


			requestQueue = new RequestQueue(queue, 200);
			requestQueue.on('done', defer.resolve.bind(defer));
			requestQueue.start();

			return defer.promise

				.then(function () {
					console.log('should have made', numRequests, 'requests');
					return new AdjacentArtists(artist, followingsDictionary);
				});

		});
}


Artist.prototype.soundcloudGetTracksAndFavorites = function () {
	console.log('fetching tracks for', this.permalink);
	return this.soundcloudGetTracks()

		.then(function (tracks) {
			console.log('fetching favorites for', this.permalink);
			return this.soundcloudGetFavorites()
				.then(function (favorites) {
					return tracks.concat(favorites);
				});
		}.bind(this));
};

Artist.prototype.soundcloudGetFavorites = function () {
	var artist = this;

	return soundcloud.api('/users/' + this.permalink + '/favorites')
		.then(function (favorites) {
			
			var tracks = [];

			favorites.forEach(function (favorite) {
				tracks.push(new Track(favorite));
			});

			return tracks;
			
		});
		
}

Artist.prototype.soundcloudGetFollowings = function () {
	
	return soundcloud.joinPaginated('/users/' + this.permalink + '/followings', 199, this.followings_count)
		.then(function (followings) {
			var artistsArray = _.map(followings, function (artist) {
				return new Artist(artist);
			});

			return new Artists(artistsArray);

		});
}


Artist.prototype.populateTracks = function () {
	var defer = Q.defer();

	if (this.tracks.length === 0) {
		defer.resolve(this.tracks);
	} else {
		this.populate('tracks', function () {
			defer.resolve(this.tracks);
		}.bind(this));
	}

	return defer.promise;
}

Artist.prototype.hasTrack = function (track) {
	var hasTrack = false;
	
	var incomingTrackPermalinkUrl = (track.permalink === undefined) ? track : track.permalink;


	this.tracks.forEach(function (track) {
		if (track.permalink === incomingTrackPermalinkUrl) {
			hasTrack = true;
		}
	});

	return hasTrack;

};

Artist.prototype.hasFollower = function (follower) {
	var hasFollower = false;
	var incomingFollowerPermalinkUrl = (follower.permalink === undefined) ? follower : follower.permalink;


	this.followers.forEach(function (follower) {
		if (follower.permalink === incomingFollowerPermalinkUrl) {
			hasFollower = true;
		}
	});

	return hasFollower;
}

Artist.prototype.hasFollowing = function (following) {
	var hasFollower = false;
	var incomingFollowerPermalinkUrl = (following.permalink === undefined) ? following : following.permalink;

	this.followings.forEach(function (following) {
		if (following.permalink === incomingFollowerPermalinkUrl) {
			hasFollower = true;
		}
	});

	return hasFollower;
}


module.exports = Artist;