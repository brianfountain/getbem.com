var gulp = require('gulp');
var bem = require('gulp-bem');
var concat = require('gulp-concat');
var del = require('del');
var jade = require('gulp-jade');
var sass = require('gulp-sass');
var pack = require('gulp-bem-pack');
var autoprefixer = require('gulp-autoprefixer');
var uglify = require('gulp-uglify');
var buildBranch = require('buildbranch');
var refresh = require('gulp-livereload');
var lr = require('tiny-lr');
var server = lr();

var levels = [
    'levels/js',
    'libs/bootstrap/levels/*',
    'levels/base',
    'levels/blocks',
    'levels/pages'
];

var tree;
gulp.task('tree', function () {
    tree = bem.objects(levels).pipe(bem.deps()).pipe(bem.tree());
});

gulp.task('js', ['tree'], function () {
    return tree.deps('levels/pages/index')
        .pipe(bem.src('{bem}.js'))
        .pipe(pack('index.js'))
        .pipe(gulp.dest('./dist'))
        .pipe(refresh(server));
});

gulp.task('uglify', ['js'], function () {
    return gulp.src('dist/*.js')
        .pipe(uglify())
        .pipe(gulp.dest('dist'));
});

gulp.task('css', ['tree'], function () {
    function buildCss(page) {
        return tree.deps('levels/pages/' + page.id)
            .pipe(bem.src('{bem}.{css,scss}'))
            .pipe(concat(page.id + '.css'))
            .pipe(sass())
            .pipe(autoprefixer({
                browsers: ['last 2 versions'],
                cascade: false
            }))
            .pipe(gulp.dest('./dist'))
            .pipe(refresh(server));
    }

    return bem.objects('levels/pages').map(buildCss);
});

gulp.task('html', ['tree'], function () {
    function buildHtml(page) {
        return tree.deps('levels/pages/' + page.id)
            .pipe(bem.src('{bem}.jade'))
            .pipe(concat({
                path: page.path + '/' + page.id + '.jade',
                base: page.path
            }))
            .pipe(jade({pretty: true}))
            .pipe(gulp.dest('./dist'))
            .pipe(refresh(server));
    }

    return bem.objects('levels/pages').map(buildHtml);
});

gulp.task('cname', function () {
    return gulp.src('CNAME').pipe(gulp.dest('dist'));
});

gulp.task('assets', function () {
    return gulp.src('assets/**').pipe(gulp.dest('dist'));
});

gulp.task('clean', function (cb) {
    del(['./dist'], cb);
});

gulp.task('build', ['html', 'css', 'js', 'assets', 'cname']);

gulp.task('production', ['build', 'uglify']);

gulp.task('gh', ['production'], function(done) {
    buildBranch({ folder: 'dist', ignore: ['libs'] }, done);
});

gulp.task('express', function() {
    var express = require('express');
    var app = express();
    app.use(express.static('dist'));
    app.listen(4000);
    console.log('Server is running on http://localhost:4000');
});

gulp.task('lr-server', function() {
    server.listen(35729, function(err) {
        if(err) { return console.log(err); }
    });
});

var watch = require('gulp-watch');
gulp.task('watch', ['express', 'lr-server', 'build'], function() {
    watch('assets/**/*', function () { gulp.start('assets'); });
    watch('levels/**/*.js', function () { gulp.start('js'); });
    watch('levels/**/*.{scss,css}', function () { gulp.start('css'); });
    watch('levels/**/*.jade', function () { gulp.start('html'); });
});

gulp.task('default', ['watch']);
