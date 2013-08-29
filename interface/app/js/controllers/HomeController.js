/* 
 *   HomeController 
*/
function HomeController($scope, $routeParams, $http, $timeout, $location) {

    var base_url = 'http://dev01:3000';

    $scope.init = function () {
        $scope.progress = false;
        $scope.dataset_error = false;

        // get the data
        var site_url = base_url + '/';
        $http.get(site_url)
            .then(function (response) {
                console.log(response);
                $scope.drawGraph($scope.$eval(response.data.graph));
            },
            function (response) {
                console.log('error');
                console.log(response);
                $scope.dataset_error = true;
            });


    }

    $scope.drawGraph = function (data) {
        var width = window.innerWidth; 
            height = window.innerHeight;

        color = d3.scale.category20();

        force = d3.layout.force()
            .charge(-2000)
            .linkDistance(200)
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
            //.call(d3.behavior.zoom().scaleExtent([0, 8]).on("zoom", redraw))
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
            .attr("r", function(d) { return node_radius(d.id); })
            .style("fill", function (d) { return color(d.id); })
            .style("stroke", '#000')
            .call(force.drag);

        var text = svg.append("g")
            .selectAll("g")
            .data(nodes)
            .enter()
            .append("g");

        text.append("text")
            .attr('id', function (d) { return d.id; })
            .style("font-size", function(d) { return node_radius(d.id) * 0.5; })
            .text(function (d) { 
                return d.name;
            });

        node.on("mouseover", function (d, i) {
            if (d.id === 'ESRC' || d.id === 'FACP') {
                return;
            }

            d3.select(this)
                .transition()
                .duration(500)
                .attr("r", function (d) { return node_radius(d.id) * 2; });

            d3.select('#' + d.id)
                .style("font-weight", "bold");
       
            $scope.hover_node = d3.select('#' + d.id).text();
            $scope.$apply();
        });
        node.on("mouseout", function (d) {
            if (d.id === 'ESRC' || d.id === 'FACP') {
                return;
            }
            d3.select(this)
                .transition()
                .duration(500)
                .attr("r", function (d) { return node_radius(d.id); });

            d3.select('#' + d.id)
                .style("font-weight", "normal");

            $scope.hover_node = false;
            $scope.$apply();
        });
        node.on("click", function (d) {
            if (d.id === 'ESRC' || d.id === 'FACP') {
                return;
            }
            $location.url('/site/' + d.id + '/graph');
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
            text.attr("transform", function(d){
                return "translate(" + d.x + "," + d.y + ")";
            });
        });

        function node_radius(id) {
            if (id === 'ESRC') {
                return 80;
            } else if (id === 'FACP') {
                return 60;
            } else {
                return 25;
            }
        }

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
   }

}
HomeController.$inject = ['$scope', '$routeParams', '$http', '$timeout', '$location' ]; 
