'use strict';

angular.module('interfaceApp')
  .directive('progressMeter', function () {
    return {
      templateUrl: 'views/progress-meter.html',
      restrict: 'E',
      scope: {
          processed: '@',
          total: '@'
      },
      link: function postLink(scope, element, attrs) {
      }
    };
  });
