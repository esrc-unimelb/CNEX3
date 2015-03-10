'use strict';

angular.module('interfaceApp')
  .directive('siteControls', [ '$window', 'DataService', 'configuration', 'D3Service', 'SolrService',
        function ($window, DataService, configuration, d3s, SolrService) {
    return {
      templateUrl: 'views/site-controls.html',
      restrict: 'E',
      scope: {
      },
      link: function postLink(scope, element, attrs) {

          var w = angular.element($window);
          w.bind('resize', function() {
              scope.$apply(function() {
                  sizeThePanel();
              })
          });

          var sizeThePanel = function() {
              var e = angular.element(document.getElementById('dateVisContainer'));
              scope.controlsPanelStyle = {
                  'height': $window.innerHeight - 15,
                  'overflow-y': 'auto'
              }
          }
          sizeThePanel();
          scope.showData = false;

          // handle the reset call
          scope.$on('reset', function() {
              angular.forEach(scope.data.types, function(v,k) {
                  scope.data.types[k].checked = false;
              })
              scope.contextNodeData = undefined;
              scope.contextNetworkData = undefined;
              DataService.selected = undefined;
              DataService.contextNode = undefined;
              scope.showData = false;
          })

          // populate the controls widget
          scope.$on('graph-data-loaded', function() {
              scope.site = DataService.site;
              scope.data = {
                  nodes: DataService.nodes,
                  links: DataService.links,
                  unConnected: DataService.unConnectedNodes,
                  percentUnConnected: DataService.unConnectedNodes.length / (DataService.nodes.length + DataService.unConnectedNodes.length) * 100,
              }

              var types = {};
              angular.forEach(scope.data.nodes, function(v,k) { 
                  if (types[v.type] === undefined) {
                      types[v.type] = { 'count': 1, 'checked': false, 'color': v.color, 'coreType': v.coreType };
                  } else {
                      types[v.type].count += 1;
                  }
              })
              scope.data.types = types;
          })

          // process the data when it's available
          scope.$on('node-data-ready', function() {
              var sorted = {};
              if (DataService.contextNode === undefined) {
                  scope.contextNodeData = undefined;
              }
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

          // process the search data
          scope.$on('search-data-ready', function() {
              d3s.highlightById('#site_graph', SolrService.selected);
          })

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
              d3s.highlightByType('#site_graph', type);
          }

          
          scope.fadeBackground = function() {
              d3s.fadeBackground(scope.fade);
          }

          // trigger a reset
          scope.reset = function() {
              d3s.reset('#site_graph');

              // tag node sizing selected
              scope.sizeBy = [ "", "active", "", "" ];
          }

          // open up the entity network
          scope.viewEntityNetwork = function(id) {
              DataService.getEntityNetwork(id);
          }
          
          // resize the nodes
          scope.sizeNodesBy = function(by) {
              if (by === 'evenly') {
                  scope.sizeBy = [ "active", "", "", "" ];
                  DataService.labelMainEntities('#site_graph', 'rByEntity');
              } else if (by === 'entities') {
                  scope.sizeBy = [ "", "active", "", "" ];
                  DataService.labelMainEntities('#site_graph', 'rByEntity');
              } else if (by === 'publications') {
                  scope.sizeBy = [ "", "", "active", "" ];
                  DataService.labelMainEntities('#site_graph', 'rByPublication');
              } else if (by === 'objects') {
                  scope.sizeBy = [ "", "", "", "active" ];
                  DataService.labelMainEntities('#site_graph', 'rByDobject');
              }
              d3s.sizeNodesBy(by, '#site_graph');
          }

          // panels to open in the accordion
          scope.panels = { 'activePanel': [0,1,2] }
        
          // tag node sizing selected
          scope.sizeBy = [ "", "active", "", "" ];

      }
    };
  }]);
