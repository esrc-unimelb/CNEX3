'use strict';


// Declare app level module which depends on filters, and services
angular.module('eac-viewer', [ 'ui.bootstrap', 'eac-viewer.filters', 'eac-viewer.services', 'eac-viewer.directives']).
  config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/site/:code/:vistype', {
        templateUrl: 'partials/site-network.html', 
        controller: 'SiteNetworkController'
    });
    $routeProvider.when('/entity/:code/:id', {
        templateUrl: 'partials/entity-network.html', 
        controller: 'EntityNetworkController'
    });
    $routeProvider.when('/site', {
        templateUrl: 'partials/home.html',
        controller: 'HomeController'
    });
    $routeProvider.otherwise({redirectTo: '/site'});
  }]);
