'use strict';

angular.module('interfaceApp')
  .controller('SiteCtrl', [ '$rootScope', '$scope', '$routeParams', '$http', '$timeout', 'configuration', 'DataService',
    function($rootScope, $scope, $routeParams, $http, $timeout, configuration, DataService) {

        $scope.site = $routeParams.code; 
        $scope.graph = $routeParams.explore;
        $scope.service = configuration[configuration.service];

        $rootScope.$on('graph-ready', function() {
            $scope.showControls = true;
        })

        var init = function() {
            $scope.progress = false;
            $scope.datasetError = false;
            $scope.controls = false;
            $scope.total = 0;
            $scope.processed = 0;

            var url = $scope.service + '/network/' + $scope.site + '/' + $scope.graph + '?callback=JSON_CALLBACK';
            console.log(url);
            $http.jsonp(url).then(function() {
                // kick off the progress update in a moment; needs time to get going..
                $timeout(function() { $scope.update(); }, 200);
                $scope.progress = false;
            },
            function() {
                $scope.datasetError = true;
                $scope.progress = false;
            });

        };
        init();

        $scope.update = function() {
            var url = $scope.service + '/network/' + $scope.site + '/' + $scope.graph + '/status?callback=JSON_CALLBACK';
            $http.jsonp(url).then(function(response) {
                if (response.data.processed !== null) {
                    $scope.progress = true;
                    $scope.controls = false;
                    $scope.processed = response.data.processed;
                    $scope.total = response.data.total;
                    $timeout(function() { $scope.update(); }, 100);
                } else {
                    $scope.progress = false;
                    $scope.controls = true;
                    $scope.processData(response.data);
                }
            },
            function(){
                $scope.progress = false;
            });
        };

        $scope.processData = function(d) {
            console.log('update graph');

            var ns = JSON.parse(d.graph).nodes;
            var ls = JSON.parse(d.graph).links;

            // given the graph, create an array with unconnected nodes
            //
            // and
            //
            // nodes / links arrays
            var nodes = [], links = [];
            var i, j = 0, nodesTmp = [], nodeData = {};
            var connectedNodes = [], unConnectedNodes = [], processedLinks = [];
            var weightBounds = [];

            for (i=0; i<ns.length; i++) {
                var n = ns[i].id;
                var t = ns[i].type;
                var u = ns[i].url;
                var c = ns[i].connections;
                nodeData[n] = { 'type': t, 'connections': c, 'url': u };
                weightBounds.push(c);
            }
            weightBounds = [Math.min.apply(null, weightBounds), Math.max.apply(null, weightBounds)];

            // figure out the connectedNodes and associated links
            for (i=0; i<ls.length; i++) {
                j++;
                var sn = ls[i].source_name;
                var tn = ls[i].target_name;

                if (nodesTmp.indexOf(sn) === -1) {
                    nodesTmp.push(sn);
                    nodeData[sn].name = sn
                    nodes.push(nodeData[sn]);
                }
                if (nodesTmp.indexOf(tn) === -1) {
                    nodesTmp.push(tn);
                    nodeData[tn].name = tn;
                    nodes.push(nodeData[tn]);
                }
                links.push({ 'source': nodesTmp.indexOf(sn), 'target': nodesTmp.indexOf(tn) });
            }

            // figure out the unConnected Nodes
            var unConnectedNodes = [];
            for (i=0; i<ns.length; i++) {
                var n = ns[i].id;
                if (nodesTmp.indexOf(n) === -1) {
                    unConnectedNodes.push({ 'name': n});
                }
            }

            // add some color
            var color = d3.scale.category20();
            for (i=0; i<nodes.length; i++) {
                nodes[i].color = color(nodes[i].type);
            }

            DataService.nodes = nodes;
            DataService.links = links;
            DataService.unConnectedNodes = unConnectedNodes;
            DataService.weightBounds = weightBounds;
            $rootScope.$broadcast('graph-data-loaded');

            // now instantiate the graph
            $scope.ready = true;
        }
  }]);
