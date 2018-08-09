'use strict';

angular.module('interfaceApp')
  .directive('searchForm', [ '$routeParams', '$location', 'SolrService',
    function ($routeParams, $location, SolrService) {
    return {
      templateUrl: 'views/search-form.html',
      restrict: 'E',
      scope: {
          searchType: '@',
      },
      link: function postLink(scope) {

          // handle app reset 
          scope.$on('reset-search', function() {
              scope.nSearchMatches = undefined;
              scope.searchBox = undefined;
          });

          // process the search data
          scope.$on('search-data-ready', function() {
              scope.nSearchMatches = SolrService.selected.length;
          });

          scope.search = function() {
              if (scope.searchBox === '') {
                  scope.searchBox = '*';
              }

              // args:
              // - what: scope.searchBox (the search term
              // - start: 0 (record to start at)
              // - ditchSuggestion: true
              SolrService.search(scope.searchBox, 0, true);
          };

          scope.setSearchType = function(type) {
              SolrService.searchType = type;
              if (SolrService.searchType === 'phrase') {
                  scope.keywordSearch = false;
                  scope.phraseSearch = true;
              } else {
                  scope.phraseSearch = false;
                  scope.keywordSearch = true;
              }
              scope.search();
          };

          scope.setSearchType(scope.searchType);

      },
    };
  }]);
