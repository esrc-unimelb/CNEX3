'use strict';

angular.module('interfaceApp')
  .service('SolrService', [ '$http', '$rootScope', '$routeParams', 'configuration', 'DataService',
    function SolrService($http, $rootScope, $routeParams, conf, DataService) {
    // AngularJS will instantiate a singleton by calling "new" on this function
    //
    var solr = conf.solr;
    var search = function(what) {
        if (what !== undefined) {
            var q = [];

            var searchFields = [];
            angular.forEach(conf.searchWhat, function(v,k) {
                searchFields.push({ 'name': conf.searchFields[v].fieldName, 'weight': conf.searchFields[v].weight });

            });
            // are we doing a wildcard search? or a single term search fuzzy search?
           if (SolrService.searchType === 'keyword') {
              what = what.replace(/ /gi, ' ' + SolrService.keywordUnion + ' ');
              angular.forEach(searchFields, function(v, k) {
                  q.push(v.name + ':(' + what + ')');
              })

            } else {
                angular.forEach(searchFields, function(v, k) {
                    q.push(v.name + ':"' + what + '"');
                })
             }
            q = q.join(' OR ');

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
                        if (v.record_id !== undefined) {
                            matchingRecords.push(v.record_id);
                        }
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
