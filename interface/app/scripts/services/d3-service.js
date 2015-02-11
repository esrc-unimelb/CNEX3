'use strict';

angular.module('interfaceApp')
  .service('D3Service', [ '$rootScope', 'configuration', 'DataService', 
    function D3Service($rootScope, conf, DataService) {

    // AngularJS will instantiate a singleton by calling "new" on this function
    
    /* 
     * @function: highlightNodeAndLocalEnvironment
     */
    function highlightNodeAndLocalEnvironment(contextNode) {
        if (DataService.contextNode === contextNode) {
            DataService.contextNode === undefined;
            d3s.reset();
            return;
        }
        DataService.contextNode = contextNode;

        var nodes = DataService.nodes;
        var links = DataService.links;
        var neighbours = [];

        // figure out all the focus nodes' neighbours
        angular.forEach(links, function(v,k) {
            var sn = v.source.id;
            var tn = v.target.id;
            if (sn === contextNode || tn === contextNode) {
                if (neighbours.indexOf(sn) === -1) {
                    neighbours.push(sn);
                }
                if (neighbours.indexOf(tn) === -1) {
                    neighbours.push(tn);
                }
            }

            // we want to select the links of first degree neighbours WITHOUT
            //  the links between first degree neighbours
            if (v.source.id === contextNode && neighbours.indexOf(v.target.id) !== -1) {
                d3s.opacity[v.source.id + '-' + v.target.id] = conf.opacity.default;
            } else if (v.target.id === contextNode && neighbours.indexOf(v.source.id) !== -1) {
                d3s.opacity[v.source.id + '-' + v.target.id] = conf.opacity.default;
            } else {
                // every link that is not between the context node and a first degree neighbour
                //  should fade into the background
                d3s.opacity[v.source.id + '-' + v.target.id] = conf.opacity.unselected;
            }

        });

        angular.forEach(nodes, function(v,k) {
            if (v.id === contextNode) {
                // set the properties of the focus node
                d3s.opacity[v.id] = conf.opacity.default;
                d3s.fill[v.id] = v.color;
                d3s.height[v.id] = conf.height.selected;
            } else if (neighbours.indexOf(v.id) !== -1) {
                // set the properties of the neighbours
                d3s.opacity[v.id] = conf.opacity.default;
                d3s.height[v.id] = conf.height.selected;
                d3s.fill[v.id] = v.color;
            } else {
                // set the properties of the other nodes
                d3s.opacity[v.id] = conf.opacity.unselected;
                d3s.height[v.id] = conf.height.default;
                d3s.fill[v.id] = '#ccc';
            }
        });

        d3s.highlightNodes();
        d3s.highlightLinks();
        d3s.highlightDates();

        DataService.getNodeData(neighbours, contextNode);
    }

    /*
     * @function: highlightByType
     */
    function highlightByType(type) {
        var types = d3s.highlightedTypes;
        var nodes = DataService.nodes;
        var links = DataService.links;

        // add / remove the type as required
        var index = types.indexOf(type);
        if (index === -1) {
            types.push(type);
        } else {
            types.splice(index, 1)
        }

        if (types.length === 0) {
            d3s.highlightedTypes = types;
            d3s.reset();
            return;
        }

        var selectedNodes = [];
        angular.forEach(nodes, function(v,k) {
            if (types.indexOf(v.type) !== -1) {
                d3s.opacity[v.id] = conf.opacity.default;
                d3s.height[v.id] = conf.height.selected;
                selectedNodes.push(v.id);
            } else {
                d3s.opacity[v.id] = conf.opacity.unselected;
                d3s.height[v.id] = conf.height.default;
            }
        })
 
        angular.forEach(links, function(v,k) {
            d3s.opacity[v.source.id + '-' + v.target.id] = conf.opacity.unselected;
        })

        d3s.highlightNodes();
        d3s.highlightLinks();
        d3s.highlightDates();
        d3s.highlightedTypes = types;

        DataService.getNodeData(selectedNodes, undefined);
    }

    /*
     * @function: highlightById
     */
    function highlightById(ids) {
        var nodes = DataService.nodes;
        var links = DataService.links;

        var selectedNodes = [];
        angular.forEach(nodes, function(v,k) {
            if (ids.indexOf(v.id) !== -1) {
                d3s.opacity[v.id] = conf.opacity.default;
                d3s.height[v.id] = conf.height.selected;
                selectedNodes.push(v.id);
            } else {
                d3s.opacity[v.id] = conf.opacity.unselected;
                d3s.height[v.id] = conf.height.default;
            }
        })

        angular.forEach(links, function(v,k) {
            d3s.opacity[v.source.id + '-' + v.target.id] = conf.opacity.unselected;
        })

        d3s.highlightNodes();
        d3s.highlightLinks();
        d3s.highlightDates();

        DataService.getNodeData(selectedNodes, undefined);
 
    }

    /*
     * @function: highlightNode
     */
    function highlightNode(id) {
        var nodeDefaultColor, dateDefaultColor;
        if (DataService.contextNode !== undefined) {
            nodeDefaultColor = conf.fill.contextNeighbourDefault;
            dateDefaultColor = conf.fill.contextNeighbourDefault;
        } else {
            nodeDefaultColor = DataService.nodeMap[id].color;
            dateDefaultColor = DataService.nodeMap[id].color;
        }

        var n = d3.select('#' + d3s.sanitize(id) + '_node');
        n.transition()
        .attr('r', function(d) {
            return d.r * 3
        })
        .transition()
        .delay(1000)
        .attr('r', function(d) {
            return d.r
        });

        var d = d3.select('#' + d3s.sanitize(id) + '_date');
        if (d[0] !== null) {
            d.transition()
             .attr('height', conf.height.selected)
             .transition()
             .delay(1000)
             .attr('height', conf.height.unselected);
        }
    }

    /* 
     * @function: highlightNodes
     */
    function highlightNodes(highlight) {
        // get a handle to all nodes
        var node = d3.selectAll('.node');

        if (highlight === true) {
            node.transition()
                .attr('fill', function(d) { return d3s.fill[d.id]; })
                .attr('opacity', function(d) { return d3s.opacity[d.id]; })
                .transition()
                .attr('r', function(d) { 
                    if (d3s.fill[d.id] !== conf.fill.default) {
                        return d.r * 5; 
                    } else {
                        return d.r;
                    }
                })
                .transition()
                .delay(2000)
                .attr('r', function(d) { 
                    return d.r; 
                });
        } else {
            node.transition()
                .attr('fill', function(d) { return d3s.fill[d.id]; })
                .attr('opacity', function(d) { return d3s.opacity[d.id]; });
        }
    }

    /*
     * @function: highlightLinks
     */
    function highlightLinks() {
        // get a handle to the relevant elements
        var link = d3.selectAll('.link');
        link.attr('opacity', function(d) { return d3s.opacity[d.source.id + '-' + d.target.id]; });
    }

    /*
     * @function: highlightDates
     */
    function highlightDates() {
        // get a handle to the relevant elements
        d3.selectAll('.dateRange')
          .attr('fill', function(d) { return d3s.fill[d.id]; })
          .attr('opacity', function(d) { return d3s.opacity[d.id]; })
          .attr('height',  function(d) { return d3s.height[d.id]; });
        
        // get a handle to the relevant elements
        d3.selectAll('.datePoint')
          .attr('fill', function(d) { return d3s.fill[d.id]; })
          .attr('opacity', function(d) { return d3s.opacity[d.id]; });
    }

    /*
     * @function: sizeNodesEvenly
     */
    function sizeNodesEvenly() {
        d3.selectAll('.node')
          .transition()
          .attr('r', '10');
    }

    /*
     * @function: resetNodeDimensions
     */
    function resetNodeDimensions() {
        d3.selectAll('.node')
          .transition()
          .attr('r', function(d) { return d.r; });
    }

    /*
     * @function: fadeBackground
     *
     * @params:
     * - value
     */
    function fadeBackground(value) {
        if (DataService.selected === undefined) {
            return;
        }
        // iterate over all of the elements fading those not selected
        var nodes = d3.selectAll('.node');
        var t;
        nodes.attr('opacity', function(d, i, n) { 
            t = d3.select(this); 
            if (t.attr('fill') === conf.fill.default) {
                return value;
            } else {
                return d3s.opacity[d.id];
            }
        });
        var link = d3.selectAll('.link');
        link.attr('opacity', function(d) { 
            t = d3.select(this); 
            if (t.attr('stroke') === conf.stroke.link.unselected) {
                return value;
            } else {
                d3s.opacity[d.source.id + '-' + d.target.id];
            }
        });
        var pnts = d3.selectAll('.datePoint');
        pnts.attr('opacity', function(d) {
            t = d3.select(this); 
            if (t.attr('fill') === conf.fill.default) {
                return value;
            } else {
                return d3s.opacity[d.id];
            }
        })

        var dateRange = d3.selectAll('.dateRange');
        dateRange.attr('opacity', function(d) {
            t = d3.select(this); 
            if (t.attr('fill') === conf.fill.default) {
                return value;
            } else {
                d3s.opacity[d.id];
            }
        })
    }

    /*
     * @function: reset
     */
    function reset() {
        d3s.highlightedTypes = [];
        $rootScope.$broadcast('reset');
    }

    /*
     * @function: sanitize
     */
    function sanitize(selector) {
        var s = selector.replace(/\(|\)/g, '').replace(/ /g, '_');
        return s;
    }

    var d3s = {
        highlightedTypes: [],
        colors: d3.scale.category20(),
        highlightNodeAndLocalEnvironment: highlightNodeAndLocalEnvironment,
        highlightNodes: highlightNodes,
        highlightNode: highlightNode,
        highlightLinks: highlightLinks,
        highlightDates: highlightDates,
        highlightByType: highlightByType,
        highlightById: highlightById,
        sizeNodesEvenly: sizeNodesEvenly,
        resetNodeDimensions: resetNodeDimensions,
        fadeBackground: fadeBackground,
        reset: reset,
        sanitize: sanitize
    }
    d3s.fill = {};
    d3s.opacity = {};
    d3s.stroke = {};
    d3s.strokeWidth = {};
    d3s.height = {};
    return d3s;

  }]);
