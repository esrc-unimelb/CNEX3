'use strict';

angular.module('interfaceApp')
  .controller('SiteCtrl', [ '$rootScope', '$scope', '$routeParams', '$http', '$timeout', '$location', 'configuration', 'DataService', 
    function($rootScope, $scope, $routeParams, $http, $timeout, $location, conf, DataService) {

        $scope.site = $routeParams.code; 
        $scope.graph = $routeParams.explore;
        $scope.service = conf[conf.service];
        $scope.showEntityNetwork = false;

        $scope.initting = true;
        $scope.progress = false;
        $scope.datasetError = false;
        $scope.total = 0;
        $scope.processed = 0;

        var url = $scope.service + '/network/' + $scope.site + '/' + $scope.graph;
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
        $scope.$on('load-entity-network-view', function() {
            $scope.showEntityNetwork = true;
        })
        $scope.$on('destroy-entity-network-view', function() {
            $scope.showEntityNetwork  = false;
        })

        // When the back button is pressed whilst viewing the entity network,
        //  intercept the location change event, cancel it, and destroy the 
        //  entity network
        $scope.$on('$locationChangeStart', function(e, n, o) {
            if (o.match(/^.*\/site\/.*\/byEntity$/) && $scope.showEntityNetwork === true) {
                $scope.showEntityNetwork  = false;
                e.preventDefault();
            }
        });

        $scope.update = function() {
            var url = $scope.service + '/network/' + $scope.site + '/' + $scope.graph + '/status';
            $http.get(url).then(function(resp) {
                if (resp.data.processed !== null) {
                    $scope.initting = false;
                    $scope.progress = true;
                    $scope.processed = resp.data.processed;
                    $scope.total = resp.data.total;
                    $timeout(function() { $scope.update(); }, 100);
                } else {
                    $scope.progress = false;
                    $scope.initting = false;
                    $scope.processData(resp.data);
                }
            },
            function(){
                $scope.progress = false;
            });
        };

        $scope.processData = function(d) {
            // store the graph
            DataService.siteGraph = d.graph;

            var ns = d.graph.nodes;
            var ls = d.graph.links;

            // add some color and the default node radius
            // split the dataset into linked and unlinked
            ns = DataService.processNodeSet(ns);
            var nodemap = ns.map,
                linkedNodes = ns.linkedNodes,
                unLinkedNodes = ns.unLinkedNodes;
            var nodeKey = _.pluck(linkedNodes, 'id');
            
            // rebuild the links array using the positions from the linkedNodes array
            var links = [];
            // figure out the connectedNodes and associated links
            angular.forEach(ls, function(v, k) {
                var sn = v.source_id;
                var tn = v.target_id;

                if (nodeKey.indexOf(sn) !== -1 && nodeKey.indexOf(tn) !== -1) {
                    var link = {
                        'source': nodeKey.indexOf(sn),
                        'target': nodeKey.indexOf(tn),
                        'source_id': sn,
                        'target_id': tn
                    }
                    links.push(link);
                }
            });


            // group unconnected nodes by type and sort alphabetically
            DataService.unConnectedNodes = {};
            var undata = _.groupBy(unLinkedNodes, function(d) { return d.type; });
            angular.forEach(undata, function(v, k) {
                DataService.unConnectedNodes[k] = _.sortBy(v, function(d) { return d.name; });
            });

            DataService.nodes = linkedNodes;
            DataService.links = links;
            DataService.nodeMap = nodemap;

            var types = {};
            angular.forEach(linkedNodes, function(v,k) {
                if (types[v.type] === undefined) {
                    types[v.type] = { 
                        'count': 1, 
                        'checked': false, 
                        'color': v.color, 
                        'coreType': v.coreType.toLowerCase(), 
                        'coreTypeDisplayName': conf.mapForward[v.coreType.toLowerCase()]
                    };
                } else {
                    types[v.type].count += 1;
                }
            })
            DataService.types = types;

            // get the data structure ready for the graph and 

            // now get it all going
            $scope.ready = true;
            $timeout(function(d) {
                $rootScope.$broadcast('graph-data-loaded');
            }, 100);
        }


  }]);
