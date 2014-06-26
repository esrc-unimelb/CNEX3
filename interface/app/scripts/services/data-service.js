'use strict';

angular.module('interfaceApp')
  .service('DataService', [ function ForceData() {
    // AngularJS will instantiate a singleton by calling "new" on this function
    //

    var d = {
        // connected nodes
        nodes: [],

        // un-connected nodes
        unConnectedNodes: [],

        // links
        links: []
    }

    return d;
  }]);
