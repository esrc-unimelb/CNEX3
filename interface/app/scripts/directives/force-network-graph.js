'use strict';

angular.module('interfaceApp')
  .directive('forceNetworkGraph', [ '$rootScope', '$window', '$routeParams', '$timeout', 'configuration', 'DataService', 'D3Service',
    function ($rootScope, $window, $routeParams, $timeout, configuration, DataService, d3s) {
    return {
      templateUrl: 'views/force-network-graph.html',
      restrict: 'E',
      scope: {
          data: '=',
      },
      link: function postLink(scope, element, attrs) {
          var w = angular.element($window);
          w.bind('resize', function() {
              scope.$apply(function() {
                  d3.select('#site_graph')
                    .select('svg')
                    .style('width', element[0].parentElement.clientWidth)
                    .style('height', $window.innerHeight);
              })
          });

          scope.$on('reset', function() {
              link.transition()
                  .attr('class', 'link')
                  .attr('stroke', '#ccc')
                  .attr('stroke-width', 2)
                  .attr('opacity', configuration.opacity.default);

              node.transition()
                  .attr('class', 'node')
                  .attr('r', function(d) { return d.r; })
                  .attr('fill', function(d) { return d.color; })
                  .attr('opacity', configuration.opacity.default);
          });

          // cancel the timeout if the location changes
          scope.$on('$locationChangeStart', function() {
              $timeout.cancel(scope.timer);
          })

          // redraw graph with nodes filtered
          scope.$on('filter-nodes-and-redraw', function() {
              scope.nodes = [];
              var typesToFilter = DataService.filterTypes;
              angular.forEach(scope.data.nodes, function(v,k) {
                  if (typesToFilter.indexOf(v.type) === -1) {
                      scope.nodes.push(v);
                  }
              });
              scope.links = DataService.processLinks(scope.data.links, _.pluck(scope.nodes, 'id'))
              scope.relaxed = false;
              scope.processed = 0.1;
              scope.drawGraph();
          })

          scope.nodes = scope.data.nodes;
          scope.links = scope.data.links;

          // figure out the dimensions of the svg
          var w = element[0].parentElement.clientWidth;
          var h = $window.innerHeight;


          var centerGraph = function() {
              if (scope.force.alpha() > 0.004) {
                  scope.timer = $timeout(function(d) {
                      centerGraph();
                  }, 500);
              } else {
                  var t = d3s.calculateTransformAndScale('#site_graph')
                  scope.zoom.translate(t.translate).scale(t.scale);
                  d3.select('#site_graph')
                    .selectAll('g')
                    .transition()
                    .duration(500)
                    .attr('transform', 'translate(' + t.translate + ') scale(' + t.scale + ')');
                  labelMainEntities();
                  scope.relaxed = true;
              }
          }
          var labelMainEntities = function() {
              d3s.renderLabels('#site_graph');
          }

          scope.drawGraph = function() {
              // remove any previous svg
              d3.select('#site_graph')
                .select('svg')
                .remove();

              // redraw the view when zooming
              var redraw = function() {
                  var svg = d3.select('#site_graph')
                              .selectAll('g');
                  svg.attr('transform', 'translate(' + d3.event.translate + ')' + ' scale(' + d3.event.scale + ')');
              }

              scope.zoom = d3.behavior
                           .zoom()
                           .scaleExtent([0,8]).on('zoom', redraw);

              // calculate node / link positions during the simulation
              scope.tickCounter = 0;
              var tick = function() {
                  var link = d3.select('#site_graph')
                               .selectAll('.link');

                  link.attr('x1', function(d) { return d.source.x; })
                      .attr('y1', function(d) { return d.source.y; })
                      .attr('x2', function(d) { return d.target.x; })
                      .attr('y2', function(d) { return d.target.y; });

                  var node = d3.select('#site_graph')
                               .selectAll('.node'); 
                  node.attr('transform', function(d) {
                    return 'translate(' + d.x + ',' + d.y + ')';
                  });


                  // we can't update on every cycle as the html 
                  //  element doesn't keep up
                  scope.tickCounter += 1;
                  if (scope.tickCounter === 2) {
                      scope.tickCounter = 0;
                      scope.$apply(function() {
                          scope.total = 0.1;
                          scope.processed = scope.force.alpha();
                      });
                  }
              }

              scope.force = d3.layout.force()
                    .nodes(scope.nodes)
                    .links(scope.links)
                    .charge(-2000)
                    .linkDistance(100)
                    .linkStrength(1)
                    .size([w, h])
                    .on('tick', tick)
                    .start();

              var svg = d3.select('#site_graph')
                    .append('svg')
                    .attr('width', w)
                    .attr('height', h)
                    .attr('viewBox', '0 0 ' + w + ' ' + h)
                    .attr('preserveAspectRatio', 'xMinYMin meet')
                    .call(scope.zoom)
                    .append('g')
                    .attr('class', 'node-container');
                    //.attr('transform','rotate(0) translate(' + w/5 + ',' + h/6 + ') scale(.3,.3)');

              // add a group for the text elements we add later
              d3.select('#site_graph')
                .select('svg')
                .append('g')
                .attr('class', 'text-container');
                //.attr('transform','rotate(0) translate(' + w/5 + ',' + h/6 + ') scale(.3,.3)');

              var link = svg.selectAll('.link')
                            .data(scope.force.links());
              var node = svg.selectAll('.node')
                            .data(scope.force.nodes());

              // draw the links
              link.enter()
                  .append('line')
                  .attr('id', function(d) {
                      return 'link_' + d3s.sanitize(d.source.id) + '_' + d3s.sanitize(d.target.id);
                  })
                  .attr('class', 'link')
                  .attr('stroke', '#ccc')
                  .attr('stroke-width', 2);
              link.exit().remove();

              //draw the nodes
              node.enter()
                  .append('circle')
                  .attr('id', function(d) { 
                      return 'node_' + d3s.sanitize(d.id); 
                  })
                  .attr('class', 'node')
                  .attr('r', function(d) { return d.rByEntity; })
                  .attr('fill', function(d) { 
                      return DataService.getColor(d.type); 
                  });
              node.exit().remove();

              // handle the node click event
              node.on('click', function(d) {
                  scope.$apply(function() {
                      d3s.highlightNodeAndLocalEnvironment(d.id, '#site_graph');
                  });
              });

              centerGraph();
          }
          scope.drawGraph();

      }
    };
  }]);
