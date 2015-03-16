'use strict';

angular.module('interfaceApp')
  .directive('spinner', function () {
    return {
      template: '<div id="spinner"></div>',
      restrict: 'E',
      scope: {
          colour: '@'
      },
      link: function postLink(scope, element, attrs) {
          var c;
          if (scope.colour === undefined) {
              c = 'white';
          } else {
              c = scope.colour;
          }
          var opts = {
            lines: 15, // The number of lines to draw
            length: 30, // The length of each line
            width: 5, // The line thickness
            radius: 30, // The radius of the inner circle
            corners: 1, // Corner roundness (0..1)
            rotate: 0, // The rotation offset
            direction: 1, // 1: clockwise, -1: counterclockwise
            color: c, // #rgb or #rrggbb or array of colors
            speed: 1, // Rounds per second
            trail: 60, // Afterglow percentage
            shadow: false, // Whether to render a shadow
            hwaccel: true, // Whether to use hardware acceleration
            className: 'spinner', // The CSS class to assign to the spinner
            zIndex: 2e9, // The z-index (defaults to 2000000000)
            top: '50%', // Top position relative to parent
            left: '50%' // Left position relative to parent
          };
          //var spinner = new Spinner(opts).spin();
          // element[0].appendChild(spinner.el);
      }
    };
  });
