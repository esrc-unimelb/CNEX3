'use strict';

angular.module('interfaceApp')
  .service('DataService', [ '$rootScope', '$http', '$timeout', 'configuration',
         function ForceData($rootScope, $http, $timeout, conf) {
    // AngularJS will instantiate a singleton by calling "new" on this function
    //

    function getEntityNetwork(entityId) {
        // store the ID of the current entity network we're viewing
        DataService.currentEntity = entityId;

        var service = conf[conf.service];
        var url = service + '/entity/' + DataService.site.code + '/' + entityId;
        $http.get(url).then(function(resp) {
            $timeout(function() { getData(); }, 100);
        },
        function(resp) {
        });

        var getData = function() {
            var url = service + '/entity/' + DataService.site.code + '/' + entityId + '/status';
            $http.get(url).then(function(resp) {
                if (resp.data.status === 'complete') {
                    resp.data.graph.nodes = DataService.processNodeSet(resp.data.graph.nodes);
                    DataService.entityNetwork = resp.data.graph;
                    $rootScope.$broadcast('draw-entity-graph');
                } else {
                    $timeout( function() { getData(); }, 100 );
                }
            },
            function(resp) {
            });
        }
    }

    function processNodeSet(nodes) {
        // determine the lowest and highest neighbour counts
        var weightBounds = [];
        angular.forEach(nodes, function(v, k) {
            weightBounds.push(v.connections);
        })
        weightBounds = [Math.min.apply(null, weightBounds), Math.max.apply(null, weightBounds)];

        var weight = d3.scale.linear().range([10,40]).domain([Math.min.apply(null, weightBounds), Math.max.apply(null, weightBounds)]);

        angular.forEach(nodes, function(v,k) {
            nodes[k].color = conf.colours[v.coreType.toLowerCase()];
            nodes[k].r = weight(v.connections);
        })
        return nodes;
    }

    var DataService = {
        // connected nodes
        nodes: [],

        // un-connected nodes
        unConnectedNodes: [],

        // links
        links: [],

        nodeColorByType: {},
        getEntityNetwork: getEntityNetwork,
        processNodeSet: processNodeSet
    }

    return DataService;
  }]);
