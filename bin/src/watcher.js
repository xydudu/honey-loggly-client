'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _net = require('net');

var _net2 = _interopRequireDefault(_net);

require('babel-polyfill');

var _package = require('../package.json');

var _tail = require('tail');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DEFAULT_LOG_PATTEN = 'honey-loggly';

var _class = function () {
    function _class(_conf) {
        _classCallCheck(this, _class);

        this.app_logs = this.constructor.getConfig();
        this.log_streams = this.app_logs.map(function (_item) {
            _item.streams = new _tail.Tail(_item.path);
            return _item;
        });
        this.reconnect_times = 0;
    }

    /*
     * get log path and options from package.json
     * @params none
     * @return Object
     *
     * */


    _createClass(_class, [{
        key: '_connect',
        value: function () {
            var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee() {
                var _, conn;

                return regeneratorRuntime.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                _ = this;
                                conn = new _net2.default.Socket();

                                conn.on('error', function (err) {
                                    console.warn('日志接收服务器失联，2秒后重试...');
                                    if (_.reconnect_times > 10) {
                                        console.error('日志接收服务器可能死了！');
                                        conn.destroy();
                                        return false;
                                    }
                                    setTimeout(function () {
                                        console.log('reconnect server ...');
                                        _._connect();
                                        _.reconnect_times++;
                                    }, 2000);
                                });
                                console.log('\u8FDE\u63A5\u670D\u52A1\u5668\uFF1A' + _package.server.host + ':' + _package.server.port);
                                _context.next = 6;
                                return conn.connect(_package.server.port, _package.server.host, function () {
                                    console.log('日志接收服务器连接成功！');
                                });

                            case 6:
                                return _context.abrupt('return', conn);

                            case 7:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this);
            }));

            function _connect() {
                return _ref.apply(this, arguments);
            }

            return _connect;
        }()
    }, {
        key: '_send',
        value: function _send(_msg) {
            this.connection.then(function (_conn) {
                _conn.write(_msg);
            });
        }
    }, {
        key: '_isTheLog',
        value: function _isTheLog(_pattern, _data) {
            if (_pattern === 'all') return true;
            var escape = ('[' + _pattern + ']').replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
            var re = new RegExp('^' + escape);
            return re.test(_data);
        }
    }, {
        key: 'run',
        value: function run() {
            var _ = this;
            _.connection = this._connect();
            _.log_streams.forEach(function (_item) {
                _item.streams.on('line', function (_data) {
                    if (_._isTheLog(_item.pattern, _data)) {
                        //let msg = `${_item.app_name}: ${_data}`
                        var msg = _data;
                        //console.log(msg)
                        _._send(msg);
                    }
                });
                _item.streams.on('error', function (_err) {
                    console.warn('[failed] ' + _item.app_name + ': ' + _data);
                    console.warn('[failed detail] ' + _item.app_name + ': ' + _err);
                });
            });
        }
    }, {
        key: 'close',
        value: function close() {
            this.log_streams.forEach(function (_item) {
                _item.streams.unwatch();
            });
        }
    }], [{
        key: 'getConfig',
        value: function getConfig() {
            if (!_package.logs) {
                console.error('请先在package.json里配置logs路径');
                return false;
            }
            var keys = Object.keys(_package.logs);
            var logs_arr = keys.map(function (_key) {
                var item = { app_name: _key };
                if (typeof _package.logs[_key] === 'string') {
                    item.path = _package.logs[_key];
                    item.pattern = DEFAULT_LOG_PATTEN;
                } else {
                    item = Object.assign(item, _package.logs[_key]);
                }
                return item;
            });
            logs_arr = logs_arr.filter(function (_item) {
                var is_exists = _fs2.default.existsSync(_item.path);
                if (!is_exists) {
                    console.warn(_item.app_name + ' \u914D\u7F6E\u7684\u65E5\u5FD7\u8DEF\u5F84\u627E\u4E0D\u5230\uFF01');
                }
                return is_exists;
            });
            return logs_arr;
        }
    }]);

    return _class;
}();

exports.default = _class;