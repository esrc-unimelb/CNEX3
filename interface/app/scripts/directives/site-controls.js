'use strict';

angular.module('interfaceApp')
  .directive('siteControls', [ '$rootScope', '$window', 'DataService', 'configuration', 'D3Service', 'SolrService',
        function ($rootScope, $window, DataService, configuration, d3s, SolrService) {
    return {
      templateUrl: 'views/site-controls.html',
      restrict: 'E',
      scope: {
      },
      link: function postLink(scope, element, attrs) {
          scope.labelsVisible = true;

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
              scope.contextNodeData = DataService.contextNode;
              if (DataService.contextNode !== undefined) {
                  scope.contextNodeData = DataService.nodeMap[DataService.selected.shift()];
                  scope.clearTypes();
              }
              var s = [];
              var cndata = _.groupBy(DataService.selected, function(d) { return d.type; });
              scope.contextNetworkData = {};
              angular.forEach(cndata, function(v, k) {
                  scope.contextNetworkData[k] = _.sortBy(v, function(d) { return d.name; });
              });
          });

          // process the search data
          scope.$on('search-data-ready', function() {
                  angular.forEach(scope.data.types, function(v,k) {
                      scope.data.types[k].checked = false;
                  })
              d3s.highlightById('#site_graph', SolrService.selected);
          })

          scope.clearTypes = function() {
              angular.forEach(scope.data.types, function(v,k) {
                  scope.data.types[k].checked = false;
              })
          }
          scope.highlightByType = function(type) {
              scope.data.types[type].checked = !scope.data.types[type].checked;
              d3s.highlightByType('#site_graph', type);
          }
          
          // trigger a reset
          scope.reset = function() {
              // clear local state
              scope.clearTypes();
              scope.contextNodeData = undefined;
              scope.contextNetworkData = undefined;
              DataService.selected = undefined;
              DataService.contextNode = undefined;
              scope.showData = false;

              // reset the graph
              d3s.reset('#site_graph');

              // tag node sizing selected
              scope.sizeBy = [ "", "active", "", "" ];

              // tell search to clear
              $rootScope.$broadcast('reset-search');
          }

          // open up the entity network
          scope.viewEntityNetwork = function(id) {
              DataService.getEntityNetwork(id);
          }
          
          // toggle node labels
          scope.toggleLabels = function() {
              if (scope.labelsVisible === true) {
                  d3.select('#site_graph')
                    .selectAll('text')
                    .attr('class', 'hidden');
                  scope.labelsVisible = false;
              } else {
                  d3.select('#site_graph')
                    .selectAll('text')
                    .classed({ 'hidden': false });
                  scope.labelsVisible = true;
              }

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
          scope.panels = { 'activePanel': [2,3] }
        
          // tag node sizing selected
          scope.sizeBy = [ "", "active", "", "" ];
      }
    };
  }]);
