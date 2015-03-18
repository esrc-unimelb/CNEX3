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
                    processEntityData(resp.data.graph);
                } else {
                    $timeout( function() { getData(); }, 100 );
                }
            },
            function(resp) {
            });
        }
    }

    function processEntityData(d) { 
        // store the graph
        DataService.entityGraph = d.graph;

        var ns = DataService.processNodeSet(d.nodes);
        DataService.entityData = {
            'nodes': ns.linkedNodes,
            'links': d.links,
            'types': processTypes(ns.linkedNodes),
            'datamap': ns.map,
        }
        $rootScope.$broadcast('draw-entity-graph');
    }

    function processSiteData(d) {

        // store the graph
        DataService.siteGraph = d.graph;

        var ns = d.graph.nodes;
        var ls = d.graph.links;

        // add some color and the default node radius
        // split the dataset into linked and unlinked
        ns = DataService.processNodeSet(ns);
        var datamap = ns.map,
            linkedNodes = ns.linkedNodes,
            unLinkedNodes = ns.unLinkedNodes;

        // get the data structure ready for the graph and
        var data = {
            'nodes': linkedNodes,
            'links': processLinks(ls, _.pluck(linkedNodes, 'id')),
            'unConnectedNodes': processUnLinkedNodes(unLinkedNodes),
            'types': processTypes(linkedNodes),
            'datamap': datamap,
        }
        return data;

    }

    function processLinks(ls, nodeKey) {
        // rebuild the links array using the positions from the linkedNodes array
        var links = [];
        // figure out the connectedNodes and associated links
        angular.forEach(ls, function(v, k) {
            var sn = v.sid;
            var tn = v.tid;

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
        return links;
    }

    function processUnLinkedNodes(nodes) {
        // group unconnected nodes by type and sort alphabetically
        var unConnectedNodes = {};
        var undata = _.groupBy(nodes, function(d) { return d.type; });
        angular.forEach(undata, function(v, k) {
            unConnectedNodes[k] = _.sortBy(v, function(d) { return d.name; });
        });
        return unConnectedNodes;
    }

    function processTypes(nodes) {
        // construct an object keyed by types in the dataset
        var types = {};
        angular.forEach(nodes, function(v,k) {
            if (conf.mapForward[v.type.toLowerCase()] !== undefined) {
                k = conf.mapForward[v.type.toLowerCase()];
            } else {
                k = v.type
            }
            if (types[k] === undefined) {
                types[k] = {
                    'count': 1,
                    'checked': false,
                    'color': v.color,
                    'coreType': conf.mapForward[v.coreType.toLowerCase()]
                };
            } else {
                types[k].count += 1;
            }
        })
        conf.types = types;
        return types;
    }

    function getColor(k) {
        if (conf.mapForward[k.toLowerCase()] !== undefined) {
            k = conf.mapForward[k.toLowerCase()];
        }
        return conf.types[k].color;
    }

    function setColor(k, color) {
        if (conf.mapForward[k.toLowerCase()] !== undefined) {
            k = conf.mapForward[k.toLowerCase()];
        }
        conf.types[k].color = color;
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
                v.color = conf.types[v.coreType.toLowerCase()];
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
        processingStatus: {},

        getEntityNetwork: getEntityNetwork,
        processSiteData: processSiteData,
        processNodeSet: processNodeSet,
        getColor: getColor,
        setColor: setColor,
    }

    return DataService;
  }]);
