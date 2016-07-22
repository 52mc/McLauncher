var path = require('path');
var gulp = require('gulp');
var gutil = require('gulp-util');
var webpack = require('webpack');
var del = require('del');
var less = require('gulp-less');
var pkg = require('./package.json');
var webpackconf = require('./webpack.config.js');
var packager = require('electron-packager');

gulp.task('clean', function() {
	del.sync(['app']);
});

gulp.task('copy', function() {
	gulp.src(['./src/enter.js', './src/*.html'])
		.pipe(gulp.dest('./app'));
	gulp.src(['./src/lib/**'])
		.pipe(gulp.dest('./app/lib'));
	gulp.src(['./src/assets/**'])
		.pipe(gulp.dest('./app/assets'));
	gulp.src(['./package.json']).pipe(gulp.dest('./app'));
});

gulp.task('less', function() {
	gulp.src('./src/css/app.less')
		.pipe(less({
			paths: [path.join(__dirname, 'src', 'css')]
		}))
		.pipe(gulp.dest('./app/css'));
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

gulp.task('build', ['clean', 'copy', 'less', 'webpack']);
gulp.task('default', ['build']);

gulp.task('watch', ['build'], function () {
    gulp.watch('./src/css/*.less', ['less']);
    // gulp.watch(['./src/js/**/*.*',
    //     './src/app.config.js'], ['webpack']);
    gulp.watch(['./src/*.html',
        './package.json',
        './src/enter.js',
        './src/assets/**/*.*'], ['copy']);
});

var archs = ['ia32','x64','all'];
var platforms = ['linux', 'win32', 'darwin', 'mas', 'all'];
gulp.task('package', ['build'], function (){
	packager({
		arch: archs[1],
		dir: path.join(__dirname, 'app'),
		platform: platforms[1],
		// options
		'app-version':'0.0.1',
		out: path.join(__dirname, 'build'),
		ignore: ['**/*.map']
	}, function done_callback (err, appPaths) {
		if(!err){
			console.log('package done!');
		}else{
			console.log('package error!' + err);
		}
	});
});
