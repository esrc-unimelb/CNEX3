'use strict';

angular.module('interfaceApp')
  .directive('dateVis', [ '$rootScope', '$window', 'configuration', 'DataService', function ($rootScope, $window, configuration, DataService) {
    return {
      templateUrl: 'views/date-vis.html',
      restrict: 'E',
      scope: {
      },
      link: function postLink(scope, element, attrs) {
          scope.visible = true;
          $rootScope.$on('force-reset', function() {
              rect.transition()
                  .attr('fill', configuration.highlight.default)
                  .attr('opacity', configuration.opacity.highlight)
                  .attr('height', '5')
                  .attr('stroke', configuration.highlight.default);
              circle.transition()
                    .attr('fill', configuration.highlight.default)
                    .attr('opacity', configuration.opacity.highlight)
                    .attr('r', '5')
                    .attr('stroke', configuration.highlight.default);
          });

          scope.width = 400;
          scope.height = 400;
          scope.top = $window.innerHeight - scope.height - 15;

          var nodes = DataService.nodes;
          var points = [], ranges = [], dates = [];

          angular.forEach(nodes, function(v,k) {
              if (v.df !== null && v.dt !== null) {
                  dates.push(v.df);
                  dates.push(v.dt);
                  ranges.push(v);
              } else {
                  if (v.df !== null) {
                      dates.push(v.df);
                      points.push(v);
                  } else if (v.dt !== null) {
                      dates.push(v.dt);
                      points.push(v);
                  }
              }
          });

          var t1 = Date.parse(d3.min(dates));
          var t2 = Date.parse(d3.max(dates));

          var xScale = d3.time.scale()
                          .domain([t1, t2])
                          .range([10, (scope.width - 10)]);

          var xAxis = d3.svg.axis()
                        .scale(xScale)
                        .ticks(d3.time.years)
                        .ticks(6)
                        .orient("bottom");

          // redraw the view when zooming
          var redraw = function() {
              svg.attr('transform', 'translate(' + d3.event.translate + ')' + ' scale(' + d3.event.scale + ')');
          }

          var svg = d3.select('#datevis')
                      .append('svg')
                      //.attr('viewBox', '0 0 ' + scope.width + ' ' + scope.height)
                      //.attr('preserveAspectRatio', 'xMidYMid meet')
                      //.call(d3.behavior.zoom().scaleExtent([0,8]).on('zoom', redraw))
                      .append('g');

          var gx = svg.append('g')
                      .attr('class', 'axis')
                      .attr('transform', 'translate(0,' + (scope.height - 30) + ')')
                      .call(xAxis);


          var yScale = d3.scale.linear()
                         .domain([0, ranges.length])
                         .range([10, (scope.height-50)]);

          var rect = svg.selectAll('rect').data(ranges);
          rect.enter()
              .append('rect')
              .attr('class', 'rect')
              .attr('x', function(d) {
                  var date = Date.parse(d.df);
                  return xScale(date);
              })
              .attr('y', function(d, i) {
                  return yScale(i);
              })
              .attr('width', function(d) {
                  if (d.dt === undefined || d.dt === '') {
                      return 100;
                  } else {
                      var df = Date.parse(d.df);
                      var dt = Date.parse(d.dt);
                      return xScale(dt) - xScale(df);
                  }
              })
              .attr('height', '5')
              .attr('fill', configuration.highlight.default);


          yScale.domain([0, points.length]);
          var circle = svg.selectAll('circle').data(points);
          circle.enter()
              .append('circle')
              .attr('class', 'circle')
              .attr('cx', function(d) {
                  if (d.df !== null) {
                      var date = Date.parse(d.df);
                  } else {
                      var date = Date.parse(d.dt);
                  }
                  return xScale(date);
              })
              .attr('cy', function(d, i) {
                  return yScale(i);
              })
              .attr('r', '3')
              .attr('fill', configuration.highlight.default);
      }
    };
  }]);
