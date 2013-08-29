/* 
 *   EntityNetworkController 
*/
function EntityNetworkController($scope, $routeParams, $http, $timeout) {

    $scope.code = $routeParams.code;
    $scope.entity_id = $routeParams.id;

    $scope.init = function() {
        // kick off an update in a second - needs time to get going 
        //var t = $timeout(function() { $scope.update(); }, 500);

        $scope.getNodeData($scope.entity_id);

        // get the data
        var site_url = base_url + '/entity/' + $scope.code + '/' + $scope.entity_id + '?callback=JSON_CALLBACK';
        $http.jsonp(site_url)
            .then(function(response) {
                $scope.nnodes = response.data.nnodes;
                drawGraph($scope.$eval(response.data.graph));
            },
            function(response) {
                // error raised by backend
                $scope.dataset_error = true;
            });
    }

    $scope.getNodeData = function(id) {
        var url = base_url + '/data/' + $scope.code + '/' + id + '?callback=JSON_CALLBACK';
        $http.jsonp(url)
            .then(function(response) {
                data = response.data.data;
                $scope.node_data = {};
                $scope.node_data.name = data['name'];
            },
            function(response) {
                console.log('$scope.getNodeData: JSONP failed:', response.status);
            });
    }

    var drawGraph = function(data) {
        var nodes = data['nodes'];
        var links = data['links'];

        var width = window.innerWidth - 50,
            height = window.innerHeight - 50;

        var color = d3.scale.category20();

        var force = d3.layout.force()
            .linkStrength(1)
            .size([width, height]);

        // http://stackoverflow.com/questions/7871425/is-there-a-way-to-zoom-into-a-graph-layout-done-using-d3
        // http://stackoverflow.com/questions/12310024/fast-and-responsive-interactive-charts-graphs-svg-canvas-other
        d3.select('svg').remove();
        var svg = d3.select("#graph").append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", "0 0 " + width + " " + height )
            .attr("preserveAspectRatio", "xMidYMid meet")
            .attr("pointer-events", "all")
            .call(d3.behavior.zoom().scaleExtent([0, 8]).on("zoom", redraw))
            .append('svg:g');

        force
            .nodes(nodes)
            .links(links)
            .charge(function(nodes) {
                console.log(nodes);
                if (nodes.type === 'complex') {
                    if ($scope.nnodes > 500) {
                        return -100;
                    } else {
                        return -1000;
                    }
                } else if (nodes.type === 'simple') {
                    if ($scope.nnodes > 500) {
                        return -200;
                    } else {
                        return -2000;
                    }
                } else {
                    if ($scope.nnodes > 500) {
                        return -400;
                    } else {
                        return -4000
                    }
                }
            })
            .linkDistance(function(nodes) {
                if (nodes.source.type === 'complex') {
                    return 60;
                } else if (nodes.target.type === 'complex') {
                    return 60;
                } else if (nodes.source.type === 'simple') {
                    return 400;
                } else if (nodes.target.type === 'simple') {
                    return 400;
                } else {
                    return 10;
                }
            })
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
            .attr("r", function(d) {
                if (d.tag === 'relations') { 
                    return 30;
                //} else if (['control', 'cpfDescription', 'identity', 'description', 'relations'].indexOf(d.tag) >= 0) {
                } else if (d.tag === 'cpfRelation') {
                    return 20;
                } else if (d.tag === 'resourceRelation') {
                    return 20;
                } else {
                    return 10;
                }
            })
            .style("fill", function(d) { 
                if (d.type === 'complex') {
                    return color(1); 
                } else if ( d.type === 'simple' ) {
                    return color(2);
                } else {
                    return color(3);
                }
            });
            //.call(force.drag);

        node.on("click", function(d) {
            $scope.element = {};
            $scope.element.name = d.tag;
            $scope.element.data = {};
            for (var elem in d) {
                if (['x', 'y', 'px', 'py', 'id', 'tag', 'index', 'weight'].indexOf(elem) === -1) {
                    $scope.element.data[elem] = d[elem];
                }

            }
            $scope.$apply();
        });

        var text = svg.append("g")
            .selectAll("g")
            .data(nodes)
            .enter()
            .append("g");

/*        text.append("text")
            .attr("x", 15)
            .attr("y", ".35em")
            .text(function(d) { return d.type; });
*/

        force.on("tick", function() {
            link.attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });

            node.attr("transform", transform);

            text.attr("transform", transform);
          });

        function redraw() {
            svg.attr("transform",
                "translate(" + d3.event.translate + ")"
                + " scale(" + d3.event.scale + ")");
        }
        function transform(d) {
            return "translate(" + d.x + "," + d.y + ")";
        }

   }

}
EntityNetworkController.$inject = ['$scope', '$routeParams', '$http', '$timeout', ]; 
