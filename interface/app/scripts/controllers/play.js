'use strict';

angular.module('interfaceApp')
  .controller('PlayCtrl', [ '$scope', '$window', function ($scope, $window) {

      $scope.items = [ 'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10' ];

      var w = $window.innerWidth;
      var h = $window.innerHeight;

      d3.select('svg').remove();
      var color = d3.scale.category20();
      var nodes = [ { name: 'E0' }];
      var links = [];

      var force = d3.layout.force()
            .nodes(nodes)
            .links(links)
            .charge(-1000)
            .linkDistance(100)
            .linkStrength(1)
            .size([w, h])
            .on('tick', tick);

      var svg = d3.select('#graph')
            .append('svg')
            .attr('width', w)
            .attr('height', h)
            .attr('viewBox', '0 0 ' + w + ' ' + h)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .call(d3.behavior.zoom().scaleExtent([0,8]).on('zoom', redraw))
            .append('g');

      svg.append("g").attr("class", "links");
      svg.append("g").attr("class", "nodes");

      var node = svg.select(".nodes").selectAll(".node");
      var link = svg.select(".links").selectAll(".link");

      $scope.removeOne = function() {
          var node = nodes.splice(0,1);
          links.splice(0,1);
          $scope.items.push(node[0].name);
          update();
      };

      $scope.addOne = function() {
          var n = $scope.items.shift();
          var link = { source: nodes.length-1, target: nodes.length };
          nodes.push( { name: n });
          links.push(link);
          update();
      }
      $scope.addTen = function() {
        for (var i=0; i<5; i++) {
            $scope.addOne();
        }
      }

      var update = function() {
          force.start();

          console.log(links);
          link = link.data(links);

          link.enter()
              .append('line')
              .attr('class', 'link')
              .attr('stroke', '#ccc')
              .attr('stroke-width', 2);
          link.exit().remove();

          console.log(nodes);
          node = node.data(nodes);

          node.enter()
              .append('circle')
              .attr('class', 'node')
              .attr('r', 10)
              .attr('fill', function(d) { return color(Math.random()); });
          node.exit().remove();

      }

      function tick() {
          link.attr('x1', function(d) { return d.source.x; })
              .attr('y1', function(d) { return d.source.y; })
              .attr('x2', function(d) { return d.target.x; })
              .attr('y2', function(d) { return d.target.y; });

          node.attr('transform', function(d) {
            return 'translate(' + d.x + ',' + d.y + ')';
          });

      }

      function redraw() {
          svg.attr('transform', 'translate(' + d3.event.translate + ')' + ' scale(' + d3.event.scale + ')');
      }

      function scale(d) {
          var log = d3.scale.log().range([10,30]);
          if (d.connections == 0) {
            return log(1);
          } else {
              return log(d.connections);
          }
      }

  }]);


