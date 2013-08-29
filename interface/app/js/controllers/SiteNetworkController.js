/* 
 *   SiteNetworkController 
*/
function SiteNetworkController($scope, $routeParams, $http, $timeout) {

    var base_url = 'http://dev01:3000';
    $scope.code = $routeParams.code;
    $scope.vistype = $routeParams.vistype;

    $scope.init = function () {
        $scope.progress = false;
        $scope.dataset_error = false;

        // kick off the progress update in a second - needs time to get going 
        $timeout(function () { $scope.update(); }, 100);

        // get the data
        if ($scope.vistype == 'graph') {
            var site_url = base_url + '/graph/' + $scope.code + '?callback=JSON_CALLBACK';
            $http.jsonp(site_url)
                .then(function (response) {
                    $scope.site_name = response.data.site_name;
                    $scope.drawGraph($scope.$eval(response.data.graph));
                },
                function (response) {
                    $scope.dataset_error = true;
                });

        } else if ($scope.vistype == 'tree') {
            var site_url = base_url + '/dendrogram/' + $scope.code;
            drawSunburst(site_url);
        }

    }

    // method to handle status updates
    $scope.update = function () {
        var url = base_url + '/status/' + $scope.code + '?callback=JSON_CALLBACK';
        $http.jsonp(url)
            .then(function (response) {
                $scope.processed = response.data['processed'];
                $scope.total = response.data['total'];
                $scope.progress = true;
                var $t = $timeout(function() { $scope.update(); }, 100);
            },
            function (response) {
                $scope.progress = false;
            });
    }

    $scope.drawGraph = function (data) {
        var width = window.innerWidth; 
            height = window.innerHeight;

        color = d3.scale.category20();

        force = d3.layout.force()
            .charge(-1000)
            .linkDistance(100)
            .linkStrength(1)
            .size([width, height]);

        // http://stackoverflow.com/questions/7871425/is-there-a-way-to-zoom-into-a-graph-layout-done-using-d3
        // http://stackoverflow.com/questions/12310024/fast-and-responsive-interactive-charts-graphs-svg-canvas-other
        d3.select('svg').remove();

        svg = d3.select("#vis").append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", "0 0 " + width + " " + height )
            .attr("preserveAspectRatio", "xMidYMid meet")
            .attr("pointer-events", "all")
            .call(d3.behavior.zoom().scaleExtent([0, 8]).on("zoom", redraw))
            .append('svg:g');

        var nodes = data['nodes'];
        var links = data['links'];

        force
            .nodes(nodes)
            .links(links)
            .start();

        var link = svg.selectAll(".link")
            .data(links)
            .enter()
            .append("line")
            .attr("class", "link")
            .style("stroke-width", 1);

        var node = svg.append("g")
            .selectAll("circle")
            .data(nodes)
            .enter()
            .append("circle")
            .attr("r", function (d) { return scale(d); })
            .style("fill", function (d) { return color(d.type); })
            .style("stroke", '#000');
            //.call(force.drag);

        node.on("click", function (d) {
            $scope.node_data = {};
            $scope.node_data.id = d.id;
            $scope.node_data.source = d.source;
            $scope.node_data.type = d.type;
            $scope.node_data.name = d.name;
            $scope.node_data.from = d.from;
            $scope.node_data.to = d.to;
            //console.log(d);
            $scope.$apply();
        });

        force.on("tick", function () {
            link.attr("x1", function (d) { return d.source.x; })
                .attr("y1", function (d) { return d.source.y; })
                .attr("x2", function (d) { return d.target.x; })
                .attr("y2", function (d) { return d.target.y; });

            node.attr("transform", function(d){
                return "translate(" + d.x + "," + d.y + ")";
            });
            //text.attr("transform", transform);
        });

        function redraw() {
            svg.attr("transform",
                "translate(" + d3.event.translate + ")"
                + " scale(" + d3.event.scale + ")");
        }
        function scale(d) {
            var log = d3.scale.log().range([10,30]);
            if (d.connections == 0) {
                return log(1);
            } else {
                return log(d.connections);
            }
        }
/*
        var text = svg.append("g")
            .selectAll("g")
            .data(nodes)
            .enter()
            .append("g");

        text.append("text")
            .attr("x", 15)
            .attr("y", ".35em")
            .text(function(d) { return d.type; });
*/
   }

   var drawDendrogram = function(data) {
        var width = window.innerWidth,
            height = window.innerHeight;

        var cluster = d3.layout.cluster()
            .size([height, width - 160]);

        var diagonal = d3.svg.diagonal()
            .projection(function(d) { return [d.y, d.x]; });

        var svg = d3.select("#vis").append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", "translate(40,0)");

        var nodes = cluster.nodes(data),
              links = cluster.links(nodes);

        var link = svg.selectAll(".link")
            .data(links)
            .enter().append("path")
            .attr("class", "link")
            .attr("d", diagonal);

        var node = svg.selectAll(".node")
            .data(nodes)
            .enter().append("g")
            .attr("class", "node")
            .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })

        node.append("circle")
            .attr("r", 4.5);

        node.append("text")
            .attr("dx", function(d) { return d.children ? -8 : 8; })
            .attr("dy", 3)
            .style("text-anchor", function(d) { return d.children ? "end" : "start"; })
            .text(function(d) { return d.name; });

        d3.select(self.frameElement).style("height", height + "px");
   }

    var drawSunburst = function(url) {
        var width = 840,
            height = width,
            radius = width / 2,
            x = d3.scale.linear().range([0, 2 * Math.PI]),
            y = d3.scale.pow().exponent(1.3).domain([0, 1]).range([0, radius]),
            padding = 5,
            duration = 1000;

        var div = d3.select("#vis");

        div.select("img").remove();

        var vis = div.append("svg")
            .attr("width", width + padding * 2)
            .attr("height", height + padding * 2)
          .append("g")
            .attr("transform", "translate(" + [radius + padding, radius + padding] + ")");

        div.append("p")
            .attr("id", "intro")
            .text("Click to zoom!");

        var partition = d3.layout.partition()
            .sort(null)
            .value(function(d) { return 5.8 - d.depth; });

        var arc = d3.svg.arc()
            .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
            .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
            .innerRadius(function(d) { return Math.max(0, d.y ? y(d.y) : d.y); })
            .outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)); });

        d3.json(url, function(error, json) {
          //json = json.dendrogram;
          var nodes = partition.nodes({children: json});

          var path = vis.selectAll("path").data(nodes);
          path.enter().append("path")
              .attr("id", function(d, i) { return "path-" + i; })
              .attr("d", arc)
              .attr("fill-rule", "evenodd")
              .style("fill", function(d) {
                  return d.color;
              })
              .on("click", click);

          var text = vis.selectAll("text").data(nodes);
          var textEnter = text.enter().append("text")
              .style("fill-opacity", 1)
              .style("fill", function(d) {
                return brightness(d3.rgb(d.colour)) < 125 ? "#eee" : "#000";
              })
              .attr("text-anchor", function(d) {
                return x(d.x + d.dx / 2) > Math.PI ? "end" : "start";
              })
              .attr("dy", ".2em")
              .attr("transform", function(d) {
                var multiline = (d.name || "").split(" ").length > 1,
                    angle = x(d.x + d.dx / 2) * 180 / Math.PI - 90,
                    rotate = angle + (multiline ? -.5 : 0);
                return "rotate(" + rotate + ")translate(" + (y(d.y) + padding) + ")rotate(" + (angle > 90 ? -180 : 0) + ")";
              })
              .on("click", click);
          textEnter.append("tspan")
              .attr("x", 0)
              .text(function(d) { return d.depth ? d.name.split(" ")[0] : ""; });
          textEnter.append("tspan")
              .attr("x", 0)
              .attr("dy", "1em")
              .text(function(d) { return d.depth ? d.name.split(" ")[1] || "" : ""; });

          function click(d) {
            path.transition()
              .duration(duration)
              .attrTween("d", arcTween(d));

            // Somewhat of a hack as we rely on arcTween updating the scales.
            text.style("visibility", function(e) {
                  return isParentOf(d, e) ? null : d3.select(this).style("visibility");
                })
              .transition()
                .duration(duration)
                .attrTween("text-anchor", function(d) {
                  return function() {
                    return x(d.x + d.dx / 2) > Math.PI ? "end" : "start";
                  };
                })
                .attrTween("transform", function(d) {
                  var multiline = (d.name || "").split(" ").length > 1;
                  return function() {
                    var angle = x(d.x + d.dx / 2) * 180 / Math.PI - 90,
                        rotate = angle + (multiline ? -.5 : 0);
                    return "rotate(" + rotate + ")translate(" + (y(d.y) + padding) + ")rotate(" + (angle > 90 ? -180 : 0) + ")";
                  };
                })
                .style("fill-opacity", function(e) { return isParentOf(d, e) ? 1 : 1e-6; })
                .each("end", function(e) {
                  d3.select(this).style("visibility", isParentOf(d, e) ? null : "hidden");
                });
          }
        });

        function isParentOf(p, c) {
          if (p === c) return true;
          if (p.children) {
            return p.children.some(function(d) {
              return isParentOf(d, c);
            });
          }
          return false;
        }

        function colour(d) {
          if (d.children) {
            // There is a maximum of two children!
            var colours = d.children.map(colour),
                a = d3.hsl(colours[0]),
                b = d3.hsl(colours[1]);
            // L*a*b* might be better here...
            return d3.hsl((a.h + b.h) / 2, a.s * 1.2, a.l / 1.2);
          }
          return d.colour || "#fff";
        }

        // Interpolate the scales!
        function arcTween(d) {
          var my = maxY(d),
              xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
              yd = d3.interpolate(y.domain(), [d.y, my]),
              yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
          return function(d) {
            return function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); return arc(d); };
          };
        }

        function maxY(d) {
          return d.children ? Math.max.apply(Math, d.children.map(maxY)) : d.y + d.dy;
        }

        // http://www.w3.org/WAI/ER/WD-AERT/#color-contrast
        function brightness(rgb) {
          return rgb.r * .299 + rgb.g * .587 + rgb.b * .114;
        }
    // STOP
    }

}
SiteNetworkController.$inject = ['$scope', '$routeParams', '$http', '$timeout', ]; 
