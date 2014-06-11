'use strict';

angular.module('interfaceApp')
  .directive('forceNetworkGraph', [ '$window', '$http', '$timeout', 'configuration',  function ($window, $http, $timeout, configuration) {
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
          var color = d3.scale.category20();
          var nodes = [];
          var links = [];

          var redraw = function() {
              var svg = d3.select('svg').select('g');
              svg.attr('transform', 'translate(' + d3.event.translate + ')' + ' scale(' + d3.event.scale + ')');
          }

          var tick = function() {
              var node = d3.selectAll(".node");
              var link = d3.selectAll(".link");
              link.attr('x1', function(d) { return d.source.x; })
                  .attr('y1', function(d) { return d.source.y; })
                  .attr('x2', function(d) { return d.target.x; })
                  .attr('y2', function(d) { return d.target.y; });

              node.attr('transform', function(d) {
                return 'translate(' + d.x + ',' + d.y + ')';
              });
          }

          var svg = d3.select('#graph')
                .append('svg')
                .attr('width', w)
                .attr('height', h)
                .attr('viewBox', '0 0 ' + w + ' ' + h)
                .attr('preserveAspectRatio', 'xMidYMid meet')
                .call(d3.behavior.zoom().scaleExtent([0,8]).on('zoom', redraw))
                .append('g');

          var force = d3.layout.force()
                .nodes(nodes)
                .links(links)
                .charge(-1000)
                .linkDistance(100)
                .linkStrength(1)
                .size([w, h])
                .on('tick', tick);

          scope.updateGraph = function(data) {
              console.log('update graph');
              console.log(data);

              var nnodes = data.nodes.length;
              var nstart = scope.nodesProcessed === undefined ? 0 : scope.nodesProcessed;

              var nlinks = data.links.length;
              var lstart = scope.linksProcessed === undefined ? 0 : scope.linksProcessed;

              var i;
              for (i=nstart; i < nnodes; i++) {
                  nodes.push(data.nodes[i]);  
              }
              for (i=lstart; i < nlinks; i++) {
                  links.push(data.links[i]);
              }
              scope.linksProcessed = nlinks;
              scope.nodesProcessed = nnodes;

              var svg = d3.select('svg').select('g');
              var link = svg.selectAll('.link').data(links);
              link.enter()
                  .append('line')
                  .attr('class', 'link')
                  .attr('stroke', '#ccc')
                  .attr('stroke-width', 2);
              link.exit().remove();

              var node = svg.selectAll('.node').data(nodes);
              node.enter()
                  .append('circle')
                  .attr('class', 'node')
                  .attr('r', 10)
                  .attr('fill', function(d) { return color(Math.random()); })
              node.on('click', function(d) {
                      console.log(d.id);
                  });
              node.exit().remove();

              force.start();
          }

          var init = function() {
              scope.service = configuration[configuration.service];
              scope.progress = false;
              scope.datasetError = false;
              scope.controls = false;
              scope.total = 0;
              scope.processed = 0;

              // kick off the progress update in a moment; needs time to get going..
              $timeout(function() { scope.update(); }, 200);

              var url;
              url = scope.service + '/network/' + scope.site + '/' + scope.graph + '?callback=JSON_CALLBACK';
              console.log(url);
              $http.jsonp(url).then(function() {
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
                      var graph = JSON.parse(response.data.graph);
                      scope.updateGraph(graph);
                      $timeout(function() { scope.update(); }, 100);
                  } else {
                      scope.progress = false;
                      scope.controls = true;
                      var graph = JSON.parse(response.data.graph);
                      scope.updateGraph(graph);
                  }
              },
              function(){
                  scope.progress = false;
              });
          };

      }
    };
  }]);
