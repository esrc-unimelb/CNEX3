'use strict';

angular.module('interfaceApp')
  .controller('SiteCtrl', [ '$scope', '$routeParams', function ($scope, $routeParams) {
        $scope.site = $routeParams.code; 
        $scope.graph = $routeParams.explore;

  }]);
