'use strict';

angular.module('interfaceApp')
  .controller('MainCtrl', [ '$scope', 'configuration', '$http', function ($scope, configuration, $http) {

      var q = configuration[configuration.service] + '?callback=JSON_CALLBACK';
      console.log(q);
      $http.jsonp(q).then(function(d) {
          console.log(d.data.sites);
          $scope.sites = [];
          angular.forEach(d.data.sites, function(v, k) {
              $scope.sites.push([k, v]);
          });
          console.log($scope.sites);
      });
  }]);
