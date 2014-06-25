'use strict';

angular.module('interfaceApp')
  .directive('forceNetworkGraph', [ '$window', '$http', '$timeout', '$rootScope', 'configuration', 'ForceData',
        function ($window, $http, $timeout, $rootScope, configuration, ForceData) {
    return {
      templateUrl: 'views/force-network-graph.html',
      restrict: 'E',
      scope: {
          site: '@',
          graph: '@'
      },
      link: function postLink(scope, element, attrs) {

          var w = $window.innerWidth;
          var h = $window.innerHeight;

          d3.select('svg').remove();
          scope.color = d3.scale.category20();
          scope.weight = d3.scale.linear().range([10, 80]);
          scope.nodes = [];
          scope.unConnectedNodes = [];
          scope.links = [];

          var redraw = function() {
              scope.svg.attr('transform', 'translate(' + d3.event.translate + ')' + ' scale(' + d3.event.scale + ')');
          }

          var tick = function() {
              scope.link.attr('x1', function(d) { return d.source.x; })
                  .attr('y1', function(d) { return d.source.y; })
                  .attr('x2', function(d) { return d.target.x; })
                  .attr('y2', function(d) { return d.target.y; });

              scope.node.attr('transform', function(d) {
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

          scope.svg = d3.select('#graph')
                .append('svg')
                .attr('width', w)
                .attr('height', h)
                .attr('viewBox', '0 0 ' + w + ' ' + h)
                .attr('preserveAspectRatio', 'xMidYMid meet')
                .call(d3.behavior.zoom().scaleExtent([0,8]).on('zoom', redraw))
                .append('g');

          scope.node = scope.svg.selectAll('.node');
          scope.link = scope.svg.selectAll('.link');

          scope.processData = function(data) {
              console.log('update graph');

              var nodes = JSON.parse(data.graph).nodes;
              var links = JSON.parse(data.graph).links;

              // given the graph, create an array with unconnected nodes
              // 
              // and
              //
              // nodes / links arrays 
              var i, j = 0, nodesTmp = [], nodeData = {};
              var connectedNodes = [], unConnectedNodes = [], processedLinks = [];
              var weightBounds = [];

              for (i=0; i<nodes.length; i++) {
                  var n = nodes[i].id;
                  var t = nodes[i].type;
                  var c = nodes[i].connections;
                  nodeData[n] = { 'type': t, 'connections': c };
                  weightBounds.push(c);
              }
              scope.weight.domain([Math.min.apply(null, weightBounds), Math.max.apply(null, weightBounds)]);

              // figure out the connectedNodes and associated links
              for (i=0; i<links.length; i++) {
                  j++;
                  var sn = links[i].source_name;
                  var tn = links[i].target_name;

                  if (nodesTmp.indexOf(sn) === -1) {
                      nodesTmp.push(sn);
                      scope.nodes.push({ 'name': sn, 'type': nodeData[sn].type, 'connections': nodeData[sn].connections });
                  }
                  if (nodesTmp.indexOf(tn) === -1) {
                      nodesTmp.push(tn);
                      scope.nodes.push({ 'name': tn, 'type': nodeData[tn].type, 'connections': nodeData[tn].connections });
                  }

                  scope.links.push({ 'source': nodesTmp.indexOf(sn), 'target': nodesTmp.indexOf(tn) });

                  if ( j >= 50 ) {
                      j = 0;
                      scope.draw('links');
                  }
              }

              // figure out the unConnected Nodes
              for (i=0; i<nodes.length; i++) {
                  var n = nodes[i].id;
                  if (nodesTmp.indexOf(n) === -1) {
                      scope.unConnectedNodes.push({ 'name': n});
                  }
              }
              
              console.log(scope.nodes);

              ForceData.nodes = scope.nodes;
              ForceData.links = scope.links;
              ForceData.unConnectedNodes = scope.unConnectedNodes;
              
              // now draw the nodes
              scope.draw('nodes');
          }

          scope.draw = function(update) {
              scope.link = scope.svg.selectAll('.link').data(scope.links);
              scope.node = scope.svg.selectAll('.node').data(scope.nodes);

              if (update === 'links') {
                  scope.link.enter()
                      .append('line')
                      .attr('class', 'link')
                      .attr('stroke', '#ccc')
                      .attr('stroke-width', 2);
                  scope.link.exit().remove();
              }

              if (update === 'nodes') {
                  scope.node.enter()
                      .append('circle')
                      .attr('class', 'node')
                      .attr('r', function(d) { return scope.weight(d.connections); })
                      .attr('fill', function(d) { return scope.color(d.type); })

                  scope.node.on('click', function(d) {
                          console.log(d);
                      });
                  scope.node.exit().remove();
              }

              force.start();
          }

          var init = function() {
              scope.service = configuration[configuration.service];
              scope.progress = false;
              scope.datasetError = false;
              scope.controls = false;
              scope.total = 0;
              scope.processed = 0;

              var url = scope.service + '/network/' + scope.site + '/' + scope.graph + '?callback=JSON_CALLBACK';
              console.log(url);
              $http.jsonp(url).then(function() {
                  // kick off the progress update in a moment; needs time to get going..
                  $timeout(function() { scope.update(); }, 200);
                  scope.progress = false;
              },
              function() {
                  scope.datasetError = true;
                  scope.progress = false;
              });

          };
          init();

          scope.update = function() {
              var url = scope.service + '/network/' + scope.site + '/' + scope.graph + '/status?callback=JSON_CALLBACK';
              $http.jsonp(url).then(function(response) {
                  if (response.data.processed !== null) {
                      scope.progress = true;
                      scope.controls = false;
                      scope.processed = response.data.processed;
                      scope.total = response.data.total;
                      $timeout(function() { scope.update(); }, 100);
                  } else {
                      scope.progress = false;
                      scope.controls = true;
                      scope.processData(response.data);
                  }
              },
              function(){
                  scope.progress = false;
              });
          };

      }
    };
  }]);
