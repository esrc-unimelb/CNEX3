'use strict';

angular.module('interfaceApp')
  .service('D3Service', [ '$rootScope', 'configuration', 'DataService', function D3Service($rootScope, configuration, DataService) {
    // AngularJS will instantiate a singleton by calling "new" on this function
    //
    
    /* 
     * @function: highlightNodeAndLocalEnvironment
     */
    function highlightNodeAndLocalEnvironment(contextNode) {
        var nodes = DataService.nodes;
        var links = DataService.links;
        var neighbours = [];
        var fill = {}, opacity = {}, stroke = {}, height = {}, radiusNode = {}, radiusDate = {};
        var linkStroke = {}, linkOpacity = {};

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
                  linkStroke[v.source.id + '-' + v.target.id] = configuration.stroke.link.selected;
                  linkOpacity[v.source.id + '-' + v.target.id] = configuration.opacity.default;
            } else if (v.target.id === contextNode && neighbours.indexOf(v.source.id) !== -1) {
                  linkStroke[v.source.id + '-' + v.target.id] = configuration.stroke.link.selected;
                  linkOpacity[v.source.id + '-' + v.target.id] = configuration.opacity.default;
            } else {
                // every link that is not between the context node and a first degree neighbour
                //  should fade into the background
                linkStroke[v.source.id + '-' + v.target.id] = configuration.stroke.link.unselected;
                linkOpacity[v.source.id + '-' + v.target.id] = configuration.opacity.unselected;
            }

        });

        angular.forEach(nodes, function(v,k) {
            if (v.id === contextNode) {
                // set the properties of the focus node
                fill[v.id] = configuration.fill.contextNode;
                opacity[v.id] = configuration.opacity.default;
                stroke[v.id] = configuration.stroke.date.selected;
                height[v.id] = configuration.height.selected;
                radiusNode[v.id] = configuration.radius.node.selected;
                radiusDate[v.id] = configuration.radius.date.selected;
            } else if (neighbours.indexOf(v.id) !== -1) {
                // set the properties of the neighbours
                fill[v.id] = configuration.fill.contextNeighbourDefault;
                opacity[v.id] = configuration.opacity.default;
                stroke[v.id] = configuration.stroke.date.selected;
                height[v.id] = configuration.height.selected;
                radiusNode[v.id] = configuration.radius.node.selected;
                radiusDate[v.id] = configuration.radius.date.selected;
            } else {
                //set the properties of the other nodes
                fill[v.id] = configuration.fill.default;
                opacity[v.id] = configuration.opacity.unselected;
                stroke[v.id] = configuration.stroke.date.unselected;
                height[v.id] = configuration.height.default;
                radiusNode[v.id] = configuration.radius.node.unselected;
                radiusDate[v.id] = configuration.radius.date.default;
            }
        });

        d3s.highlightNodes('id', fill, opacity, radiusNode);
        d3s.highlightLinksById(linkStroke, linkOpacity);
        d3s.highlightRects('id', fill, opacity, height, stroke);
        d3s.highlightPoints('id', fill, opacity, stroke, radiusDate);

        DataService.getNodeData(neighbours, contextNode);
    }

    /* 
     * @function: highlightNodes
     */
    function highlightNodes(by, fill, opacity, radius) {
        // get a handle to all nodes
        var node = d3.selectAll('.node');

        if (radius === undefined) {
            node.transition()
                .attr('fill',    function(d) { return fill[d[by]]; })
                .attr('opacity', function(d) { return opacity[d[by]]; });
        } else {
            node.transition()
                .attr('fill',    function(d) { return fill[d[by]]; })
                .attr('opacity', function(d) { return opacity[d[by]]; })
                .attr('r',       function(d) { return radius[d[by]]; });
        }
    }

    /*
     * @function: highlightNode
     */
    function highlightNode(id) {
        var nodeDefaultColor;
        if (DataService.contextNode !== undefined) {
            nodeDefaultColor = configuration.fill.contextNeighbourDefault;
        } else {
            nodeDefaultColor = DataService.nodeMap[id].color;
        }

        var n = d3.select('#' + id.replace(' ', '_') + '_node');
        if (n.attr('fill') === configuration.fill.contextNeighbourHighlight) {
            n.attr('fill', nodeDefaultColor);
        } else {
            n.attr('fill', configuration.fill.contextNeighbourHighlight);
        }

        var d = d3.select('#' + id + '_date');
        try {
            if (d.attr('fill') === configuration.fill.contextNeighbourHighlight) {
                d.attr('fill', configuration.fill.default);
            } else {
                d.attr('fill', configuration.fill.contextNeighbourHighlight);
            }
        } catch (e) {
            // not all nodes have dates
        }
    }

    /*
     * @function: highlightLinksById
     */
    function highlightLinksById(linkStroke, linkOpacity) {
        // get a handle to the relevant elements
        var link = d3.selectAll('.link');
        link.attr('stroke',  function(d) { return linkStroke[d.source.id + '-' + d.target.id]; })
            .attr('opacity', function(d) { return linkOpacity[d.source.id + '-' + d.target.id]; });
    }

    /*
     * @function: highlightRects
     */
    function highlightRects(by, fill, opacity, height, stroke) {
        // get a handle to the relevant elements
        var rect = d3.selectAll('.rect');
        rect.attr('fill',    function(d) { return fill[d[by]]; })
            .attr('opacity', function(d) { return opacity[d[by]]; })
            .attr('height',  function(d) { return height[d[by]]; })
            .attr('stroke',  function(d) { return stroke[d[by]]; });
    }

    /*
     * @function: highlightPoints
     */
    function highlightPoints(by, fill, opacity, stroke, radius) {
        // get a handle to the relevant elements
        var pnts = d3.selectAll('.circle');
        pnts.attr('fill',    function(d) { return fill[d[by]]; })
            .attr('opacity', function(d) { return opacity[d[by]]; })
            .attr('r',       function(d) { return radius[d[by]]; })
            .attr('stroke',  function(d) { return stroke[d[by]]; });
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

        var fill = [], opacity = [], radiusNode = [], radiusDate = [], height = [], stroke = [];
        var linkStroke = [], linkOpacity = [];
        var selectedNodes = [];
        angular.forEach(nodes, function(v,k) {
            if (types.indexOf(v.type) !== -1) {
                fill[v.type] = v.color;
                opacity[v.type] = configuration.opacity.default;
                radiusNode[v.type] = configuration.radius.node.selected;
                radiusDate[v.type] = configuration.radius.date.selected;
                height[v.type] = configuration.height.selected;
                stroke[v.type] = configuration.stroke.date.selected;
                selectedNodes.push(v.id);
            } else {
                fill[v.type] = configuration.fill.default 
                opacity[v.type] = configuration.opacity.unselected;
                radiusNode[v.type] = configuration.radius.node.unselected;
                radiusDate[v.type] = configuration.radius.node.default;
                height[v.type] = configuration.height.default;
                stroke[v.type] = configuration.stroke.date.unselected;
            }
        })
 
        angular.forEach(links, function(v,k) {
            linkStroke[v.source.id + '-' + v.target.id] = configuration.stroke.unselected;
            linkOpacity[v.source.id + '-' + v.target.id] = configuration.opacity.unselected;
        })

        d3s.highlightNodes('type', fill, opacity, radiusNode);
        d3s.highlightLinksById(linkStroke, linkOpacity);
        d3s.highlightRects('type', fill, opacity, height, stroke);
        d3s.highlightPoints('type', fill, opacity, stroke, radiusDate);
        d3s.highlightedTypes = types;

        DataService.getNodeData(selectedNodes, undefined);
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
     * @function: reset
     */
    function reset() {
        d3s.highlightedTypes = [];
        $rootScope.$broadcast('reset');
    }

    var d3s = {
        highlightedTypes: [],
        colors: d3.scale.category20(),
        highlightNodeAndLocalEnvironment: highlightNodeAndLocalEnvironment,
        highlightNodes: highlightNodes,
        highlightNode: highlightNode,
        highlightLinksById: highlightLinksById,
        highlightRects: highlightRects,
        highlightPoints: highlightPoints, 
        highlightByType: highlightByType,
        sizeNodesEvenly: sizeNodesEvenly,
        reset: reset
    }
    return d3s;

  }]);
