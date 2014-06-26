'use strict';

angular.module('interfaceApp')
  .directive('forceNetworkGraph', [ '$rootScope', '$window', '$http', '$routeParams', 'configuration', 'DataService', 
    function ($rootScope, $window, $http, $routeParams, configuration, DataService) {
    return {
      templateUrl: 'views/force-network-graph.html',
      restrict: 'E',
      scope: {
      },
      link: function postLink(scope, element, attrs) {

          scope.nodes = DataService.nodes;
          scope.links = DataService.links;
          console.log(scope.nodes);
          var weightBounds = DataService.weightBounds;


          // create a local data object keyed on name to allow
          //  easy retrival of node data when required
          scope.data = {};
          angular.forEach(scope.nodes, function(v, k) {
              scope.data[v.name] = v;
          });

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
                  var highlightLocalEnvironment = function() {
                  }
                  var n = d.name;
                  var neighbours = [];
                  neighbours.push(n);

                  // figure out all the focus nodes' neighbours
                  angular.forEach(force.links(), function(v,k) {
                      var sn = v.source.name;
                      var tn = v.target.name;
                      if (sn === n || tn === n) { 
                          if (neighbours.indexOf(sn) === -1) {
                              neighbours.push(sn);
                          }
                          if (neighbours.indexOf(tn) === -1) {
                              neighbours.push(tn); 
                          }
                      }
                  });

                  node.transition()
                      .attr('fill', function(d) {
                          if (d.name === n) {
                              return 'red';
                          } else if (neighbours.indexOf(d.name) !== -1) {
                              return 'green';
                          } else {
                              return 'grey';
                          }
                      })
                      .attr('opacity', function(d) {
                          if (neighbours.indexOf(d.name) !== -1 || d.name === n) {
                            return '1';
                          } else {
                              return '0.3';
                          }
                      })
                  link.transition()
                      .attr('stroke', function(d) {
                          if (d.source.name === n && neighbours.indexOf(d.target.name) !== -1) {
                              return 'green';
                          } else if (neighbours.indexOf(d.source.name) !== -1 && d.target.name === n) {
                              return 'green';
                          } else {
                              return '#ccc';
                          }
                      })
                      .attr('opacity', function(d) {
                          if (d.source.name === n && neighbours.indexOf(d.target.name) !== -1) {
                              return '1';
                          } else if (neighbours.indexOf(d.source.name) !== -1 && d.target.name === n) {
                              return '1';
                          } else {
                              return '0.1';
                          }
                      })

                  // then drop the focus node from the neighbour array
                  var nn = neighbours.shift();
                  
                  // store the data context node and neighbours in the service
                  //   which is watching for these and will update the local data 
                  //   on change
                  var url = configuration.solr + '?spellcheck=off&q=id:"' + scope.data[n].url + '"&wt=json&json.wrf=JSON_CALLBACK';
                  $http.jsonp(url).then(function(d) {
                      DataService.contextNodeData = d.data.response.docs[0];
                      $rootScope.$broadcast('context-node-data-ready');
                  },
                  function() {
                  });
                 

                  DataService.contextNetworkData = [];
                  angular.forEach(neighbours, function(v,k) {
                      var url = configuration.solr + '?spellcheck=off&q=id:"' + scope.data[v].url + '"&wt=json&json.wrf=JSON_CALLBACK';
                      $http.jsonp(url).then(function(d) {
                          DataService.contextNetworkData.push(d.data.response.docs[0]);
                          $rootScope.$broadcast('context-node-neighbour-data-ready');
                      },
                      function() {
                      });
                 });

              });
          node.exit().remove();

          force.start();

      }
    };
  }]);
