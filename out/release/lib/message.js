// Generated by CoffeeScript 1.6.3
var EventEmitter, Frame, Message, inflate, os, unpack, zlib, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

os = require('options-stream');

zlib = require('zlib');

EventEmitter = require('events').EventEmitter;

_ref = require('./frame'), unpack = _ref.unpack, inflate = _ref.inflate, Frame = _ref.Frame;

Message = (function(_super) {
  __extends(Message, _super);

  function Message(socket, options) {
    var frame,
      _this = this;
    this.socket = socket;
    this.options = os({
      deflate: true,
      min_deflate_length: 32,
      close_timeout: 100
    }, options);
    frame = null;
    this.inflate = zlib.createInflateRaw({
      chunkSize: 128 * 1024
    });
    socket.on('data', function(chunk) {
      var _ref1, _results;
      _results = [];
      while (chunk && chunk.length) {
        _ref1 = unpack(chunk, frame), frame = _ref1[0], chunk = _ref1[1];
        if (frame.done) {
          inflate(frame, _this.inflate, function(err, f) {
            if (err) {
              return _this.emit('error', err);
            }
            return _this.onFrame(f);
          });
          _results.push(frame = null);
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    });
    socket.on('error', function(err) {
      return _this.emit('error', err);
    });
    socket.on('close', function() {
      return _this.emit('close');
    });
  }

  Message.prototype.write = function(data, opcode, mask, cb) {
    var frame,
      _this = this;
    if (typeof mask === 'function') {
      cb = mask;
      mask = null;
    }
    switch (typeof opcode) {
      case 'function':
        cb = opcode;
        opcode = null;
        break;
      case 'boolean':
        mask = opcode;
        opcode = null;
    }
    if (opcode == null) {
      opcode = 'text';
    }
    if (mask == null) {
      mask = false;
    }
    frame = new Frame({
      data: data,
      opcode: opcode,
      fin: true,
      mask: mask,
      minDeflateLength: this.options.min_deflate_length
    });
    frame.pack(this.options.deflate, function(err, bin) {
      if (err) {
        if (cb) {
          cb(err);
        }
        return;
      }
      _this.socket.write(bin);
      if (cb) {
        return cb(null);
      }
    });
  };

  Message.prototype.ping = function(cb) {
    this.write('', 'ping', false, cb);
  };

  Message.prototype.pong = function(cb) {
    this.write('', 'pong', false, cb);
  };

  Message.prototype["continue"] = function(cb) {
    this.write('', 'continue', false, cb);
  };

  Message.prototype.writeRaw = function(bin) {
    return this.socket.write(bin);
  };

  Message.prototype.end = function(data, opcode, mask) {
    var _this = this;
    if (data != null) {
      this.write(data, opcode, mask, function() {
        return _this.close();
      });
    } else {
      this.close();
    }
  };

  Message.prototype.close = function() {
    var closed,
      _this = this;
    closed = false;
    return this.write('', 'close', false, function() {
      var timer;
      _this.socket.on('close', function(err) {
        clearTimeout(timer);
        closed = true;
        return _this.emit('closed', err);
      });
      return timer = setTimeout(function() {
        if (closed) {
          return;
        }
        return _this.socket.end();
      }, _this.options.close_timeout);
    });
  };

  Message.prototype.onFrame = function(frame) {
    switch (frame.opcode) {
      case 'text':
        this.emit('message', frame.data.toString(), this);
        break;
      case 'binary':
        this.emit('message', frame.data, this);
        break;
      case 'ping':
        this.emit('ping');
        break;
      case 'pong':
        this.emit('pong');
        break;
      case 'close':
        this.socket.end();
        this.emit('close');
        break;
      case 'continue':
        this.emit('continue');
    }
  };

  Message.prototype.reset = function(options) {
    this.options = os(this.options, options);
    return this.__QWS_CB = options.cb;
  };

  Message.prototype.errorHandle = function(msg) {
    if (msg) {
      this.write(msg);
    }
    return this.close();
  };

  return Message;

})(EventEmitter);

exports.Message = Message;
