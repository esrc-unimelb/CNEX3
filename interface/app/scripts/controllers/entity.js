'use strict';

angular.module('interfaceApp')
  .controller('EntityCtrl', [ '$scope', '$routeParams', '$timeout', 'DataService', function ($scope, $routeParams, $timeout, DataService) {

      DataService.site = {
        'code': $routeParams.code
      }
      DataService.getEntityNetwork($routeParams.entityId);
  }]);
