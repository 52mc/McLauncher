module.exports = 'router';
angular.module('router', [])
	.config(['$routeProvider', function ($routeProvider){
		$routeProvider.when('/settings', {
			templateUrl: './template/settings.html',
			controller: 'SettingsCtrl'
		});
		$routeProvider.when('/version', {
			templateUrl: './template/version.html',
			controller: 'VersionCtrl'
		});
		$routeProvider.when('/home', {
			templateUrl: "./template/home.html",
			controller:'HomeCtrl'
		});
		$routeProvider.otherwise('/home');
	}])

;
