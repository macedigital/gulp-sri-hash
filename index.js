const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const through = require('through2');
const cheerio = require('cheerio');
const PluginError = require('plugin-error');

const PLUGIN_NAME = 'gulp-sri-hash';
const DEFAULT_ALGO = 'sha384';
const DEFAULT_SELECTOR = 'link[href][rel=stylesheet]:not([integrity]), script[src]:not([integrity])';
const supportedAlgos = new Set(['sha256', 'sha384', 'sha512']);
const cache = new Map();

const normalizePath = (node, { prefix }) => {
  let src = node.name === 'script' ? node.attribs.src : node.attribs.href;

  if (!src) {
    return null;
  }

  // strip prefix if present and match
  if (prefix.length && src.indexOf(prefix) === 0) {
    src = src.slice(prefix.length);
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
  if (src.includes('?')) {
    return src.substr(0, src.indexOf('?'));
  }

  return src;
};

const resolveRelativePath = (file, localPath) => path.join(path.dirname(file.path), localPath);

const resolveAbsolutePath = (file, localPath) => path.normalize(file.base + localPath);

const calculateSri = (fullPath, algorithm) => {
  const file = fs.readFileSync(fullPath);

  return crypto.createHash(algorithm).update(file).digest('base64');
};

const getFileHash = (fullPath, algorithm) => {
  if (!cache.has(fullPath)) {
    cache.set(fullPath, [algorithm, calculateSri(fullPath, algorithm)].join('-'));
  }

  return cache.get(fullPath);
};

const getParser = (file, mutateVinyl) => {
  if (mutateVinyl && file.cheerio) {
    return file.cheerio;
  }

  const parser = cheerio.load(file.contents, { decodeEntities: false });

  if (mutateVinyl) {
    Object.assign(file, {
      cheerio: parser,
    });
  }

  return parser;
};

const updateDOM = (file, config) => {
  const $ = getParser(file, config.cacheParser);
  const $candidates = $(config.selector);
  const resolver = config.relative ? resolveRelativePath : resolveAbsolutePath;
  const addIntegrityAttribute = (idx, node) => {
    const localPath = normalizePath(node, config);
    if (localPath) {
      $(node).attr('integrity', getFileHash(resolver(file, localPath), config.algo));
      if ($(node).attr('crossorigin') !== 'use-credentials') {
        $(node).attr('crossorigin', 'anonymous');
      }
    }
  };

  if ($candidates.length > 0) {
    $candidates.each(addIntegrityAttribute);
    Object.assign(file, { contents: Buffer.from($.html()) });
  }

  return file;
};

const transformFactory = config => function transform(file, encoding, callback) {
  if (file.isBuffer()) {
    return callback(null, updateDOM(file, config));
  }

  if (file.isStream()) {
    this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported!'));
  }

  return callback(null, file);
};

const configure = (options = {}) => {
  const config = Object.assign({}, {
    algo: options.algo || DEFAULT_ALGO,
    prefix: options.prefix || '',
    selector: options.selector || DEFAULT_SELECTOR,
    relative: !!options.relative || false,
    cacheParser: !!options.cacheParser || false,
  });

  if (!supportedAlgos.has(config.algo)) {
    throw new PluginError(PLUGIN_NAME, 'Hashing algorithm is unsupported');
  }

  return config;
};

const gulpSriHashPlugin = (options) => {
  // always clear cache per invocation, e.g. when part of a `gulp.watch`
  cache.clear();

  return through.obj(transformFactory(configure(options)));
};

module.exports = gulpSriHashPlugin;
module.exports.PLUGIN_NAME = PLUGIN_NAME;
