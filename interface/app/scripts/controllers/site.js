'use strict';

angular.module('interfaceApp')
  .controller('SiteCtrl', [ '$rootScope', '$scope', '$routeParams', '$http', '$timeout', 'configuration', 'DataService', 
    function($rootScope, $scope, $routeParams, $http, $timeout, configuration, DataService) {

        $scope.site = $routeParams.code; 
        $scope.graph = $routeParams.explore;
        $scope.service = configuration[configuration.service];

        $scope.initting = true;
        $scope.progress = false;
        $scope.datasetError = false;
        $scope.controls = false;
        $scope.total = 0;
        $scope.processed = 0;

        var url = $scope.service + '/network/' + $scope.site + '/' + $scope.graph;
        console.log(url);
        $http.get(url).then(function(d) {
            // kick off the progress update in a moment; needs time to get going..
            $timeout(function() { $scope.update(); }, 200);
            $scope.progress = false;
            DataService.site = {
                'name': d.data.name,
                'url': d.data.url,
                'code': $scope.site
            }
        },
        function() {
            $scope.datasetError = true;
            $scope.progress = false;
            $scope.initting = false;
        });

        $scope.$on('graph-ready', function() {
            $scope.showControls = true;
        })

        $scope.update = function() {
            var url = $scope.service + '/network/' + $scope.site + '/' + $scope.graph + '/status';
            $http.get(url).then(function(resp) {
                if (resp.data.processed !== null) {
                    $scope.initting = false;
                    $scope.controls = false;
                    $scope.progress = true;
                    $scope.processed = resp.data.processed;
                    $scope.total = resp.data.total;
                    $timeout(function() { $scope.update(); }, 100);
                } else {
                    $scope.progress = false;
                    $scope.initting = false;
                    $scope.controls = true;
                    $scope.processData(resp.data);
                }
            },
            function(){
                $scope.progress = false;
            });
        };

        $scope.processData = function(d) {
            console.log(d);
            var ns = d.graph.nodes;
            var ls = d.graph.links;

            // given the graph, create an array with unconnected nodes
            //
            // and
            //
            // nodes / links arrays
            var nodes = [], nodeMap = {}, links = [];
            var i, j = 0, nodesTmp = [], nodeData = {};
            var connectedNodes = [], unConnectedNodes = [], processedLinks = [];
            var weightBounds = [];

            angular.forEach(ns, function(v, k) {
                var n = v.id;
                nodeData[n] = v;
            })

            // figure out the connectedNodes and associated links
            angular.forEach(ls, function(v, k) {
                var sn = v.source_id;
                var tn = v.target_id;
                if (nodesTmp.indexOf(sn) === -1) {
                    nodesTmp.push(sn);
                    nodes.push(nodeData[sn]);
                    nodeMap[sn] = nodeData[sn];
                }
                if (nodesTmp.indexOf(tn) === -1) {
                    nodesTmp.push(tn);
                    nodes.push(nodeData[tn]);
                    nodeMap[tn] = nodeData[tn];
                }
                links.push({ 'source': nodesTmp.indexOf(sn), 'target': nodesTmp.indexOf(tn) });
            });

            // figure out the unConnected Nodes
            var unConnectedNodes = [];
            angular.forEach(ns, function(v,k) {
                var n = v.id;
                if (nodesTmp.indexOf(n) === -1) {
                    unConnectedNodes.push(v);
                }
            });

            // add some color and the default node radius
            ns = DataService.processNodeSet(ns);

            DataService.nodes = nodes;
            DataService.nodeMap = nodeMap;
            DataService.links = links;
            DataService.unConnectedNodes = unConnectedNodes;
            DataService.weightBounds = weightBounds;

            // now instantiate the graph
            $scope.ready = true;
            $timeout(function() { $rootScope.$broadcast('graph-data-loaded'); }, 100);
        }
  }]);
