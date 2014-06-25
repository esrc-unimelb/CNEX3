'use strict';

angular.module('interfaceApp')
  .directive('controls', [ '$http', '$window', '$rootScope', 'ForceData', 'configuration',
        function ($http, $window, $rootScope, ForceData, configuration) {
    return {
      templateUrl: 'views/controls.html',
      restrict: 'E',
      scope: {
          site: '@',
          entity: '@',
          graph: '@'
      },
      link: function postLink(scope, element, attrs) {
          scope.controls = {
              'top': 10,
              'left': $window.innerWidth - 410,
              'width': 400,
              'height': $window.innerHeight,
          }

          $rootScope.$watch('ForceData', function() {
              scope.nodes = ForceData.nodes;
              scope.links = ForceData.links;
              scope.percentUnConnected = ForceData.unConnectedNodes.length / (scope.nodes.length + ForceData.unConnectedNodes.length) * 100;

              calculateDegree();
          })

          var calculateDegree = function() {
              scope.service = configuration[configuration.service];
              var url = scope.service + '/stats/' + scope.site + '/' + scope.graph + '?callback=JSON_CALLBACK';
              console.log(url);
              $http.jsonp(url).then(function(response) {
                  scope.name = response.data.name;
                  scope.url = response.data.url;
                  scope.degree = response.data.degree;
              },
              function() {
              });
          }
      }
    };
  }]);
