'use strict';

var fs = require('fs');
var crypto = require('crypto');
var path = require('path');
var through = require('through2');
var cheerio = require('cheerio');
var PluginError = require('plugin-error');

var PLUGIN_NAME = 'gulp-sri-hash';
var DEFAULT_ALGO = 'sha384';
var DEFAULT_SELECTOR = 'link[href][rel=stylesheet]:not([integrity]), script[src]:not([integrity])';
var supportedAlgos = ['sha256', 'sha384', 'sha512'];
var cache;

module.exports = gulpSriHashPlugin;
module.exports.PLUGIN_NAME = PLUGIN_NAME;

function normalizePath(node, config) {
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
  if (src.charCodeAt(0) !== path.sep.charCodeAt(0)) {
    src = path.sep + src;
  }

  // remove query-string from path
  if (src.indexOf('?') !== -1) {
    return src.substr(0, src.indexOf('?'));
  }

  return src;
}

function resolveRelativePath(file, localPath) {
  return path.join(path.dirname(file.path), localPath);
}

function resolveAbsolutePath(file, localPath) {
  return path.normalize(file.base + localPath)
}

function calculateSri(fullPath, algorithm) {
  var file = fs.readFileSync(fullPath);

  return crypto.createHash(algorithm).update(file).digest('base64');
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
    file.contents = new Buffer($.html());
  }

  return file;

  function addIntegrityAttribute(idx, node) {
    var localPath = normalizePath(node, config);
    var resolver;

    if (localPath) {
      resolver = config.relative ? resolveRelativePath : resolveAbsolutePath;
      $(node).attr('integrity', getFileHash(resolver(file, localPath), config.algo));
      if ($(node).attr('crossorigin') !== 'use-credentials') {
        $(node).attr('crossorigin', 'anonymous');
      }
    }
  }
}

function configure(options) {
  var opts = options || {};
  var config = {
    algo: opts.algo || DEFAULT_ALGO,
    prefix: opts.prefix || '',
    selector: opts.selector || DEFAULT_SELECTOR,
    relative: !!opts.relative || false
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
