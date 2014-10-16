'use strict';

angular.module('interfaceApp')
  .directive('forceNetworkGraph', [ '$rootScope', '$window', '$routeParams', 'configuration', 'DataService', 'D3Service',
    function ($rootScope, $window, $routeParams, configuration, DataService, D3Service) {
    return {
      templateUrl: 'views/force-network-graph.html',
      restrict: 'E',
      scope: {
      },
      link: function postLink(scope, element, attrs) {

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
          console.log(scope.nodes);

          // create a local data object keyed on name to allow
          //  easy retrival of node data when required
          scope.data = {};
          angular.forEach(scope.nodes, function(v, k) {
              scope.data[v.id] = v;
          });

          var w = $window.innerWidth;
          var h = $window.innerHeight;

          //d3.select('svg').remove();
          scope.unConnectedNodes = [];

          // redraw the view when zooming
          var redraw = function() {
              svg.attr('transform', 'translate(' + d3.event.translate + ')' + ' scale(' + d3.event.scale + ')');
          }

          // calculate node / link positions during the simulation
          scope.tickCounter = 0;
          var tick = function() {
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
                      scope.processed = force.alpha();
                  });
              }

              // we ditch the cooling bar indicator as the
              //   simulation doesn't seem to get to 0 thus triggering
              //   the 'end' event
              if (force.alpha() < 0.0055) {
                  scope.$apply(function() {
                      scope.relaxed = true;
                  })
              }
          }

          var force = d3.layout.force()
                .nodes(scope.nodes)
                .links(scope.links)
                .charge(-1000)
                .linkDistance(100)
                .linkStrength(1)
                .size([w, h])
                .on('tick', tick)
                .start();

          var svg = d3.select('#graph')
                .append('svg')
                .attr('width', w - 30)
                .attr('height', h)
                .attr('viewBox', '0 0 ' + w + ' ' + h)
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
          link.exit().remove();

          //draw the nodes
          node.enter()
              .append('circle')
              .attr('class', 'node')
              .attr('r', function(d) { return d.r; })
              .attr('fill', function(d) { 
                  return d.color; 
              })
              .attr('id', function(d) { return D3Service.sanitize(d.id) + '_node'; });
          node.exit().remove();

          // handle the node click event
          node.on('click', function(d) {
              scope.$apply(function() {
                  D3Service.highlightNodeAndLocalEnvironment(d.id);
              });
          });

          force.start();

      }
    };
  }]);
