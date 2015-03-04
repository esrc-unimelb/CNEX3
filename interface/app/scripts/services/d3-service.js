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
        if (d3s.contextNode === contextNode) {
            d3s.contextNode = undefined;
            d3s.reset();
            return;
        }
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

        DataService.contextNode = selections[0];
        DataService.selected = selections;
        $rootScope.$broadcast('node-data-ready');
    }

    /*
     * @function: highlightByType
     */
    function highlightByType(type) {
        if (d3s.type.indexOf(type) !== -1) {
            d3s.type.splice(d3s.type.indexOf(type), 1);
            d3s.reset();
            if (d3s.type.length === 0) { return; }
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

        d3s.highlight(undefined, selections);
        d3.selectAll('.link')
          .attr('opacity', conf.opacity.unselected);

        DataService.contextNode = undefined;
        DataService.selected = selections;
        $rootScope.$broadcast('node-data-ready');
    }

    /*
     * highlight
     */
    function highlight(contextNode, selections) {
        d3.selectAll('.node')
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
     * highlightLinks
     */
    function highlightLinks(contextNode, selections) {
        d3.selectAll('.link')
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
    function reset() {
        d3.selectAll('.node')
          .attr('fill', function(d) {
              return d.color;
          })
          .style('stroke', function(d) {
              return d.color;
          })
          .attr('opacity', function(d) {
              return conf.opacity.default;
          });
        d3.selectAll('.link')
          .style('stroke', '#ccc')
          .attr('opacity', conf.opacity.default);

        d3.selectAll('.date') 
          .attr('opacity', conf.opacity.default)
          .attr('stroke', function(d) {
              return d.color;
          });

        DataService.contextNode = undefined;
        DataService.selected = [];
        $rootScope.$broadcast('node-data-ready');

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
        highlight: highlight,
        highlightLinks: highlightLinks,
        sizeNodesEvenly: sizeNodesEvenly,
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
