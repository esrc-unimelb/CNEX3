'use strict';

angular.module('interfaceApp')
    .service('DataService', ['$rootScope', '$http', '$timeout', 'configuration',
        function ForceData($rootScope, $http, $timeout, conf) {
            // AngularJS will instantiate a singleton by calling "new" on this function
            //
            //
            function init() {
                DataService.currentEntity = undefined;
                DataService.entityGraph = undefined;
                DataService.types = {};
                DataService.filterTypes = [];
                DataService.entityData = {};
            }

            function getEntityNetwork(entityId) {
                // tell the panel to load
                $rootScope.$broadcast('load-entity-network-view');

                // store the ID of the current entity network we're viewing
                DataService.currentEntity = entityId;

                var service = conf[conf.service];
                var url = service + '/entity/' + DataService.site.code + '/' + entityId;
                $http.get(url).then(function (resp) {
                    $timeout(function () { getData(); }, 100);
                },
                    function (resp) {
                    });

                var getData = function () {
                    var url = service + '/entity/' + DataService.site.code + '/' + entityId + '/status';
                    $http.get(url).then(function (resp) {
                        if (resp.data.status === 'complete') {
                            processEntityData(resp.data.graph);
                        } else {
                            $timeout(function () { getData(); }, 100);
                        }
                    },
                        function (resp) {
                        });
                };
            }

            function processEntityData(d) {
                // store the graph
                DataService.entityGraph = d.graph;
                DataService.entityData = processGraphData(d, 'entity');
                $rootScope.$broadcast('draw-entity-graph');
            }

            function processSiteData(d) {
                // store the graph
                DataService.siteGraph = d.graph;
                return processGraphData(d.graph, 'site');
            }

            function processGraphData(g, graphType) {
                
                var ns = DataService.processNodeSet(g.nodes);
                var ls;
                if(graphType === 'entity'){
                    ls = DataService.processLinks(g.links, _.pluck(g.nodes, 'id'));
                } else{
                    ls = DataService.processLinks(g.links, _.pluck(ns.linkedNodes, 'id'));
                }

                var data = {
                    'nodes': ns.linkedNodes,
                    'links': ls,
                    'unConnectedNodes': processUnLinkedNodes(ns.unLinkedNodes),
                    'types': processTypes(ns.linkedNodes),
                    'datamap': ns.map,
                };
                return data;
            }

            function processLinks(ls, nodeKey) {
                // rebuild the links array using the positions from the linkedNodes array
                var links = [];
                // figure out the connectedNodes and associated links
                angular.forEach(ls, function (v) {
                    var sn = v.sid;
                    var tn = v.tid;
                    var sl = nodeKey.indexOf(v.sid);
                    var tl = nodeKey.indexOf(v.tid);

                    if (sl !== -1 && tl !== -1) {
                        var link = {
                            'source': sl,
                            'target': tl,
                            'sid': sn,
                            'tid': tn
                        };
                        links.push(link);
                    }
                });
                return links;
            }

            function processUnLinkedNodes(nodes) {

                // group unconnected nodes by type and sort alphabetically
                return _.groupBy(_.sortBy(nodes, 'name'), 'type');
                //return unConnectedNodes;
            }

            function processTypes(nodes) {
                // construct an object keyed by types in the dataset
                var types = {};
                angular.forEach(nodes, function (v, k) {
                    if (conf.mapForward[v.type.toLowerCase()] !== undefined) {
                        k = conf.mapForward[v.type.toLowerCase()];
                    } else {
                        k = v.type;
                    }
                    if (types[k] === undefined) {
                        types[k] = {
                            'count': 1,
                            'checked': false,
                            'color': v.color,
                            'coreType': conf.mapForward[v.coreType.toLowerCase()],
                            'strike': false
                        };
                    } else {
                        types[k].count += 1;
                    }
                });
                angular.forEach(types, function (v, k) {
                    if (DataService.types[k] === undefined) {
                        DataService.types[k] = v;
                    }
                });

                return types;
            }

            function getColor(k) {
                if (conf.mapForward[k.toLowerCase()] !== undefined) {
                    k = conf.mapForward[k.toLowerCase()];
                }
                return DataService.types[k].color;
            }

            function setColor(k, color) {
                if (conf.mapForward[k.toLowerCase()] !== undefined) {
                    k = conf.mapForward[k.toLowerCase()];
                }
                DataService.types[k].color = color;
            }

            function processNodeSet(nodes) {
                // determine the lowest and highest neighbour counts


                let minConnections = 1000; //TODO fix these magic numbers...
                let maxConnections = 0;
                let minrelatedEntities = 1000;
                let maxrelatedEntities = 0;
                let minrelatedPublications = 1000;
                let maxrelatedPublications = 0;
                let minrelatedDobjects = 1000;
                let maxrelatedDobjects = 0;

                nodes.forEach((n) => {
                    if (n.connections !== undefined) {
                        minConnections = minConnections < n.connections ? minConnections : n.connections;
                        maxConnections = maxConnections > n.connections ? maxConnections : n.connections;
                    }
                    if (n.relatedEntities !== undefined) {
                        minrelatedEntities = minrelatedEntities < n.relatedEntities ? minrelatedEntities : n.relatedEntities;
                        maxrelatedEntities = maxrelatedEntities > n.relatedEntities ? maxrelatedEntities : n.relatedEntities;
                    }
                    if (n.relatedPublications !== undefined) {
                        minrelatedPublications = minrelatedPublications < n.relatedPublications ? minrelatedPublications : n.relatedPublications;
                        maxrelatedPublications = maxrelatedPublications > n.relatedPublications ? maxrelatedPublications : n.relatedPublications;
                    }
                    if (n.relatedDobjects !== undefined) {
                        minrelatedDobjects = minrelatedDobjects < n.relatedDobjects ? minrelatedDobjects : n.relatedDobjects;
                        maxrelatedDobjects = maxrelatedDobjects > n.relatedDobjects ? maxrelatedDobjects : n.relatedDobjects;
                    }

                });

                const sizeByConnections = d3.scaleLinear().range([10, 40]).domain([minConnections, maxConnections]);
                const sizeByEntity = d3.scaleLinear().range([10, 40]).domain([minrelatedEntities, maxrelatedEntities]);
                const sizeByPublication = d3.scaleLinear().range([10, 40]).domain([minrelatedPublications, maxrelatedPublications]);
                const sizeByDobject = d3.scaleLinear().range([10, 40]).domain([minrelatedDobjects, maxrelatedDobjects]);

                var nodemap = {}, linkedNodes = [], unLinkedNodes = [];
                angular.forEach(nodes, function (v) {
                    if (v.name !== undefined) {
                        try {
                            v.color = conf.defaultColors[v.coreType.toLowerCase()];
                            v.r = sizeByConnections(v.connections);
                            v.rByEntity = sizeByEntity(v.relatedEntities);
                            v.rByPublication = sizeByPublication(v.relatedPublications);
                            v.rByDobject = sizeByDobject(v.relatedDobjects);
                            nodemap[v.id] = v;
                            if (v.connections === 0) {
                                unLinkedNodes.push(v);
                            } else {
                                linkedNodes.push(v);
                            }
                        } catch (e) {
                            // skip bad data
                        }
                    }
                });
                return { 'map': nodemap, 'linkedNodes': linkedNodes, 'unLinkedNodes': unLinkedNodes };
            }

            function filterTypesFromData(types) {
                DataService.filterTypes = types;
                angular.forEach(DataService.types, function (v, k) {
                    if (types.indexOf(k) !== -1) {
                        DataService.types[k].strike = true;
                    } else {
                        DataService.types[k].strike = false;
                    }
                });
                $rootScope.$broadcast('filter-nodes-and-redraw');
            }

            var DataService = {
                types: {},
                filterTypes: [],

                init: init,
                getEntityNetwork: getEntityNetwork,
                processSiteData: processSiteData,
                processLinks: processLinks,
                processNodeSet: processNodeSet,
                getColor: getColor,
                setColor: setColor,
                filterTypesFromData: filterTypesFromData,
            };

            return DataService;
        }]);
