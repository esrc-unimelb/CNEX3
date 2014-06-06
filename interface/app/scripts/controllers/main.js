'use strict';

angular.module('interfaceApp')
  .controller('MainCtrl', [ '$scope', 'configuration', '$http', function ($scope, configuration, $http) {

      var q = configuration[configuration.service];
      console.log(q);
      $http.jsonp(q).then(function(d) {
        console.log(d);
      });
  }]);
