# gulp-sri-hash

[![NPM Version][npm-image]][npm-url]
[![Dependency Status][deps-image]][deps-url]
[![Build Status][ci-image]][ci-url]
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
var sriHash = require('gulp-sri-hash');

gulp.task('sri', function() {
  return gulp.src('./**/*.html')
    // do not modify contents of any referenced css- and js-files after this task...
    .pipe(sriHash())
    // ... manipulating html files further, is perfectly fine
    .pipe(gulp.dest('./dist/'));
});
```

This will look for css and js file references contained in all html-files, calculate SRI-hashes for those files, and add `integrity=<HASH>` attributes for those references.

Referenced css- and js-files must be accessible from the local filesystem. In order to calculate correct hashes, style and script files should not be modified any further by build steps running later.

*Since v1.3.0:*

A `crossorigin=anonymous` attribute will be added to all updated DOM nodes, unless the attribute has been already been set to value `use-credentials`. In the latter case the `crossorigin` attribute is left unchanged.

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
