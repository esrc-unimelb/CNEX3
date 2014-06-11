'use strict';

angular.module('interfaceApp')
  .directive('controls', [ '$http', '$window', function ($http, $window) {
    return {
      templateUrl: 'views/controls.html',
      restrict: 'E',
      scope: {
          site: '@',
          entity: '@'
      },
      link: function postLink(scope, element, attrs) {
          scope.controls = {
              'top': 10,
              'left': $window.innerWidth - 410,
              'width': 400,
              'height': $window.innerHeight,
          }
      }
    };
  }]);
