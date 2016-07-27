var path = require('path');
var gulp = require('gulp');
var gutil = require('gulp-util');
var webpack = require('webpack');
var del = require('del');
var less = require('gulp-less');
var uglify = require('gulp-uglify');
var babel = require('gulp-babel');

var pkg = require('./package.json');
var webpackconf = require('./webpack.config.js');
var packager = require('electron-packager');

gulp.task('clean', function() {
	del.sync(['app','build']);
});

gulp.task('copy', function() {
	gulp.src(['./src/index.html','./src/helper.js','./src/online.js','./src/online-status.html'])
		.pipe(gulp.dest('./app'));
	gulp.src(['./src/template/**'])
		.pipe(gulp.dest('./app/template'));
	gulp.src(['./src/assets/**'])
		.pipe(gulp.dest('./app/assets'));
	gulp.src(['./package.json']).pipe(gulp.dest('./app'));

	gulp.src(['./node_modules/bluebird/**/*']).pipe(gulp.dest('./app/node_modules/bluebird'));

});

gulp.task('less', function() {
	gulp.src('./src/css/app.less')
		.pipe(less({
			paths: [path.join(__dirname, 'src', 'css')]
		}))
		.pipe(gulp.dest('./app/css'));
});

gulp.task('compress', function () {
  return gulp.src('src/enter.js')
		.pipe(babel({
    	presets: ['es2015']
    }))
    .pipe(uglify())
    .pipe(gulp.dest('app'));
});

gulp.task('webpack', function(callback) {
	webpack(webpackconf, function(err, stats) {
		if (err) {
			throw new gutil.PluginError('webpack', err);
		}
		gutil.log('[webpack]', stats.toString({
			modules: false,
			colors: true
		}));
		callback();
	});
});

gulp.task('build', ['clean', 'copy', 'less', 'compress', 'webpack']);
gulp.task('default', ['build']);

gulp.task('watch', ['build'], function () {
    gulp.watch('./src/css/*.less', ['less']);
    gulp.watch(['./src/js/**/*.js'], ['webpack']);
    gulp.watch(['./src/index.html',
				'./src/helper.js','./src/online.js','./src/online-status.html',
				'./src/template/*.html',
        './package.json',
        './src/assets/**/*.*'], ['copy']);
});

var archs = ['ia32','x64','all'];
var platforms = ['linux', 'win32', 'darwin', 'mas', 'all'];
gulp.task('package', ['build'], function (){
	packager({
		arch: archs[1],
		dir: path.join(__dirname, 'app'),
		platform: platforms[2],
		// options
		'app-version':'0.0.1',
		out: path.join(__dirname, 'build')
	}, function done_callback (err, appPaths) {
		if(!err){
			console.log('package done!');
		}else{
			console.log('package error!' + err);
		}
	});
});
