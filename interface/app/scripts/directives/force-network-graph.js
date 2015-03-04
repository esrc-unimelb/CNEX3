'use strict';

angular.module('interfaceApp')
  .directive('forceNetworkGraph', [ '$rootScope', '$window', '$routeParams', 'configuration', 'DataService', 'D3Service',
    function ($rootScope, $window, $routeParams, configuration, DataService, d3s) {
    return {
      templateUrl: 'views/force-network-graph.html',
      restrict: 'E',
      scope: {
      },
      link: function postLink(scope, element, attrs) {
          var w = angular.element($window);
          w.bind('resize', function() {
              scope.$apply(function() {
                  d3.select('#graph')
                    .select('svg')
                    .style('width', element[0].parentElement.clientWidth - 15)
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

          scope.nodes = DataService.nodes;
          scope.links = DataService.links;
          //console.log(scope.nodes);

          // create a local data object keyed on name to allow
          //  easy retrival of node data when required
          scope.data = {};
          angular.forEach(scope.nodes, function(v, k) {
              scope.data[v.id] = v;
          });

          // figure out the dimensions of the svg
          var w = element[0].parentElement.clientWidth;
          var h = $window.innerHeight;

          //d3.select('svg').remove();
          scope.unConnectedNodes = [];

          // redraw the view when zooming
          scope.redraw = function() {
              svg.attr('transform', 'translate(' + d3.event.translate + ')' + ' scale(' + d3.event.scale + ')');
          }

          scope.zoom = d3.behavior
                       .zoom()
                       .scale([0.3])
                       .translate([w/5, h/6])
                       .scaleExtent([0,8]).on('zoom', scope.redraw);

          // calculate node / link positions during the simulation
          scope.tickCounter = 0;
          scope.tick = function() {
              link.attr('x1', function(d) { return d.source.x; })
                  .attr('y1', function(d) { return d.source.y; })
                  .attr('x2', function(d) { return d.target.x; })
                  .attr('y2', function(d) { return d.target.y; });

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

              // we ditch the cooling bar indicator as the
              //   simulation doesn't seem to get to 0 thus triggering
              //   the 'end' event
              if (scope.force.alpha() < 0.0055) {
                  scope.$apply(function() {
                      scope.relaxed = true;
                  })
              }
          }

          scope.force = d3.layout.force()
                .nodes(scope.nodes)
                .links(scope.links)
                .charge(-2000)
                .linkDistance(100)
                .linkStrength(1)
                .size([w, h])
                .on('tick', scope.tick)
                .start();

          var svg = d3.select('#site_graph')
                .append('svg')
                .attr('width', w - 15)
                .attr('height', h)
                .attr('viewBox', '0 0 ' + w + ' ' + h)
                .attr('preserveAspectRatio', 'xMidYMid meet')
                .call(scope.zoom)
                .append('g')
                .attr('transform','translate(' + w/5 + ',' + h/6 + ')scale(.3,.3)');

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
              .attr('r', function(d) { return d.r; })
              .attr('fill', function(d) { 
                  return d.color; 
              });
          node.exit().remove();

          // handle the node click event
          node.on('click', function(d) {
              scope.$apply(function() {
                  d3s.highlightNodeAndLocalEnvironment(d.id, '#site_graph');
              });
          });

          scope.force.start();

      }
    };
  }]);
