'use strict';

/**
 * @ngdoc overview
 * @name cryptoStatsApp
 * @description
 * # cryptoStatsApp
 *
 * Main module of the application.
 */
angular
  .module('cryptoStatsApp', [
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'LocalStorageModule',
    'ngRoute',
    'ngSanitize',
    'ngTouch'
  ])
  .config(function($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl',
        controllerAs: 'main'
      })
      .when('/about', {
        templateUrl: 'views/about.html',
        controller: 'AboutCtrl',
        controllerAs: 'about'
      })
      .otherwise({
        redirectTo: '/'
      });
  })
  .filter("comma", [function() {
    return function(input) {
      return (input).toLocaleString('en');
    };
  }]);
