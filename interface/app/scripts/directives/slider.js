'use strict';

angular.module('interfaceApp')
  .directive('slider', [ 'configuration', function (configuration) {
    return {
      template: '',
      restrict: 'A',
      scope: {
          fadeBackground: '&'
      },
      link: function postLink(scope, element) {
          scope.$on('reset', function() {
              element[0].value = configuration.opacity.unselected;
          });

          element.bind('change', function() {
              scope.fadeBackground();
          });
          element[0].value = configuration.opacity.unselected;

      }
    };
  }]);
