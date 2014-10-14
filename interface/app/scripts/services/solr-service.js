'use strict';

angular.module('interfaceApp')
  .service('SolrService', [ '$http', '$rootScope', '$routeParams', 'configuration', 'DataService',
    function SolrService($http, $rootScope, $routeParams, configuration, DataService) {
    // AngularJS will instantiate a singleton by calling "new" on this function
    //
    var solr = configuration.solr;
    var search = function(what) {
        if (what !== undefined) {
            //console.log(what, $routeParams.code);
            var q;
            if (SolrService.searchType === 'keyword') {
                what = what.replace(/ /gi, ' AND ');
                q = 'name:(' + what + ') OR altname:(' + what + ') OR locality:(' + what + ') OR text:(' + what + ')';
            } else {
                q = 'name:"' + what + '" OR altname:"' + what + '" OR locality:"' + what + '" OR text:"' + what + '"';
            }
            q = {
                'url': solr,
                'params': {
                    'q': q,
                    'start': 0,
                    'rows': 0,
                    'wt': 'json',
                    'fq': 'site_code:' + $routeParams.code,
                    'json.wrf': 'JSON_CALLBACK',
                    'spellcheck': 'off'
                },
            };
            $http.jsonp(solr, q).then(function(resp) {
                // search succeeded
                q.params.rows = resp.data.response.numFound;
                q.params.fl = 'record_id';
                //console.log(q);
                $http.jsonp(solr, q).then(function(resp) {
                    // search succeeded
                    var matchingRecords = [];
                    angular.forEach(resp.data.response.docs, function(v, k) {
                        matchingRecords.push(v.record_id);
                    });
                    SolrService.selected = matchingRecords;
                    $rootScope.$broadcast('search-data-ready');
                },
                function(resp) {
                    // search failed
                });
            }, 
            function(resp) {
                // search failed
            });
        }
        
    }

    var SolrService = {
        search: search,
    }
    return SolrService;
  }]);
