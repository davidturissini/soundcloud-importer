var _ = require('underscore');
var clusterfck = require('clusterfck');
var Artists = require('./Artists');

function AdjacentArtists (mainArtist, artists) {
	this._mainArtist = mainArtist;
	this._artists = artists;
	this._count = null;
	this._blacklist = [
		'flux-pavilion',
		'skrillex',
		'soundcloud',
		'diplo'
	];
}

AdjacentArtists.prototype = {

	add: function (artist) {
		this._artists.push(artist);
		this._sorted = null;
	},


	sort: function () {
		if (this._sorted !== null) {
			return this._sorted;
		}

		var followingsArray = [];
		
		for(var permalink in this._artists) {
			if (this._artists.hasOwnProperty(permalink) && this._artists[permalink].artist.track_count !== 0) {
				followingsArray.push(this._artists[permalink]);
			}
		}

		this._sorted = followingsArray;
		return this._sorted;
	},


	getCluster: function (edgeLimit) {
		edgeLimit = edgeLimit || 40;
		var followingsArray = this.sort();
		var popularThreshold = 50000;
		var minTrackCount = 5;

		var sortedByCount = _.sortBy(followingsArray, function (a) {
			if (a.artist.permalink === 'undefined' || a.artist.followers_count < 2000 || a.artist.track_count < minTrackCount || this._blacklist.indexOf(a.artist.permalink) !== -1) {
				return 1;
			}

			return -a.count;

		}.bind(this));


		var sortedByPercentage = _.sortBy(followingsArray, function (a) {
			var percentage
			if (a.artist.permalink === 'undefined' || a.artist.followers_count < 2000 || a.artist.track_count < minTrackCount || this._blacklist.indexOf(a.artist.permalink) !== -1) {
				return 1;
			}

			percentage = ((a.count / a.artist.followers_count) * 100);
			a.score = percentage;

			return -a.score;
		}.bind(this));

		if (this._mainArtist.followers_count < popularThreshold) {
		
			var intersection = _.intersection(sortedByCount.splice(0, Math.round(sortedByCount.length * 0.4)), sortedByPercentage.splice(0, Math.round(sortedByCount.length * 0.4)));
			
			if (intersection.length < edgeLimit) {
				intersection = intersection.concat(sortedByPercentage.splice(0, edgeLimit + intersection.length));
			}

			intersection = _.sortBy(intersection, function (a) {
				return -a.score;
			});

		} else {
			if (this._mainArtist.followers_count > popularThreshold || this._mainArtist.followings_count === 0) {
				var data = [];
				sortedByCount.forEach(function (artistData) {
					var d = [1, 1, artistData.count];
					d.artist = artistData.artist;
					data.push(d);
				});

				var clusters = clusterfck.kmeans(data, 2);

				var clusterIndex = (clusters[0][0][2] > clusters[1][0][2]) ? 0 : 1;
				intersection = clusters[clusterIndex];
			}
		}
		

		var spliced;
		spliced = _.uniq(intersection).splice(0, edgeLimit);


		spliced = _.map(spliced, function (clusterData) {
			return clusterData.artist;
		});


		return new Artists(spliced);
	}

};

module.exports = AdjacentArtists;