'use strict';

angular.module('interfaceApp')
  .directive('controls', [ '$http', '$window', '$rootScope', 'DataService', 'configuration',
        function ($http, $window, $rootScope, DataService, configuration) {
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


          $rootScope.$on('graph-data-loaded', function() {
              scope.data = {
                  nodes: DataService.nodes,
                  links: DataService.links,
                  percentUnConnected: DataService.unConnectedNodes.length / (DataService.nodes.length + DataService.unConnectedNodes.length) * 100,
              }
              calculateDegree();
          })
          $rootScope.$on('context-node-data-ready', function() {
              scope.contextNodeData = DataService.contextNodeData;
          });
          $rootScope.$on('context-node-neighbour-data-ready', function() {
              scope.contextNetworkData = DataService.contextNetworkData;
          });

          var calculateDegree = function() {
              scope.service = configuration[configuration.service];
              var url = scope.service + '/stats/' + scope.site + '/' + scope.graph + '?callback=JSON_CALLBACK';
              $http.jsonp(url).then(function(response) {
                  scope.data.name = response.data.name;
                  scope.data.url = response.data.url;
                  scope.data.degree = response.data.degree;
              },
              function() {
                  console.log('Service failure when asking for network degree');
              });
          }
      }
    };
  }]);
