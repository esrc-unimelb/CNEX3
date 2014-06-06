'use strict';

angular.module('interfaceApp', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ngRoute'
])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl'
      })
      .when('/site/:code/:explore', {
          templateUrl: 'views/graph.html',
          controller: 'GraphCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  });
