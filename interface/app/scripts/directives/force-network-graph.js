'use strict';

angular.module('interfaceApp')
  .directive('forceNetworkGraph', [ '$window', 'ForceData', function ($window, ForceData) {
    return {
      templateUrl: 'views/force-network-graph.html',
      restrict: 'E',
      scope: {
      },
      link: function postLink(scope, element, attrs) {

          scope.nodes = ForceData.nodes;
          scope.links = ForceData.links;
          console.log(scope.nodes);
          var weightBounds = ForceData.weightBounds;

          var w = $window.innerWidth;
          var h = $window.innerHeight;

          d3.select('svg').remove();
          scope.color = d3.scale.category20();
          scope.weight = d3.scale.linear().range([10, 80]);
          scope.weight.domain([Math.min.apply(null, weightBounds), Math.max.apply(null, weightBounds)]);
          scope.unConnectedNodes = [];

          var redraw = function() {
              svg.attr('transform', 'translate(' + d3.event.translate + ')' + ' scale(' + d3.event.scale + ')');
          }

          var tick = function() {
              link.attr('x1', function(d) { return d.source.x; })
                  .attr('y1', function(d) { return d.source.y; })
                  .attr('x2', function(d) { return d.target.x; })
                  .attr('y2', function(d) { return d.target.y; });

              node.attr('transform', function(d) {
                return 'translate(' + d.x + ',' + d.y + ')';
              });

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
                .attr('width', w)
                .attr('height', h)
                .attr('viewBox', '0 0 ' + w + ' ' + h)
                .attr('preserveAspectRatio', 'xMidYMid meet')
                .call(d3.behavior.zoom().scaleExtent([0,8]).on('zoom', redraw))
                .append('g');


          var link = svg.selectAll('.link').data(force.links());
          var node = svg.selectAll('.node').data(force.nodes());

          link.enter()
              .append('line')
              .attr('class', 'link')
              .attr('stroke', '#ccc')
              .attr('stroke-width', 2);
          link.exit().remove();

          node.enter()
              .append('circle')
              .attr('class', 'node')
              .attr('r', function(d) { return scope.weight(d.connections); })
              .attr('fill', function(d) { return scope.color(d.type); })

          node.on('click', function(d) {
                  console.log(d);
              });
          node.exit().remove();

          force.start();

      }
    };
  }]);
