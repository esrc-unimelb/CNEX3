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
          scope.cls = {
              'top': 10,
              'left': $window.innerWidth - 570,
              'width': 550,
              'height': $window.innerHeight - 100,
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
              // sort by type
              var sorted = {};
              angular.forEach(DataService.contextNetworkData, function(v,k) {
                  var t = v.type;
                  if (sorted[t] === undefined) { sorted[t] = []; }
                  v.checked = false;
                  sorted[t].push(v);
              })
              scope.contextNetworkData = sorted;
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

          scope.highlight = function(nodeid) {
              angular.forEach(scope.contextNetworkData, function(v, k) {
                  if (v.nodeid === nodeid) {
                      v.checked = !v.checked;
                  }
              })
              d3.selectAll('.node')
                .attr('fill', function(d) {
                    if (d.name === nodeid) {
                        if (d3.select(this).attr('fill') === 'blue') {
                            return 'green';
                        } else {
                            return 'blue';
                        }
                    } else { 
                        return d3.select(this).attr('fill');
                    }
                });
          }
          scope.selectAll = function(type) {
              angular.forEach(scope.contextNetworkData, function(v,k) {
                  if (k === type) { 
                      angular.forEach(v, function(v,k) {
                          v.checked = !v.checked;
                          scope.highlight(v.nodeid);
                      });
                  }
              })
          }

          scope.sizeNodesEvenly = function() {
              d3.selectAll('.node').attr('r', '10');
          }
          scope.reset = function() {
              $rootScope.$broadcast('force-reset');
              scope.contextNodeData = undefined;
              scope.contextNetworkData = undefined;
          }
      }
    };
  }]);
