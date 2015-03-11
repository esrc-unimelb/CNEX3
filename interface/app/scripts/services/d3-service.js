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
        d3s.labelSelections(graphSelector, selections, 5);

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
                  return d.color;
              } else {
                  return '#ccc';
              }
          })
          .style('stroke', function(d) {
              if (d.id === contextNode) {
                  return 'black'
              } else if (selections.indexOf(d.id) !== -1) {
                  return d.color; 
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
                  return d.color;
              } else {
                  return '#ccc';
              }
          });
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
        s2 = _.sortBy(s2, function(d) { return d.r; });
        return s2;
    }

    /*
     * @function: labelSelections
     */
    function labelSelections(graphSelector, selections, total) {
        // if the total to label is undefined, label all nodes
        if (total === undefined) {
            total = selections.length; 
        }

        // remove any text elements
        d3.select(graphSelector)
          .selectAll('text')
          .remove();

        selections = createDataStructure(graphSelector, selections);
        selections = selections.reverse();

        // iterate over the selections and label as required
        var i = 0;
        angular.forEach(selections.slice(0, total), function(v,k) {
            d3.select(graphSelector)
              .select('#node_' + v.id)
              .each(function(d) {
                  var coords = DataService.determineLabelPosition(graphSelector, d);
                  d3.select(graphSelector).select('svg').select('g').append('text')
                     .attr('x', coords.x)
                     .attr('y', coords.y)
                     .attr('id', 'text_' + d.id)
                     .attr('class', 'text')
                     .attr('font-size', '20px')
                     .text(d.name);
              });
        })
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
              return d.r;
          })
          .attr('fill', function(d) {
              return d.color;
          })
          .style('stroke', function(d) {
              return d.color;
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
              return d.color;
          });

        d3s.type = [];
        DataService.labelMainEntities(graphSelector, 'rByEntity');
        DataService.contextNode = undefined;
        DataService.selected = [];
        $rootScope.$broadcast('node-data-ready');
    }

    /*
     * @function: sizeNodesBy
     */
    function sizeNodesBy(by, graphSelector) {
        d3.select(graphSelector)
          .selectAll('.node')
          .transition()
          .duration([750])
          .attr('r', function(d) {
              if (by === 'evenly') {
                  return '10';
              } else if (by === 'entities') {
                  return d.rByEntity;
              } else if (by === 'publications') {
                  return d.rByPublication;
              } else if (by === 'objects') {
                  return d.rByDobject;
              }
          });
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
        highlightByType: highlightByType,
        highlightById: highlightById,
        highlight: highlight,
        highlightLinks: highlightLinks,
        sizeNodesBy: sizeNodesBy,
        labelSelections: labelSelections,
        resetNodeDimensions: resetNodeDimensions,

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
