'use strict';

angular.module('interfaceApp')
  .directive('entityNetwork', [ '$window', '$http', 'DataService', 'configuration',
        function ($window, $http, DataService, conf) {
    return {
      templateUrl: 'views/entity-network.html',
      restrict: 'E',
      scope: {
          height: '@',
          width: '@'
      },
      link: function postLink(scope, element, attrs) {
          scope.selections = [];
          scope.selectionData = {};

          var sizeThePanels = function() {
              scope.w = scope.width === undefined ? $window.innerWidth : scope.width;
              scope.h = scope.height === undefined ? $window.innerHeight : scope.height;
              if (scope.w === $window.innerWidth && scope.h === $window.innerHeight) {
                  scope.showSidePanel = true;
                  scope.sidepanelStyle = {
                      'position': 'fixed',
                      'top': '0px',
                      'left': '0px',
                      'width': scope.w * 0.3 + 'px',
                      'height': scope.h + 'px',
                      'padding': '0px 10px'
                  }
                  scope.mainpanelStyle = {
                      'position': 'fixed',
                      'top': '0px',
                      'left': scope.w * 0.3 + 'px',
                      'width': scope.w * 0.7 + 'px',
                      'height': scope.h + 'px',
                  }
                  scope.svgWidth = scope.w * 0.7 - 10;
              } else {
                  scope.showSidePanel = false;
                  scope.mainpanelStyle = {
                      'position': 'fixed',
                      'top': '0px',
                      'left': '0px',
                      'width': scope.w + 'px',
                      'height': scope.h + 'px',
                  }
                  scope.svgWidth = scope.w;
              }

              scope.statisticsPanelStyle = {
                  'border-radius': '16px',
                  'border': 'solid 1px black',
                  'background-color': 'white',
                  'padding': '15px 15px 15px 15px',
                  'overflow': 'auto',
                  'margin-top': '15px',
                  'height': scope.h - 30 + 'px'
              }

              d3.select('#entity_graph')
                .select('svg')
                .style('width', scope.svgWidth)
                .style('height', scope.h);
          }
          sizeThePanels();

          var w = angular.element($window);
          w.bind('resize', function() {
              scope.$apply(function() {
                sizeThePanels();
              })
          });

          var graphStatistics = function(d) {
              scope.stats = {}
              angular.forEach(d.nodes, function(v,k) {
                  if (v.id === DataService.currentEntity) {
                      scope.contextNode = v;
                  }
                  if (scope.stats[v.type] === undefined) {
                      scope.stats[v.type] = {
                          'count': 1,
                          'color': v.color,
                          'entries': [ v ]
                      }
                  } else {
                      scope.stats[v.type].count += 1;
                      scope.stats[v.type].entries.push(v);
                  }
              })
          }

          scope.showDetails = function(d) {
              if (scope.selections.indexOf(d.id) === -1) {
                  scope.selections.push(d.id);
                  d3.select('#node_' + d.id)
                    .attr('stroke', 'yellow')
                    .attr('stroke-width', 10);

                  scope.selection = d;
                  scope.showInfoPanel = true;
                  var url = conf[conf.service] + '/entity/' + DataService.site.code + '/data?q=' + encodeURI(d.url);
                  $http.get(url).then(function(resp) {
                      scope.selectionData[d.id] = d; 
                      scope.selectionData[d.id].summnote = resp.data.summnote;
                      scope.selectionData[d.id].fullnote = resp.data.fullnote;
                  }, 
                  function() {
                  });

              } else {
                  d3.select('#node_' + d.id)
                    .attr('stroke', d.color)
                    .attr('stroke-width', 1);
                  scope.selections.splice(scope.selections.indexOf(d.id), 1);
                  delete scope.selectionData[d.id];
                  if (scope.selections.length === 0) {
                    scope.showInfoPanel = false;
                  }
              }
          }
          scope.closeInfoPanel = function() {
              scope.showInfoPanel = false;
          }
          scope.reset = function() {
              angular.forEach(scope.selectionData, function(v,k) {
                  d3.select('#node_' + v.id)
                    .attr('stroke', v.color)
                    .attr('stroke-width', 1);
              })
              scope.selections = [];
              scope.selectionData = {};
              scope.closeInfoPanel();
          }

          scope.drawGraph = function(d) {
              d3.select('#entity_graph').select('svg').remove();
              var tick = function() {
                  link.attr('x1', function(d) { return d.source.x; })
                      .attr('y1', function(d) { return d.source.y; })
                      .attr('x2', function(d) { return d.target.x; })
                      .attr('y2', function(d) { return d.target.y; });

                  node.attr('transform', function(d) {
                    return 'translate(' + d.x + ',' + d.y + ')';
                  });
              }   

              // redraw the view when zooming
              var redraw = function() {
                  svg.attr('transform', 'translate(' + d3.event.translate + ')' + ' scale(' + d3.event.scale + ')');
              }

              var force = d3.layout.force()
                .nodes(d.nodes)
                .links(d.links)
                .charge(-1000)
                .linkDistance(100)
                .linkStrength(1)
                .size([scope.svgWidth, scope.h])
                .on('tick', tick)
                .start();

              var svg = d3.select('#entity_graph')
                .append('svg')
                .attr('width', scope.svgWidth)
                .attr('height', scope.h)
                .attr('viewBox', '0 0 ' + scope.w + ' ' + scope.h)
                .attr('preserveAspectRatio', 'xMidYMid meet')
                .call(d3.behavior.zoom().scaleExtent([0,8]).on('zoom', redraw))
                .append('g');

              var link = svg.selectAll('.link').data(force.links());
              var node = svg.selectAll('.node').data(force.nodes());

              // draw the links
              link.enter()
                .append('line')
                .attr('class', 'link')
                .attr('stroke', '#ccc')
                .attr('stroke-width', 2);

              //draw the nodes
              node.enter()
                .append('circle')
                .attr('id', function(d) {
                    return 'node_' + d.id;
                })
                .attr('class', 'node')
                .attr('r', function(d) {
                    return d.r;
                })
                .attr('fill', function(d) {
                    return d.color;
                })
                .on('click', function(d) {
                    scope.$apply(function() {
                      scope.showDetails(d);
                    })
                });
                //.attr('id', function(d) { return D3Service.sanitize(d.id) + '_node'; });
          }

          scope.$on('draw-entity-graph', function() {
              var d = DataService.entityNetwork;
              graphStatistics(d);
              scope.drawGraph(d);
          })
      }
    };
  }]);
