'use strict';

angular.module('interfaceApp')
  .service('D3Service', [ '$rootScope', 'configuration', 'DataService', 
    function D3Service($rootScope, conf, DataService) {

    // AngularJS will instantiate a singleton by calling "new" on this function
    
    /* 
     * @function: highlightNodeAndLocalEnvironment
     */
    function highlightNodeAndLocalEnvironment(contextNode, graphSelector) {
        var selections = [];

        // whenever we highlight by node - types are off
        d3s.type = [];

        if (d3s.contextNode === contextNode) {
            d3s.contextNode = undefined;
            d3s.reset(graphSelector);
            return;
        }

        // remove all landmark labels
        d3.select(graphSelector)
            .selectAll('.text_landmark')
            .remove();

        d3s.contextNode = contextNode;
        selections.push(contextNode);

        d3.select(graphSelector)
          .selectAll('.link')
          .each(function(d) {
            if (d.source.id === contextNode) {
              selections.push(d.target.id);
            } else if (d.target.id === contextNode) {
              selections.push(d.source.id);
            }
          })

        d3s.highlight(contextNode, selections);
        d3s.highlightLinks(contextNode, selections);
        d3s.labelSelections(graphSelector, selections);

        DataService.contextNode = selections[0];
        DataService.selected = createDataStructure(graphSelector, selections);

        // notify the site controls
        $rootScope.$broadcast('node-data-ready');

        // tell search to clear
        $rootScope.$broadcast('reset-search');
    }
    /*
     * @function: highlightByType
     */
    function highlightByType(graphSelector, type) {
        if (d3s.type.indexOf(type) !== -1) {
            d3s.type.splice(d3s.type.indexOf(type), 1);
            if (d3s.type.length === 0) { 
                d3s.reset(graphSelector);
                return; 
            }
        } else {
            d3s.type.push(type);
        }

        var selections = [];
        d3.selectAll('.node')
          .each(function(d) {
              if (d3s.type.indexOf(d.type) !== -1) {
                  selections.push(d.id);
              }
           });

        d3.selectAll('.link')
          .style('stroke', '#ccc')
          .attr('opacity', conf.opacity.unselected);
        d3s.highlight(undefined, selections);
        d3s.labelSelections(graphSelector, selections);

        DataService.contextNode = undefined;
        DataService.selected = createDataStructure(graphSelector, selections);

        // notify the site controls
        $rootScope.$broadcast('node-data-ready');

        // tell search to clear
        $rootScope.$broadcast('reset-search');
    }

    /* 
     * highlightById
     */
    function highlightById(graphSelector, selections) {
        d3s.reset(graphSelector);
        d3s.highlight(undefined, selections);
        d3s.labelSelections(graphSelector, selections);

        DataService.contextNode = undefined;
        DataService.selected = createDataStructure(graphSelector, selections);
        $rootScope.$broadcast('node-data-ready');
    }

    /*
     * highlight
     */
    function highlight(contextNode, selections) {
        d3.selectAll('.node')
          .transition()
          .duration(500)
          .attr('fill', function(d) {
              if (selections.indexOf(d.id) !== -1) {
                  return DataService.getColor(d.type);
              } else {
                  return '#ccc';
              }
          })
          .style('stroke', function(d) {
              if (d.id === contextNode) {
                  return 'black'
              } else if (selections.indexOf(d.id) !== -1) {
                  return DataService.getColor(d.type); 
              } else {
                  return '#ccc';
              }
          })
          .attr('opacity', function(d) {
              if (selections.indexOf(d.id) !== -1) {
                  return conf.opacity.default;
              } else {
                  return conf.opacity.unselected;
              }
          });

        d3.selectAll('.date')
          .transition()
          .duration(500)
          .attr('opacity', function(d) {
              if (selections.indexOf(d.id) === -1) {
                  return 0;
              }
          })
          .style('stroke', function(d) {
              if (d.id === contextNode) {
                  return 'black'
              } else if (selections.indexOf(d.id) !== -1) {
                  return DataService.getColor(d.type);
              } else {
                  return '#ccc';
              }
          });
    }

    /*
     * highlightLinks
     */
    function highlightLinks(contextNode, selections) {
        d3.selectAll('.link')
          .transition()
          .duration(500)
          .style('stroke', function(d) {
              if (selections.indexOf(d.source.id) !== -1 && d.target.id === contextNode) {
                  return 'black';
              } else if (selections.indexOf(d.target.id) !== -1 && d.source.id === contextNode) {
                  return 'black';
              } else {
                  return '#ccc';
              }
          })
          .attr('opacity', function(d) {
              if (selections.indexOf(d.source.id) !== -1 && d.target.id === contextNode) {
                  return conf.opacity.default;
              } else if (selections.indexOf(d.target.id) !== -1 && d.source.id === contextNode) {
                  return conf.opacity.default;
              } else {
                  return conf.opacity.unselected;
              }
          });
    }

    /*
     * @function: reset
     */
    function reset(graphSelector) {
        d3.select(graphSelector)
          .selectAll('.node')
          .transition()
          .duration(500)
          .attr('r', function(d) {
              return d[d3s.sizeBy];
          })
          .attr('fill', function(d) {
              return DataService.getColor(d.type);
          })
          .style('stroke', function(d) {
              return DataService.getColor(d.type);
          })
          .attr('opacity', function(d) {
              return conf.opacity.default;
          });
        d3.select(graphSelector)
          .selectAll('.link')
          .transition()
          .duration(500)
          .style('stroke', '#ccc')
          .attr('opacity', conf.opacity.default);

        d3.selectAll('.date') 
          .transition()
          .duration(500)
          .attr('opacity', conf.opacity.default)
          .style('stroke', function(d) {
              return DataService.getColor(d.type);
          });

        d3s.type = [];
        DataService.contextNode = undefined;
        DataService.selected = undefined;
        d3s.renderLabels(graphSelector);
        $rootScope.$broadcast('node-data-ready');
    }

    /*
     * @function: sizeNodesBy
     */
    function sizeNodesBy(graphSelector, by) {
        d3.select(graphSelector)
          .selectAll('.node')
          .transition()
          .duration([750])
          .attr('r', function(d) {
              if (by === 'evenly') {
                  // saved for later user by other things
                  d3s.sizeBy = 'r';
                  return '10';
              } else if (by === 'entities') {
                  // saved for later user by other things
                  d3s.sizeBy = 'rByEntity';
                  return d.rByEntity;
              } else if (by === 'publications') {
                  // saved for later user by other things
                  d3s.sizeBy = 'rByPublication';
                  return d.rByPublication;
              } else if (by === 'objects') {
                  // saved for later user by other things
                  d3s.sizeBy = 'rByDobject';
                  return d.rByDobject;
              }
          });
    }

    /*
     * @function: sanitize
     */
    function sanitize(selector) {
        var s = selector.replace(/\(|\)/g, '').replace(/ /g, '_');
        return s;
    }

    /*
     * @function: parseTransform
     */
    function parseTransform(t) {
        var transform = {};
        transform.translate = t.match(/translate\(.*?\)/)[0];
        transform.scale = t.match(/scale\(.*?\)/)[0];
        transform.rotate = t.match(/rotate\(.*?\)/)[0];
        return transform;
    }

    // rotate the graph left
    function rotateLeft(graphSelector, currentRotation) {
        d3.select(graphSelector)
          .selectAll('text')
          .remove();

        var svg = d3.select(graphSelector)
          .select('.node-container');
        var t = d3s.parseTransform(svg.attr('transform'));

        var r;
        if (currentRotation === -345) {
            r = 0;
        } else {
            r = currentRotation - 15;
        }

        /*
        var bbox, x, y;
        bbox = d3.select('svg').select('g')[0][0].getBBox();
        x = bbox.x + bbox.width / 2;
        y = bbox.y + bbox.height / 2;
        */

        svg.transition()
           .duration(500)
           .attr('transform', 'rotate(' + r + ')' +  t.translate + ' ' + t.scale);

        return r;
    }

    // rotate the graph right
    function rotateRight(graphSelector, currentRotation) {
        d3.select(graphSelector)
          .selectAll('text')
          .remove();

        var svg = d3.select(graphSelector)
          .select('.node-container');
        var t = d3s.parseTransform(svg.attr('transform'));

        var r;
        if (currentRotation === 345) {
            r = 0;
        } else {
            r = currentRotation + 15;
        }

        d3.select(graphSelector).select('svg')[0][0].getBBox();
        svg.transition()
           .duration(500)
           .attr('transform', 'rotate(' + r + ')' +  t.translate + ' ' + t.scale);

        return r;
    }

    /*
     * @function: calculateTransformAndScale
     */
    function calculateTransformAndScale(graphSelector) {
        // center the graph
        var gc = d3.select(graphSelector).select('.node-container')[0][0].getBoundingClientRect();
        var pc = d3.select(graphSelector)[0][0].getBoundingClientRect();
        //console.log(gc, pc);
        //console.log(d3.select(graphSelector).select('svg')[0][0].getBBox());

        var use = gc.width > gc.height ? gc.width: gc.height;
        var scale = pc.width / use;
        var scx = ((gc.width - pc.width) / 2) * scale,
            scy = ((gc.height - pc.height) / 2) * scale,
            t = [scx, scy];

        //console.log(t, scale);
        return { 'translate': t, 'scale': scale * 0.8 }
    }

    function determineLabelPosition(graphSelector, d) {
        var w = d3.select(graphSelector).select('svg').attr('width');
        var h = d3.select(graphSelector).select('svg').attr('height');

        // where is the node located relative to the underlying svg
        var nx, ny;
        var qx = d.x / w;
        var qy = d.y / h;
        if (qx < 0.5 && qy < 0.5) {
             nx = d.x + d.r / 2;
             ny = d.y - d.r / 2;
        } else if (qx < 0.5 && qy > 0.5) {
             nx = d.x + d.r / 2;
             ny = d.y + d.r / 2;
        } else if (qx > 0.5 && qy < 0.5) {
             nx = d.x + d.r / 2;
             ny = d.y - d.r / 2;
        } else {
             nx = d.x + d.r / 2;
             ny = d.y + d.r / 2;
        }
        return {
            'x': nx,
            'y': ny
        }
    }

    /*
     * createDataStructure
     */
    function createDataStructure(graphSelector, selections) {
        // in order to sort these we need to build a new array
        //  of data objects first. /sigh
        var s2 = [];
        angular.forEach(selections, function(v,k) {
            d3.select(graphSelector)
              .select('#node_' + v)
              .each(function(d) {
                  s2.push(d);
              });
        })
        return s2;
    }

    /*
     * @function: renderLabels
     */
    function renderLabels(graphSelector) {
        if (d3s.selected !== undefined) {
            d3s.labelSelections(graphSelector, d3s.selected);
        } else {
            d3s.labelMainEntities(graphSelector);
        }
    }

    /*
     * @function: labelSelections
     */
    function labelSelections(graphSelector, selections) {
        selections = createDataStructure(graphSelector, selections);
        selections = _.sortBy(selections, function(d) { return d[d3s.sizeBy]; });
        selections = selections.reverse();
        d3s.label(graphSelector, selections.slice(0, d3s.nLabels));
    }

    /*
     * @function: labelMainEntities
     */
    function labelMainEntities(graphSelector) {
        var selections = _.sortBy(d3.select(graphSelector).selectAll('.node').data(), function(d) { return d[d3s.sizeBy]; });
        selections = selections.reverse();
        d3s.label(graphSelector, selections.slice(0, d3s.nLabels));
    }


    /*
     * @function: label
     */
    function label(graphSelector, selections) {
        // ditch any previous labels;
        d3.select(graphSelector)
          .selectAll('text')
          .remove();

        // iterate over the selections and label as required
        var i = 0;
        angular.forEach(selections, function(v,k) {
            d3.select(graphSelector)
              .select('#node_' + v.id)
              .each(function(d) {
                  var coords = determineLabelPosition(graphSelector, d);
                  d3.select(graphSelector)
                     .select('.text-container')
                     .append('text')
                     .attr('x', coords.x)
                     .attr('y', coords.y)
                     .attr('id', 'text_' + d.id)
                     .attr('class', 'text-landmark')
                     .attr('font-size', '20px')
                     .text(d.name);
              });
        })
    }

    var d3s = {
        highlightedTypes: [],
        nLabels: 5,
        sizeBy: 'r',
        colors: d3.scale.category20(),
        highlightNodeAndLocalEnvironment: highlightNodeAndLocalEnvironment,
        highlightByType: highlightByType,
        highlightById: highlightById,
        highlight: highlight,
        highlightLinks: highlightLinks,
        sizeNodesBy: sizeNodesBy,
        parseTransform: parseTransform,
        rotateLeft: rotateLeft,
        rotateRight: rotateRight,
        calculateTransformAndScale: calculateTransformAndScale,
        renderLabels: renderLabels,
        labelMainEntities: labelMainEntities,
        labelSelections: labelSelections,
        label: label,
        determineLabelPosition: determineLabelPosition,
        reset: reset,
        sanitize: sanitize
    }
    d3s.fill = {};
    d3s.opacity = {};
    d3s.stroke = {};
    d3s.strokeWidth = {};
    d3s.height = {};
    d3s.contextNode = undefined;
    d3s.type = [];
    return d3s;

  }]);
