var EventEmitter = require('events').EventEmitter;

function RequestQueue (queue, max) {
	this._queue = queue;
	this._max = max;
	this._out = 0;
}


RequestQueue.prototype = Object.create(EventEmitter.prototype);

RequestQueue.prototype._functionDone = function () {
	this._out -= 1;

	if (this._out === 0 && this._queue.length === 0) {
		this.emit('done');
	} else if (this._queue.length > 0) {
		this._execute(this._queue.shift());
	}
			
}

RequestQueue.prototype.add = function (func) {
	this._queue.push(func);
}


RequestQueue.prototype._execute = function (func) {

	this._out += 1;
	func().then(this._functionDone.bind(this))

	.fail(function (e) {
		console.log(e.stack);
	})
};

RequestQueue.prototype.start = function () {
	this._queue.splice(0, this._max).forEach(this._execute.bind(this));
};

module.exports = RequestQueue;