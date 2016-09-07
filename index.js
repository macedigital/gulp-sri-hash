'use strict';

var fs = require('fs');
var crypto = require('crypto');
var path = require('path');
var through = require('through2');
var cheerio = require('cheerio');
var PluginError = require('gulp-util').PluginError;

var PLUGIN_NAME = 'gulp-sri-hash';
var DEFAULT_ALGO = 'sha384';
var DEFAULT_SELECTOR = 'link[href][rel=stylesheet]:not([integrity]), script[src]:not([integrity])';
var supportedAlgos = ['sha256', 'sha384', 'sha512'];
var cache;

module.exports = gulpSriHashPlugin;
module.exports.PLUGIN_NAME = PLUGIN_NAME;

function resolvePath(node, config) {
  var src = node.name == 'script' ? node.attribs.src : node.attribs.href;

  if (!src) {
    return null;
  }

  // strip prefix if present and match
  if (config.prefix.length && src.indexOf(config.prefix) === 0) {
    src = src.slice(config.prefix.length);
  }

  // ignore paths that look like like urls as they cannot be resolved on local filesystem
  if (src.match(/^(https?:)?\/\//)) {
    return null;
  }

  // make path "rel-absolute"
  if (src.charCodeAt(0) !== 47) {
    src = '/' + src;
  }

  return src;
}

function calculateSri(fullPath, algorithm) {
  var file = fs.readFileSync(fullPath);
  var digest = crypto.createHash(algorithm).update(file).digest();

  return Buffer.from(digest).toString('base64');
}

function getFileHash(fullPath, algorithm) {
  if (!cache[fullPath]) {
    cache[fullPath] = [
      algorithm,
      calculateSri(fullPath, algorithm)
    ].join('-');
  }

  return cache[fullPath];
}

function updateDOM(file, config) {
  var $ = cheerio.load(file.contents);
  var $candidates = $(config.selector);

  if ($candidates.length > 0) {
    $candidates.each(addIntegrityAttribute);
    file.contents = Buffer.from($.html());
  }

  return file;

  function addIntegrityAttribute(idx, node) {
    var localPath = resolvePath(node, config);

    if (localPath) {
      $(node).attr('integrity', getFileHash(path.normalize(file.base + localPath), config.algo));
    }
  }
}

function configure(options) {
  var opts = options || {};
  var config = {
    algo: opts.algo || DEFAULT_ALGO,
    prefix: opts.prefix || '',
    selector: opts.selector || DEFAULT_SELECTOR
  };

  if (supportedAlgos.indexOf(config.algo) === -1) {
    throw new PluginError(PLUGIN_NAME, 'Hashing algorithm is unsupported');
  }

  return config;
}

function gulpSriHashPlugin(options) {
  var config = configure(options);
  var stream = through.obj(pipeHandler);

  // always clear cache per invocation, e.g. when part of a `gulp.watch`
  cache = {};
  // shouldn't matter, but anyway @link https://nodejs.org/dist/latest-v6.x/docs/api/stream.html#stream_additional_notes
  stream.resume();

  return stream;

  function pipeHandler(file, encoding, callback) {

    if (file.isStream()) {
      this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported!'));
    }

    if (file.isBuffer()) {
      return callback(null, updateDOM(file, config));
    }

    return callback(null, file);
  }
}
