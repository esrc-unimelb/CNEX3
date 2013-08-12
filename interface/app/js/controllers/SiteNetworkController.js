/* 
 *   SiteNetworkController 
*/
function SiteNetworkController($scope, $routeParams, $http, $timeout) {

    var base_url = 'http://dev01:3000';
    $scope.code = $routeParams.code;

    $scope.init = function() {
        $scope.progress = false;
        $scope.dataset_error = false;

        // kick off an update in a second - needs time to get going 
        var t = $timeout(function() { $scope.update(); }, 500);

        // get the data
        var site_url = base_url + '/site/' + $scope.code + '?callback=JSON_CALLBACK';
        $http.jsonp(site_url)
            .then(function(response) {
                $scope.site_name = response.data.site_name;
                drawGraph($scope.$eval(response.data.graph));
            },
            function(response) {
                // error raised by backend
                $scope.dataset_error = true;
            });
    }

    // method to handle status updates
    $scope.update = function() {
        $scope.progress = true;
        var url = base_url + '/status?callback=JSON_CALLBACK';
        $http.jsonp(url)
            .then(function(response) {
                $scope.processed = parseInt(response.data['processed']);
                $scope.total = parseInt(response.data['total']);
                if ($scope.processed < $scope.total) {
                    var $t = $timeout(function() { $scope.update(); }, 100);
                } else {
                    $scope.progress = false;
                }
            });
    }

    $scope.getNodeData = function(id) {
        var url = base_url + '/data/' + $scope.code + '/' + id + '?callback=JSON_CALLBACK';
        $http.jsonp(url)
            .then(function(response) {
                data = response.data.data;
                $scope.node_data.name = data['name'];
                $scope.node_data.from = data['from'];
                $scope.node_data.to = data['to'];
            },
            function(response) {
                console.log('$scope.getNodeData: JSONP failed:', response.status);
            });
    }

    var drawGraph = function(data) {
        var nodes = data['nodes'];
        var links = data['links'];

        var width = window.innerWidth - 50; 
            height = window.innerHeight - 100;

        var color = d3.scale.category20();

        var force = d3.layout.force()
            .charge(-1000)
            .linkDistance(100)
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
            .attr("r", 10)
            .style("fill", function(d) { return color(d.type); });
            //.call(force.drag);

        node.on("click", function(d) {
            $scope.node_data = {};
            $scope.node_data.id = d.id;
            $scope.node_data.source = d.source;
            $scope.node_data.type = d.type;
            $scope.getNodeData(d.id);
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
        var transform = function(d) {
            return "translate(" + d.x + "," + d.y + ")";
        }

   }

}
SiteNetworkController.$inject = ['$scope', '$routeParams', '$http', '$timeout', ]; 
