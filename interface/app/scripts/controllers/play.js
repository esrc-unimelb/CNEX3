'use strict';

angular.module('interfaceApp')
  .controller('PlayCtrl', [ '$scope', '$window', function ($scope, $window) {

      var w = 500;
      var h = 400;

      var dataset = [
          { 'name': 'AE1', 'df': 2010, 'dt': null },
          { 'name': 'AE2', 'df': 2005, 'dt': 2011 },
          { 'name': 'AE3', 'df': null, 'dt': 2011 },
      ]

      $scope.points = [];
      $scope.ranges = [];
      angular.forEach(dataset, function(v, k) {
          if (v.df !== null && v.dt !== null) {
              $scope.ranges.push(v);
          } else {
              if (v.df !== null || v.dt !== null) {
                  $scope.points.push(v);
              }
          }
      });
      console.log($scope.ranges);
      console.log($scope.points);

      d3.select('svg').remove();
      var color = d3.scale.category20();


      var t1 = new Date(2000, 0, 1);
      var t2 = new Date(2014, 12, 31);

      var xScale = d3.time.scale()
                .domain([t1, t2])
                .range([30, (w - 30)]);

      var xAxis = d3.svg.axis()
                    .scale(xScale)
                    .ticks(d3.time.years)
                    .tickSize(6, 0)
                    .orient("bottom");

      var yScale = d3.scale.linear()
                     .domain([0, 1])
                     .range([30, (h-100)]);

      /*
      var yAxis = d3.svg.axis()
                    .scale(yScale)
                    .ticks(dataset.length)
                    .orient('left');
      */

      var svg = d3.select('#graph')
            .append('svg')
            .attr('width', w)
            .attr('height', h);

      var gx = svg.append('g')
                  .attr('class', 'axis')
                  .attr('transform', 'translate(0,' + (h - 100) + ')')
                  .call(xAxis);

      /*
      var gy = svg.append('g')
                  .attr('class', 'axis')
                  .attr('transform', 'translate(30, 0)')
                  .call(yAxis);
      */

      var rect = svg.selectAll('rect').data($scope.ranges);
      rect.enter()
          .append('rect')
          .attr('class', 'rect')
          .attr('x', function(d) {
              var date = Date.parse(d.df);
              console.log(d.name, 'x', xScale(date));
              return xScale(date);
          })
          .attr('y', function(d, i) {
              console.log(d.name, 'y', yScale(Math.random()));
              return yScale(Math.random());
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
          .attr('height', '10')
          .attr('fill', 'grey');

        var circle = svg.selectAll('circle').data($scope.points);
        circle.enter()
              .append('circle')
              .attr('class', 'circle')
              .attr('cx', function(d) {
                  if (d.df !== null) {
                      var date = Date.parse(d.df);
                  } else {
                      var date = Date.parse(d.dt);
                  }
                  console.log(d.name, 'x', xScale(date));
                  return xScale(date);
            })
              .attr('cy', function(d, i) {
                  console.log(d.name, 'y', yScale(Math.random()));
                  return yScale(Math.random());
              })
              .attr('r', '5')
              .attr('fill', function(d) {
                  if (d.df !== null) {
                      return 'red';
                  } else {
                      return 'green';
                  }
              });

  }]);


