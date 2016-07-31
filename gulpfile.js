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
	gulp.src(['./src/index.html', './src/helper.js'])
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
		// windows下会报错
		// process.platform -> win32 or win64
		process.platform !== 'win32' && gutil.log('[webpack]', stats.toString({
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
				'./src/enter.js',
				'./src/helper.js',
				'./src/template/*.html',
        './package.json',
        './src/assets/**/*.*'], ['copy']);
});

gulp.task('package', ['build'], function (){
	packager({
		arch: ['ia32','x64'],
		platform: ['linux', 'win32', 'darwin'],
		icon: path.join(__dirname, 'app', 'assets', 'tray'),
		'app-version': pkg.version,
		'app-copyright': 'Copyright (c) 2016 eeve All Rights Reserved.',
		'version-string': {
			CompanyName: 'eeve',
			FileDescription: '由eeve开发的一款全平台Minecraft启动器',
			OriginalFilename: 'McLauncher.exe',
			ProductName: 'Minecraft启动器',
			InternalName: 'McLauncher'
		},
		dir: path.join(__dirname, 'app'),
		out: path.join(__dirname, 'build')
	}, function done_callback (err, appPaths) {
		if(!err){
			console.log('package done!');
		}else{
			console.log('package error!' + err);
		}
	});
});
