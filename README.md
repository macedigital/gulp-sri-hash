![status](https://secure.travis-ci.org/macedigital/gulp-sri-hash.svg?branch=master)

Adds [Subresource Integrity (SRI)](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) hashes to HTML files.

It does so, by parsing the contents of passed in HTML files with [cheerio](https://github.com/cheeriojs/cheerio), looking for `<link rel=stylesheet href=URL>` and `<script src=URL>` DOM-nodes, computing checksums for found referenced files, and adding `integrity=<HASH>` attributes in-place to respective DOM-nodes.

Inspiration for this plugin came from working with static site generators. 

For an alternative approach, have a look at the [gulp-sri](https://github.com/mathisonian/gulp-sri) plugin.

## Installation

Install package with NPM and add it to your development dependencies:

`npm i -D gulp-sri-hash`

## Usage

```js
var sriHash = require('gulp-sri-hash');

gulp.task('sri', function() {
  return gulp.src('./**/*.html')
    // do not modify contents of any referenced css- and js-file after this task ...
    .pipe(sriHash())
    // ... manipulating html files, is perfectly fine
    .pipe(gulp.dest('./dist/'));
});
```

This will look for css and js file references contained in all html-files, calculate SRI-hashes for those files, and add `integrity=<HASH>` attributes for those references.

Referenced css- and js-files must be accessible from the local filesystem. In order to calculate correct hashes, style and script files should not be modified any further by build steps running later.

Default hashing algorithm is `sha384`, but can be changed like this:

```js
.pipe(sriHash({algo: 'sha512'}))
```

## LICENSE

MIT License