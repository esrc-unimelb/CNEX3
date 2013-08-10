/* 
 *   EntityNetworkController 
*/
function EntityNetworkController($scope, $routeParams, $http, $location) {

    $scope.init = function() {
        // populate the info about our focus record
        $scope.record = $scope.recordInformation($routeParams.record);

        var config = {};
        config.params = {
            'name': $routeParams.record
        }
        // assemble list of targets connected from this source

        // get publication counts
        $scope.publications = [];
        $http.get('/vlab/entity', config)
            .then(function(response) {
                for (var i = 0; i < response.data.publications.length; i++) {
                    var uuid = response.data.publications[i];
                    $scope.getPublicationDetails(uuid);
                }
            });
        // populate the link count - src and tgt - for each entity
        $scope.src_links = [];
        $scope.tgt_links = [];
        $http.get('/vlab/link', config)
            .then(function(response) {
                for (var i = 0; i < response.data.src_links.length; i++) {
                    var data = response.data.src_links[i];
                    $scope.src_links.push({ 
                        'uuid': data.uuid, 
                        'data': $scope.recordInformation(data.tgt) ,
                        'assertion': data.assertion
                    });
                }
                
                for (var i = 0; i < response.data.tgt_links.length; i++) {
                    var data = response.data.tgt_links[i];
                    $scope.tgt_links.push({ 
                        'uuid': data.uuid, 
                        'data': $scope.recordInformation(data.src), 
                        'assertion': data.assertion 
                    });
                }
            });

            // assemble the graph
            var config = {};
            config.params = {
                'name': $routeParams.record
            };
            $http.get('/vlab/network', config)
                .then(function(response) {
                    drawGraph($routeParams.record, $scope.$eval(response.data.graph));
                });

            // populate the details pane with the details of the focus node
            $scope.node_data = $scope.recordInformation($routeParams.record);

    }

    // flesh out the details of a publication 
    //  as well the records referenced by the publication
    $scope.getPublicationDetails = function(uuid) {
        var config = {};
        config.params = {
            'uuid': uuid
        };
        $http.get('/vlab/publication', config)
            .then(function(response) {
                    var data = {
                        'uuid': response.config.params['uuid'],
                        'title': response.data.publication.title,
                        'url': '/#/publication/' + response.config.params['uuid'],
                        'related': []
                    };
                    for (var j=0; j < response.data.publication.members.length; j++) {
                        data.related.push($scope.recordInformation(response.data.publication.members[j]));
                    }
                    $scope.publications.push(data);
            });
    }

    $scope.publicationInformation = function(pub_id) {
        var config = {};
        config.params = {
            'uuid': pub_id
        };
        return $http.get('/vlab/publication', config)
            .then(function(response) {
                var record = {};
                record.id = pub_id;
                record.type = "Publication";
                record.source = "/#/publication/" + pub_id;
                record.site = 'Humanities Network Infrastructure Project';
                record.name = response.data.publication.title;
                record.network = '';
                return record;
            });
            
    }

    // get member data
    $scope.recordInformation = function(record_id) {
        return solrSearchService.getRecordData(record_id) 
            .then(function(response) {
                var record = {};
                var data = response[0];
                record.id = data.docid;
                record.type = data.type;
                record.source = data.prov_source;
                record.site = data.prov_site_long;
                record.network = '/#/network/' + data.docid;
                if (record.type === "Person") {
                    record.name = data.given_name + ' ' + data.family_name;
                } else if (record.type === ("Bibliography")) {
                    record.name = data.title.join();
                } else if (record.type === ("Film")) {
                    record.name = data.title.join();
                } else {
                    record.name = data.name;
                }
                return record;
            });
    }

    var drawGraph = function(record_id, data) {
        var nodes = data['nodes'];
        var links = data['links'];

        var width = window.innerWidth - 100,
            height = window.innerHeight * 0.8;

        var color = d3.scale.category20();

        var force = d3.layout.force()
            .charge(-800)
            .linkDistance(150)
            .linkStrength(1)
            .size([width, height]);

        // http://stackoverflow.com/questions/7871425/is-there-a-way-to-zoom-into-a-graph-layout-done-using-d3
        // http://stackoverflow.com/questions/12310024/fast-and-responsive-interactive-charts-graphs-svg-canvas-other
        d3.select('svg').remove();
        var svg = d3.select("#graph").append("svg")
            .attr("width", width)
            .attr("height", height);
            //.append("g")
            //.call(d3.behavior.zoom().scaleExtent([0.5, 8]).on("zoom", function() {
            //    svg.attr("transform", 
            //        "translate(" + d3.event.translate + ")"
            //              + " scale(" + d3.event.scale + ")");
            //}));

        force
            .nodes(nodes)
            .links(links)
            .start();

        var link = svg.selectAll(".link")
            .data(links)
            .enter()
            .append("line")
            .attr("class", function(d) {
                if (d.type === 'pub_connection') {
                    return "link_pub";
                } else {
                    return "link";
                }
            })
            .style("stroke-width", function(d) { return Math.sqrt(d.value); });

        var circle = svg.append("g")
            .selectAll("circle")
            .data(nodes)
            .enter()
            .append("circle")
            .attr("r", function(d) {
                if (d.id === record_id) {
                    return 40;
                } else {
                    return 10;
                }
            })
            .style("fill", function(d) { return color(d.type); })
            .call(force.drag);

        circle.on("click", function(d) {
            if ( d.type === 'Publication' ) {
                $scope.node_data =  $scope.publicationInformation(d.id);
                $scope.$apply();
            } else {
                $scope.node_data = $scope.recordInformation(d.id);
                $scope.$apply();
            }
        });

        var text = svg.append("g")
            .selectAll("g")
            .data(nodes)
            .enter()
            .append("g");

        text.append("text")
            .attr("x", 15)
            .attr("y", ".35em")
            .text(function(d) { return d.type; });

        force.on("tick", function() {
            link.attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });

            circle.attr("transform", transform);

            text.attr("transform", transform);
          });

        var transform = function(d) {
            return "translate(" + d.x + "," + d.y + ")";
        }
   }

}
EntityNetworkController.$inject = ['$scope', '$routeParams', '$http', '$location', ]; 
