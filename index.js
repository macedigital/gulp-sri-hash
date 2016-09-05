'use strict';

var fs = require('fs');
var crypto = require('crypto');
var path = require('path');
var through = require('through2');
var cheerio = require('cheerio');
var PluginError = require('gulp-util').PluginError;
var PLUGIN_NAME = 'gulp-sri-hash';
var supportedAlgos = ['sha256', 'sha384', 'sha512'];
var DEFAULT_ALGO = 'sha384';
var cache;

module.exports = gulpSriHashPlugin;
module.exports.PLUGIN_NAME = PLUGIN_NAME;

function updateDOM(file, algorithm) {
  var $ = cheerio.load(file.contents);
  var $candidates = $('link[rel=stylesheet]:not([integrity]), script[src]:not([integrity])');

  if ($candidates.length > 0) {
    $candidates.each(addIntegrityAttribute);
    file.contents = Buffer.from($.html());
  }

  return file;

  function addIntegrityAttribute(idx, node) {
    var fullPath = path.normalize(file.base + getPath(node));

    $(node).attr('integrity', getFileHash(fullPath, algorithm));
  }

  function getPath(node) {
    var src = node.type == 'script' ? $(node).attr('src') : $(node).attr('href');

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
      cache[fullPath] = [algorithm, calculateSri(fullPath, algorithm)].join('-');
    }

    return cache[fullPath];
  }

}

function gulpSriHashPlugin(options) {

  var algo = options && options.algo ? options.algo : DEFAULT_ALGO;
  var stream = through.obj(pipeHandler);

  if (supportedAlgos.indexOf(algo) === -1) {
    throw new PluginError(PLUGIN_NAME, 'Hashing algorithm is unsupported');
  }

  cache = {};
  stream.resume();

  return stream;

  function pipeHandler(file, encoding, callback) {

    if (file.isStream()) {
      this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported!'));
    }

    if (file.isBuffer()) {
      return callback(null, updateDOM(file, algo));
    }

    return callback(null, file);
  }

}
