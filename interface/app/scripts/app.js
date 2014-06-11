'use strict';

angular.module('interfaceApp', [
  'ngCookies',
  'ngSanitize',
  'ngRoute',
  'ngAnimate'
])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl'
      })
      .when('/site/:code/:explore', {
          templateUrl: 'views/site.html',
          controller: 'SiteCtrl'
      })
      .when('/play/:code/:explore', {
          templateUrl: 'views/play.html',
          controler: 'PlayCtrl',
      })
      .otherwise({
        redirectTo: '/'
      });
  });
