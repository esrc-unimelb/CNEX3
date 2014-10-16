'use strict';

angular.module('interfaceApp')
  .service('DataService', [ '$rootScope', function ForceData($rootScope) {
    // AngularJS will instantiate a singleton by calling "new" on this function
    //

    function getNodeData(nodes, contextNode) {
        DataService.selected = nodes;
        DataService.contextNode = contextNode;
        $rootScope.$broadcast('node-data-ready');
    }

    var DataService = {
        // connected nodes
        nodes: [],

        // un-connected nodes
        unConnectedNodes: [],

        // links
        links: [],

        getNodeData: getNodeData
    }

    return DataService;
  }]);
