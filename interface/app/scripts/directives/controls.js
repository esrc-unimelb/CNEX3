'use strict';

angular.module('interfaceApp')
  .directive('controls', [ '$http', '$window', '$rootScope', 'DataService', 'configuration', 'D3Service',
        function ($http, $window, $rootScope, DataService, configuration, d3s) {
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
          scope.showData = false;

          // handle the reset call
          $rootScope.$on('reset', function() {
              angular.forEach(scope.data.types, function(v,k) {
                  scope.data.types[k].checked = false;
              })
              scope.contextNodeData = undefined;
              scope.contextNetworkData = undefined;
              scope.showData = false;
          })

          // populate the controls widget
          $rootScope.$on('graph-data-loaded', function() {
              scope.data = {
                  nodes: DataService.nodes,
                  links: DataService.links,
                  percentUnConnected: DataService.unConnectedNodes.length / (DataService.nodes.length + DataService.unConnectedNodes.length) * 100,
              }

              var types = {};
              angular.forEach(scope.data.nodes, function(v,k) { 
                  if (types[v.type] === undefined) {
                      types[v.type] = { 'count': 1, 'checked': false, 'color': v.color };
                  } else {
                      types[v.type].count += 1;
                  }
              })
              scope.data.types = types;
          })

          // process the data coming from solr when a node is selected
          $rootScope.$on('search-result-data-ready', function() {
              var sorted = {};
              angular.forEach(DataService.selected, function(v,k) {
                  if (v === DataService.contextNode) {
                      scope.contextNodeData = DataService.nodeMap[v];
                  } else {
                      var d = DataService.nodeMap[v];
                      if (sorted[d.type] === undefined) { sorted[d.type] = []; }
                      d.checked = false;
                      sorted[d.type].push(d);
                  }
              });
              scope.contextNetworkData = sorted;
          });

          // handle node selection - highlight connected neighbours
         scope.highlight = function(nodeid) {
             angular.forEach(scope.contextNetworkData, function(v, k) {
                 if (v.id === nodeid) {
                     v.checked = !v.checked;
                 }
             })
             d3s.highlightNode(nodeid);
          }

          // handle select all by type
          scope.selectAll = function(type) {
              angular.forEach(scope.contextNetworkData, function(v,k) {
                  if (k === type) { 
                      angular.forEach(v, function(v,k) {
                          v.checked = !v.checked;
                          d3s.highlightNode(v.id);
                      });
                  }
              })
          }

          scope.highlightByType = function(type) {
              scope.data.types[type].checked = !scope.data.types[type].checked;
              d3s.highlightByType(type);
          }

          // handle the trigger to set the same size for all nodes
          scope.sizeNodesEvenly = function() {
              d3s.sizeNodesEvenly();
          }

          // trigger a reset
          scope.reset = function() {
              d3s.reset();
          }

      }
    };
  }]);
