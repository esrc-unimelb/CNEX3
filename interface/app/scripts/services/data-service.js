'use strict';

angular.module('interfaceApp')
  .service('DataService', [ '$rootScope', '$http', '$timeout', 'configuration',
         function ForceData($rootScope, $http, $timeout, conf) {
    // AngularJS will instantiate a singleton by calling "new" on this function
    //

    function getEntityNetwork(entityId) {
        // tell the panel to load
        $rootScope.$broadcast('load-entity-network-view');

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
                    //DataService.entityNetwork = resp.data.graph;
                    DataService.entityNetwork = DataService.processNodeSet(resp.data.graph);
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
        var nodeSizesByConnections = [];
        var nodeSizesByRelatedEntities = [];
        var nodeSizesByRelatedPublications = [];
        var nodeSizesByRelatedDobjects = [];

        angular.forEach(nodes, function(v, k) {
            if (v.connections !== undefined) nodeSizesByConnections.push(v.connections);
            if (v.relatedEntities !== undefined) nodeSizesByRelatedEntities.push(v.relatedEntities);
            if (v.relatedPublications !== undefined) nodeSizesByRelatedPublications.push(v.relatedPublications);
            if (v.relatedDobjects !== undefined) nodeSizesByRelatedDobjects.push(v.relatedDobjects);
        })
        var weightBoundsByConnections = [Math.min.apply(null, nodeSizesByConnections), Math.max.apply(null, nodeSizesByConnections)];
        var weightBoundsByEntity = [Math.min.apply(null, nodeSizesByRelatedEntities), Math.max.apply(null, nodeSizesByRelatedEntities)];
        var weightBoundsByPublication = [Math.min.apply(null, nodeSizesByRelatedPublications), Math.max.apply(null, nodeSizesByRelatedPublications)];
        var weightBoundsByDobject = [Math.min.apply(null, nodeSizesByRelatedDobjects), Math.max.apply(null, nodeSizesByRelatedDobjects)];

        var sizeByConnections = d3.scale.linear().range([10,40]).domain([Math.min.apply(null, weightBoundsByConnections), Math.max.apply(null, weightBoundsByConnections)]);
        var sizeByEntity = d3.scale.linear().range([10,40]).domain([Math.min.apply(null, weightBoundsByEntity), Math.max.apply(null, weightBoundsByEntity)]);
        var sizeByPublication = d3.scale.linear().range([10,40]).domain([Math.min.apply(null, weightBoundsByPublication), Math.max.apply(null, weightBoundsByPublication)]);
        var sizeByDobject = d3.scale.linear().range([10,40]).domain([Math.min.apply(null, weightBoundsByDobject), Math.max.apply(null, weightBoundsByDobject)]);


        var nodemap = {}, linkedNodes = [], unLinkedNodes = [];
        angular.forEach(nodes, function(v,k) {
            if (v.name !== undefined) {
                v.color = conf.colours[v.coreType.toLowerCase()];
                v.r = sizeByConnections(v.connections);
                v.rByEntity = sizeByEntity(v.relatedEntities);
                v.rByPublication = sizeByPublication(v.relatedPublications);
                v.rByDobject = sizeByDobject(v.relatedDobjects);
                nodemap[v.id] = v;
                if (v.connections === 0) {
                    unLinkedNodes.push(v);
                } else {
                    linkedNodes.push(v)
                }
            }
        })
        return { 'map': nodemap, 'linkedNodes': linkedNodes, 'unLinkedNodes': unLinkedNodes };
    }

    var DataService = {
        getEntityNetwork: getEntityNetwork,
        processNodeSet: processNodeSet
    }

    return DataService;
  }]);
