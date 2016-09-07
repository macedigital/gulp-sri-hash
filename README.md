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

`npm install --save-dev gulp-sri-hash`

## Usage

```js
var sriHash = require('gulp-sri-hash');

gulp.task('sri', function() {
  return gulp.src('./**/*.html')
    // do not modify contents of any referenced css- and js-file after this task ...
    .pipe(sriHash())
    // ... manipulating html files further, is perfectly fine
    .pipe(gulp.dest('./dist/'));
});
```

This will look for css and js file references contained in all html-files, calculate SRI-hashes for those files, and add `integrity=<HASH>` attributes for those references.

Referenced css- and js-files must be accessible from the local filesystem. In order to calculate correct hashes, style and script files should not be modified any further by build steps running later.

## API

#### algo (optional)
Type: `String`

Select hashing algorithm. Supported algorithms: 'sha256', 'sha384', and 'sha512'.

Default: `sha384`

#### prefix (optional)
Type: `String` (optional)

Strips string from beginning of referenced URI in HTMl files. Useful if references do not match directory structure or already contain CDN hostname.

Default: ''

#### selector (optional)
Type: `String`

Only look for nodes matching this custom (jQuery-style) selector.

Default: 'link[href][rel=stylesheet]:not([integrity]), script[src]:not([integrity])'

### Example

Following snippet shows all options in action:

```js
  // ...
  .pipe(sriHash({
    algo: 'sha512', // use strong hashing
    prefix: '/assets', // no trailing slash
    selector: 'link[href]', // limit selector
  }))
  // ...
```
## LICENSE

MIT License

[npm-image]:https://img.shields.io/npm/v/gulp-sri-hash.svg?style=flat
[npm-url]:https://www.npmjs.com/package/gulp-sri-hash
[deps-image]:https://david-dm.org/macedigital/gulp-sri-hash.svg
[deps-url]:https://david-dm.org/macedigital/gulp-sri-hash
[ci-image]: https://api.travis-ci.org/macedigital/gulp-sri-hash.svg?branch=master&style=flat
[ci-url]: https://travis-ci.org/macedigital/gulp-sri-hash
[codecov-image]:https://img.shields.io/codecov/c/github/macedigital/gulp-sri-hash.svg?style=flat
[codecov-url]:https://codecov.io/github/macedigital/gulp-sri-hash