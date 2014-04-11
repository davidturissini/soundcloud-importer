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
				// Check if we got an error from soundcloud
				if (followings.error) {
					return;
				}
				
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
					return new AdjacentArtists(artist, followingsDictionary);
				});

		});
}


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


module.exports = Artist;