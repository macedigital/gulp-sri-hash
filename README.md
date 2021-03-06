# gulp-sri-hash

[![Greenkeeper badge](https://badges.greenkeeper.io/macedigital/gulp-sri-hash.svg)](https://greenkeeper.io/)

[![NPM Version][npm-image]][npm-url]
[![Dependency Status][deps-image]][deps-url]
[![Build Status][ci-image]][ci-url]
[![Build Status][appveyor-image]][appveyor-url]
[![Code Coverage status][codecov-image]][codecov-url]

Adds [Subresource Integrity (SRI)](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) hashes to HTML files.

It does so, by parsing the contents of passed in HTML files with [cheerio](https://github.com/cheeriojs/cheerio), looking for `<link rel=stylesheet href=URL>` and `<script src=URL>` DOM-nodes, computing checksums for found referenced files, and adding `integrity=<HASH>` attributes in-place to respective DOM-nodes.

Inspiration for this plugin came from working with static site generators.

For an alternative approach, have a look at the [gulp-sri](https://github.com/mathisonian/gulp-sri) plugin.

## Installation

Install package with NPM and add it to your development dependencies:

```text
npm install gulp-sri-hash --save-dev
```

## Usage

```js
const sriHash = require('gulp-sri-hash');

gulp.task('sri', () => {
  return gulp.src('./**/*.html')
    // do not modify contents of any referenced css- and js-files after this task...
    .pipe(sriHash())
    // ... manipulating html files further, is perfectly fine
    .pipe(gulp.dest('./dist/'));
});
```

This will look for css and js file references contained in all html-files, calculate SRI-hashes for those files, and add `integrity=<HASH>` attributes for those references.

Referenced css- and js-files must be accessible from the local filesystem. In order to calculate correct hashes, style and script files should not be modified any further by build steps running later.

**Line Endings:**

Content hashing is sensitive to differences in line-endings. On Windows, the default is `CRLF`, whereas (all?) other Operating Systems default to `LF`.
You're good, as long the files use the same end-of-line sequence locally as well as on the server that delivers those asset files.
On the other hand, a change of line-endings after content hashing will cause a [file checksum mismatch](https://github.com/macedigital/gulp-sri-hash/issues/6).

## API

### algo (optional)

* Type: `String`
* Default: `sha384`
* Since: *v1.0.0*

Select hashing algorithm. Supported algorithms: `sha256`, `sha384`, and `sha512`.

### prefix (optional)

* Type: `String`
* Default: `''`
* Since: *v1.1.0*

Strips string from beginning of referenced URI in HTML files. Useful if references do not match directory structure or already contain CDN hostname.

### selector (optional)

* Type: `String`
* Default: `link[href][rel=stylesheet]:not([integrity]), script[src]:not([integrity])`
* Since: *v1.1.0*

Only look for nodes matching this custom (jQuery-style) selector.

### relative (optional)

* Type: `Boolean`
* Default: `false`
* Since: *v1.2.0*

Controls whether referenced files should be resolved relative to a base folder, or relative to the location of the HTML file.

Inspired by <https://github.com/macedigital/gulp-sri-hash/pull/1>.

### cacheParser (optional)

* Type: `Boolean`
* Default: `false`
* Since: *v2.2.0*

Controls whether to permit cached cheerio instances, e.g. when using [gulp-cheerio][gulp-cheerio-url] in a previous build step. Be careful when enabling this feature as it can have unintended side-effects.

## Example

Following snippet shows all options in action:

```js
  // ...
  .pipe(sriHash({
    algo: 'sha512',         // use strong hashing
    prefix: '/assets',      // no trailing slash
    selector: 'link[href]', // limit selector
    relative: true          // assets reside relative to html file
  }))
  // ...
```

## Changelog

*Since v2.0.0:*

Require a peer-dependency of gulp 4.x and drop support for nodejs 4.x which reached its [End-of-Life on April 30th 2018](https://medium.com/@nodejs/april-2018-release-updates-from-the-node-js-project-71687e1f7742).

*Since v1.4.0:*

Querystring-like components in file paths are ignored when resolving local files. As an example, the given string `/folder/style.css?v=somehash` will resolve to local file `/folder/style.css`.

*Since v1.3.0:*

A `crossorigin=anonymous` attribute will be added to all updated DOM nodes, unless the attribute has been already been set to value `use-credentials`. In the latter case the `crossorigin` attribute is left unchanged.

## LICENSE

MIT License

[npm-image]:https://img.shields.io/npm/v/gulp-sri-hash.svg?style=flat
[npm-url]:https://www.npmjs.com/package/gulp-sri-hash
[deps-image]:https://img.shields.io/david/macedigital/gulp-sri-hash.svg
[deps-url]:https://david-dm.org/macedigital/gulp-sri-hash
[ci-image]: https://img.shields.io/travis/macedigital/gulp-sri-hash/master.svg
[ci-url]: https://travis-ci.org/macedigital/gulp-sri-hash
[codecov-image]:https://img.shields.io/codecov/c/github/macedigital/gulp-sri-hash.svg?style=flat
[codecov-url]:https://codecov.io/github/macedigital/gulp-sri-hash
[appveyor-image]:https://ci.appveyor.com/api/projects/status/in9jtvifuxc0ct9w?svg=true
[appveyor-url]:https://ci.appveyor.com/project/macedigital/gulp-sri-hash
[gulp-cheerio-url]: https://www.npmjs.com/package/gulp-cheerio
