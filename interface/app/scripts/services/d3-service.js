'use strict';

angular.module('interfaceApp')
  .service('D3Service', [ '$rootScope', 'configuration', 'DataService', 
    function D3Service($rootScope, configuration, DataService) {

    // AngularJS will instantiate a singleton by calling "new" on this function
    
    /* 
     * @function: highlightNodeAndLocalEnvironment
     */
    function highlightNodeAndLocalEnvironment(contextNode) {
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
                d3s.linkStroke[v.source.id + '-' + v.target.id] = configuration.stroke.link.selected;
                d3s.linkOpacity[v.source.id + '-' + v.target.id] = configuration.opacity.default;
            } else if (v.target.id === contextNode && neighbours.indexOf(v.source.id) !== -1) {
                d3s.linkStroke[v.source.id + '-' + v.target.id] = configuration.stroke.link.selected;
                d3s.linkOpacity[v.source.id + '-' + v.target.id] = configuration.opacity.default;
            } else {
                // every link that is not between the context node and a first degree neighbour
                //  should fade into the background
                d3s.linkStroke[v.source.id + '-' + v.target.id] = configuration.stroke.link.unselected;
                d3s.linkOpacity[v.source.id + '-' + v.target.id] = configuration.opacity.unselected;
            }

        });

        angular.forEach(nodes, function(v,k) {
            if (v.id === contextNode) {
                // set the properties of the focus node
                d3s.fill[v.id] = configuration.fill.contextNode;
                d3s.opacity[v.id] = configuration.opacity.default;
                d3s.stroke[v.id] = configuration.stroke.date.selected;
                d3s.height[v.id] = configuration.height.selected;
            } else if (neighbours.indexOf(v.id) !== -1) {
                // set the properties of the neighbours
                d3s.fill[v.id] = configuration.fill.contextNeighbourDefault;
                d3s.opacity[v.id] = configuration.opacity.default;
                d3s.stroke[v.id] = configuration.stroke.date.selected;
                d3s.height[v.id] = configuration.height.selected;
            } else {
                // set the properties of the other nodes
                d3s.fill[v.id] = configuration.fill.default;
                d3s.opacity[v.id] = configuration.opacity.unselected;
                d3s.stroke[v.id] = configuration.stroke.date.unselected;
                d3s.height[v.id] = configuration.height.default;
            }
        });

        d3s.highlightNodes();
        d3s.highlightLinks();
        d3s.highlightRects();
        d3s.highlightPoints();

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
                d3s.fill[v.id] = v.color;
                d3s.opacity[v.id] = configuration.opacity.default;
                d3s.height[v.id] = configuration.height.selected;
                d3s.stroke[v.id] = configuration.stroke.date.selected;
                selectedNodes.push(v.id);
            } else {
                d3s.fill[v.id] = configuration.fill.default 
                d3s.opacity[v.id] = configuration.opacity.unselected;
                d3s.height[v.id] = configuration.height.default;
                d3s.stroke[v.id] = configuration.stroke.date.unselected;
            }
        })
 
        angular.forEach(links, function(v,k) {
            d3s.linkStroke[v.source.id + '-' + v.target.id] = configuration.stroke.link.unselected;
            d3s.linkOpacity[v.source.id + '-' + v.target.id] = configuration.opacity.unselected;
        })

        d3s.highlightNodes();
        d3s.highlightLinks();
        d3s.highlightRects();
        d3s.highlightPoints();
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
                d3s.fill[v.id] = v.color;
                d3s.opacity[v.id] = configuration.opacity.default;
                d3s.height[v.id] = configuration.height.selected;
                d3s.stroke[v.id] = configuration.stroke.date.selected;
                selectedNodes.push(v.id);
            } else {
                d3s.fill[v.id] = configuration.fill.default 
                d3s.opacity[v.id] = configuration.opacity.unselected;
                d3s.height[v.id] = configuration.height.default;
                d3s.stroke[v.id] = configuration.stroke.date.unselected;
            }
        })

        angular.forEach(links, function(v,k) {
            d3s.linkStroke[v.source.id + '-' + v.target.id] = configuration.stroke.link.unselected;
            d3s.linkOpacity[v.source.id + '-' + v.target.id] = configuration.opacity.unselected;
        })

        d3s.highlightNodes();
        d3s.highlightLinks();
        d3s.highlightRects();
        d3s.highlightPoints();

        DataService.getNodeData(selectedNodes, undefined);
 
    }

    /*
     * @function: highlightNode
     */
    function highlightNode(id) {
        var nodeDefaultColor, dateDefaultColor;
        if (DataService.contextNode !== undefined) {
            nodeDefaultColor = configuration.fill.contextNeighbourDefault;
            dateDefaultColor = configuration.fill.contextNeighbourDefault;
        } else {
            nodeDefaultColor = DataService.nodeMap[id].color;
            dateDefaultColor = DataService.nodeMap[id].color;
        }

        var n = d3.select('#' + d3s.sanitize(id) + '_node');
        if (n.attr('fill') === configuration.fill.contextNeighbourHighlight) {
            n.attr('fill', nodeDefaultColor);
        } else {
            n.attr('fill', configuration.fill.contextNeighbourHighlight)
            .transition()
            .attr('r', configuration.radius.node.unselected * 5)
            .transition()
            .attr('r', configuration.radius.node.unselected);
        }

        var d = d3.select('#' + d3s.sanitize(id) + '_date');
        try {
            if (d.attr('fill') === configuration.fill.contextNeighbourHighlight) {
                d.attr('fill', dateDefaultColor);
            } else {
                d.attr('fill', configuration.fill.contextNeighbourHighlight);
            }
        } catch (e) {
            // not all nodes have dates
        }
    }

    /* 
     * @function: highlightNodes
     */
    function highlightNodes() {
        // get a handle to all nodes
        var node = d3.selectAll('.node');

        node.transition()
            .attr('fill',    function(d) { return d3s.fill[d.id]; })
            .attr('opacity', function(d) { return d3s.opacity[d.id]; });
    }

    /*
     * @function: highlightLinks
     */
    function highlightLinks() {
        // get a handle to the relevant elements
        var link = d3.selectAll('.link');
        link.attr('stroke',  function(d) { return d3s.linkStroke[d.source.id + '-' + d.target.id]; })
            .attr('opacity', function(d) { return d3s.linkOpacity[d.source.id + '-' + d.target.id]; });
    }

    /*
     * @function: highlightRects
     */
    function highlightRects() {
        // get a handle to the relevant elements
        var rect = d3.selectAll('.rect');
        rect.attr('fill',    function(d) { return d3s.fill[d.id]; })
            .attr('opacity', function(d) { return d3s.opacity[d.id]; })
            .attr('height',  function(d) { return d3s.height[d.id]; })
            .attr('stroke',  function(d) { return d3s.stroke[d.id]; });
    }

    /*
     * @function: highlightPoints
     */
    function highlightPoints() {
        // get a handle to the relevant elements
        var pnts = d3.selectAll('.circle');
        pnts.attr('fill',    function(d) { return d3s.fill[d.id]; })
            .attr('opacity', function(d) { return d3s.opacity[d.id]; })
            .attr('stroke',  function(d) { return d3s.stroke[d.id]; });
    }

    /*
     * @function: sizeNodesEvenly
     */
    function sizeNodesEvenly() {
        d3.selectAll('.node')
          .transition()
          .attr('r', configuration.radius.node.unselected);
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
        highlightRects: highlightRects,
        highlightPoints: highlightPoints, 
        highlightByType: highlightByType,
        highlightById: highlightById,
        sizeNodesEvenly: sizeNodesEvenly,
        resetNodeDimensions: resetNodeDimensions,
        reset: reset,
        sanitize: sanitize
    }
    d3s.fill = {};
    d3s.opacity = {};
    d3s.stroke = {};
    d3s.height = {};
    d3s.linkStroke = {};
    d3s.linkOpacity = {};
    return d3s;

  }]);
