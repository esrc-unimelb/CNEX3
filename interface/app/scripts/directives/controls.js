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
          scope.highlightedTypes = [];
          scope.color = d3.scale.category20();  

          // populate the controls widget
          $rootScope.$on('graph-data-loaded', function() {
              scope.data = {
                  nodes: DataService.nodes,
                  links: DataService.links,
                  percentUnConnected: DataService.unConnectedNodes.length / (DataService.nodes.length + DataService.unConnectedNodes.length) * 100,
              }
              calculateDegree();
              generateTypeStatistics();
          })

          var calculateDegree = function() {
              scope.service = configuration[configuration.service];
              var url = scope.service + '/stats/' + scope.site + '/' + scope.graph + '?callback=JSON_CALLBACK';
              $http.jsonp(url).then(function(response) {
                  scope.data.name = response.data.name;
                  scope.data.url = response.data.url;
                  //scope.data.degree = response.data.degree;
              },
              function() {
                  console.log('Service failure when asking for network degree');
              });
          }

          var generateTypeStatistics = function() {
              var types = {};
              angular.forEach(scope.data.nodes, function(v,k) { 
                  if (types[v.type] === undefined) {
                      types[v.type] = 1;
                  } else {
                      types[v.type] += 1;
                  }
              })
              scope.data.types = types;
          }

          // process the data coming from solr when a node is selected
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

          // handle node selection - highlight connected neighbours
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
                            return configuration.highlight.contextNeighbourDefault;
                        } else {
                            return configuration.highlight.contextNeighbourHighlight;
                        }
                    } else { 
                        return d3.select(this).attr('fill');
                    }
                });
          }

          // handle select all by type
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

          scope.highlightByType = function(type) {
              if (scope.highlightedTypes.indexOf(type) === -1) {
                  scope.highlightedTypes.push(type);
              } else {
                  scope.highlightedTypes.splice(scope.highlightedTypes.indexOf(type), 1)
              }
              d3.selectAll('.node')
                .attr('fill', function(d) {
                    if (scope.highlightedTypes.indexOf(d.type) !== -1) {
                        return scope.color(d.type);
                    } else {
                        return configuration.highlight.default;
                    }
                })
                .attr('opacity', function(d) {
                    if (scope.highlightedTypes.indexOf(d.type) !== -1) {
                        return configuration.opacity.highlight;
                    } else {
                        return configuration.opacity.fade;
                    }
                })
                .attr('r', '10')
                .transition(4)
                .attr('r', function(d) {
                    if (scope.highlightedTypes.indexOf(d.type) !== -1) {
                        return '30';
                    } else {
                        return '10';
                    }
                });

                d3.selectAll('.link')
                  .attr('opacity', function(d) {
                    if (scope.highlightedTypes.indexOf(d.type) !== -1) {
                        return configuration.opacity.highlight;
                    } else {
                        return configuration.opacity.fade;
                    }
                  });
          }

          // handle the trigger to set the same size for all nodes
          scope.sizeNodesEvenly = function() {
              d3.selectAll('.node').attr('r', '10');
          }

          // trigger an app reset
          scope.reset = function() {
              $rootScope.$broadcast('force-reset');
              scope.contextNodeData = undefined;
              scope.contextNetworkData = undefined;
              scope.highlightedTypes = [];
          }
      }
    };
  }]);
