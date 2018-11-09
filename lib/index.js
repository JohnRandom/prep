#!/usr/bin/env node
'use strict';

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var crawlAndWrite = function () {
    var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2(configuration) {
        var _this = this;

        var dimensions, sitemapUrs, sm, app, server, credentials, promises;
        return _regenerator2.default.wrap(function _callee2$(_context2) {
            while (1) {
                switch (_context2.prev = _context2.next) {
                    case 0:

                        // prepare configuration
                        dimensions = (0, _assign2.default)({}, { width: 1440, height: 900 }, configuration.dimensions);

                        delete configuration.dimensions;

                        configuration = (0, _assign2.default)({}, {
                            routes: ['/'],
                            timeout: 1000,
                            dimensions: dimensions,
                            https: false,
                            hostname: 'http://localhost',
                            useragent: 'Prep',
                            minify: false,
                            concurrency: 4,
                            additionalSitemapUrls: []
                        }, configuration);

                        debug('Config prepared', configuration);

                        // render sitemap
                        sitemapUrs = configuration.routes.map(function (route) {
                            return { url: route };
                        }).concat(configuration.additionalSitemapUrls.map(function (route) {
                            return { url: route };
                        }));
                        sm = _sitemap2.default.createSitemap({
                            hostname: configuration.hostname,
                            urls: sitemapUrs
                        });

                        _mkdirp2.default.sync(targetDir);
                        _fs2.default.writeFileSync(targetDir + '/sitemap.xml', sm.toString());

                        debug('Sitemap created');

                        // start temporary local webserver
                        app = (0, _express2.default)().use((0, _serveStatic2.default)(buildDir)).use((0, _expressHistoryApiFallback2.default)('index.html', { root: buildDir }));
                        server = void 0;

                        if (configuration.https) {
                            credentials = {
                                key: _fs2.default.readFileSync(__dirname + '/../ssl/key.pem'),
                                cert: _fs2.default.readFileSync(__dirname + '/../ssl/cert.pem')
                            };

                            server = _https2.default.createServer(credentials, app);
                        } else {
                            server = _http2.default.createServer(app);
                        }

                        server.listen(_commander2.default.port);

                        debug('Server started');

                        // render routes
                        promises = configuration.routes.map(function (route) {
                            return (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee() {
                                var retryCount;
                                return _regenerator2.default.wrap(function _callee$(_context) {
                                    while (1) {
                                        switch (_context.prev = _context.next) {
                                            case 0:
                                                retryCount = 0;

                                            case 1:
                                                if (!(retryCount < 10)) {
                                                    _context.next = 14;
                                                    break;
                                                }

                                                _context.prev = 2;
                                                _context.next = 5;
                                                return prepRoute(route, configuration);

                                            case 5:
                                                return _context.abrupt('return');

                                            case 8:
                                                _context.prev = 8;
                                                _context.t0 = _context['catch'](2);

                                                retryCount++;
                                                console.warn('Retry ' + retryCount + ' for route: ' + route);

                                            case 12:
                                                _context.next = 1;
                                                break;

                                            case 14:
                                            case 'end':
                                                return _context.stop();
                                        }
                                    }
                                }, _callee, _this, [[2, 8]]);
                            }));
                        });

                        // clean up files

                        _context2.next = 17;
                        return _bluebird2.default.map(promises, function (fn) {
                            return fn();
                        }, { concurrency: configuration.concurrency });

                    case 17:
                        server.close();
                        _context2.next = 20;
                        return (0, _childProcessPromise.exec)('cp -rf "' + tmpDir + '"/* "' + targetDir + '"/');

                    case 20:
                        _context2.next = 22;
                        return (0, _childProcessPromise.exec)('rm -rf "' + tmpDir + '"');

                    case 22:
                        process.exit(0);

                    case 23:
                    case 'end':
                        return _context2.stop();
                }
            }
        }, _callee2, this);
    }));

    return function crawlAndWrite(_x) {
        return _ref.apply(this, arguments);
    };
}();

