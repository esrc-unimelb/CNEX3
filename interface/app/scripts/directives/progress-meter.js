'use strict';

angular.module('interfaceApp')
  .directive('progressMeter', function () {
    return {
      templateUrl: 'views/progress-meter.html',
      restrict: 'E',
      scope: {
          processed: '@',
          total: '@',
          invert: '@'
      },
      link: function postLink(scope) {
          scope.$watch('processed', function() {
             updateProgressBar();
          });

          var updateProgressBar = function() {
              var width = (scope.processed / scope.total) * 100;
              if (angular.fromJson(scope.invert) === true) {
                  scope.width = 100 - width || 1;
              } else {
                  scope.width = width;
              }
          };
      }
    };
  });
