'use strict';
if (jQuery) {
var originalFn = $.fn.data;
  $.fn.data = function() {
    if (arguments[0] !== '$binding')
      return originalFn.apply(this, arguments);
  }
}

angular.module('interfaceApp', [
  'ngCookies',
  'ngSanitize',
  'ngRoute',
  'ngAnimate',
  'mgcrea.ngStrap.collapse',
  'MessageCenterModule'
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
      .when('/entity/:code/:entityId', {
          templateUrl: 'views/entity.html',
          controller: 'EntityCtrl'
      })
      .when('/play', {
          templateUrl: 'views/play.html',
          controler: 'PlayCtrl',
      })
      .when('/login/:code', {
        template: '<div></div>',
        controller: [ 'AuthService', function(AuthService) { AuthService.getToken(); }] 
      })
      .when('/forbidden', {
        template: "<h4 class='text-center'>You don't have permission to use this site.</h4>"
      })
      .otherwise({
        redirectTo: '/'
      });
  })
  .factory('authInterceptor', function ($rootScope, $q, $window) {
    return {
      request: function (config) {
        config.headers = config.headers || {};
        if ($window.localStorage.token) {
          config.headers.Authorization = 'Bearer ' + $window.localStorage.token;
        }
        return config;
      },
      response: function (response) {
        if (response.status === 401) {
          // handle the case where the user is not authenticated
        }
        return response || $q.when(response);
      }
    };
  })
  .config(function ($httpProvider) {
    $httpProvider.interceptors.push('authInterceptor');
  });