var prepRoute = function () {
    var _ref3 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3(route, configuration) {
        var nightmare, host, extraParams, baseUrl, url, content, filePath, minifyConfig, minifiedContent, logFileName;
        return _regenerator2.default.wrap(function _callee3$(_context3) {
            while (1) {
                switch (_context3.prev = _context3.next) {
                    case 0:
                        // remove leading slash from route
                        route = route.replace(/^\//, '');

                        nightmare = (0, _nightmare2.default)({
                            show: false,
                            switches: {
                                'ignore-certificate-errors': true
                            }
                        });


                        debug('Nightmare started');

                        host = configuration.hostname ? configuration.hostname : 'http' + (configuration.https ? 's' : '') + '://localhost:' + _commander2.default.port;
                        extraParams = process.env.EXTRA_PARAMS;
                        baseUrl = process.env.BASE_URL;
                        url = host + '/' + route;


                        if (baseUrl) {
                            url = host + '/' + baseUrl + '/' + route;
                        }
                        if (extraParams) {
                            url += '?' + extraParams;
                        }

                        console.log('### PREP ###', url);

                        _context3.next = 12;
                        return nightmare.useragent(configuration.useragent).viewport(configuration.dimensions.width, configuration.dimensions.height).goto(url).evaluate(function () {
                            return false;
                        }) // wait until page loaded
                        .wait(configuration.timeout).evaluate(function () {
                            return ['<!DOCTYPE html>', document.documentElement.outerHTML].join('');
                        }).end();

                    case 12:
                        content = _context3.sent;


                        debug('Crawling completed: %s', url);

                        filePath = _path2.default.join(tmpDir, route);

                        _mkdirp2.default.sync(filePath);

                        debug('Directory created: %s', filePath);

                        if (configuration.minify) {
                            minifyConfig = configuration.minify === true ? {} : configuration.minify;
                            minifiedContent = (0, _htmlMinifier.minify)(content, minifyConfig);

                            _fs2.default.writeFileSync(_path2.default.join(filePath, 'index.html'), minifiedContent);
                        } else {
                            _fs2.default.writeFileSync(_path2.default.join(filePath, 'index.html'), content);
                        }

                        logFileName = (route + '/index.html').replace(/^\//, '');

                        console.log('prep: Rendered ' + logFileName);

                    case 20:
                    case 'end':
                        return _context3.stop();
                }
            }
        }, _callee3, this);
    }));

    return function prepRoute(_x2, _x3) {
        return _ref3.apply(this, arguments);
    };
}();

var run = function () {
    var _ref4 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee4() {
        var config, fnConfig;
        return _regenerator2.default.wrap(function _callee4$(_context4) {
            while (1) {
                switch (_context4.prev = _context4.next) {
                    case 0:
                        _context4.prev = 0;

                        _commander2.default.version(version).description('Server-side rendering tool for your web app.\n  Prerenders your app into static HTML files and supports routing.').arguments('<build-dir> [target-dir]').option('-c, --config [path]', 'Config file (Default: prep.js)', 'prep.js').option('-p, --port [port]', 'Temporary webserver port (Default: 45678)', 45678).action(function (bdir, tdir) {
                            if (!bdir) {
                                console.log('No target directory provided.');
                                process.exit(1);
                            }

                            buildDir = _path2.default.resolve(bdir);
                            targetDir = tdir ? _path2.default.resolve(tdir) : buildDir;
                            tmpDir = _path2.default.resolve('.prep-tmp');
                        });

                        _commander2.default.parse(process.argv);

                        if (!buildDir) {
                            _commander2.default.help();
                        }

                        config = require(_path2.default.resolve(_commander2.default.config)).default;

                        if (!(typeof config === 'function')) {
                            _context4.next = 19;
                            break;
                        }

                        fnConfig = config();

                        if (!(_promise2.default.resolve(fnConfig) === fnConfig)) {
                            _context4.next = 15;
                            break;
                        }

                        _context4.next = 10;
                        return fnConfig;

                    case 10:
                        _context4.t0 = _context4.sent;
                        _context4.next = 13;
                        return crawlAndWrite(_context4.t0);

                    case 13:
                        _context4.next = 17;
                        break;

                    case 15:
                        _context4.next = 17;
                        return crawlAndWrite(fnConfig);

                    case 17:
                        _context4.next = 21;
                        break;

                    case 19:
                        _context4.next = 21;
                        return crawlAndWrite(config);

                    case 21:
                        _context4.next = 27;
                        break;

                    case 23:
                        _context4.prev = 23;
                        _context4.t1 = _context4['catch'](0);

                        console.log(_context4.t1);
                        process.exit(1);

                    case 27:
                    case 'end':
                        return _context4.stop();
                }
            }
        }, _callee4, this, [[0, 23]]);
    }));

    return function run() {
        return _ref4.apply(this, arguments);
    };
}();

var _commander = require('commander');

var _commander2 = _interopRequireDefault(_commander);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _https = require('https');

var _https2 = _interopRequireDefault(_https);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _serveStatic = require('serve-static');

var _serveStatic2 = _interopRequireDefault(_serveStatic);

var _expressHistoryApiFallback = require('express-history-api-fallback');

var _expressHistoryApiFallback2 = _interopRequireDefault(_expressHistoryApiFallback);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _childProcessPromise = require('child-process-promise');

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _sitemap = require('sitemap');

var _sitemap2 = _interopRequireDefault(_sitemap);

var _nightmare = require('nightmare');

var _nightmare2 = _interopRequireDefault(_nightmare);

var _htmlMinifier = require('html-minifier');

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = (0, _debug2.default)('prep');

var _require = require('../package.json'),
    version = _require.version;

var buildDir = void 0,
    targetDir = void 0,
    tmpDir = void 0;

run();
