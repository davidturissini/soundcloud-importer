var RequestQueue = require('./../../src/util/RequestQueue');
var q = require('q');

var queue = [];

for(var i = 0; i < 10; i += 1) {
	queue.push(function (n) {
		var defer = q.defer();

		console.log(n);
		setTimeout(function () {
			defer.resolve();
		}, 100 * n);

		return defer.promise;
	}.bind(undefined, i));
}

var rq = new RequestQueue(queue, 10);
rq.on('done', function () {
	console.log('done');
});

rq.start();