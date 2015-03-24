'use strict';

angular.module('interfaceApp')
  .directive('typeFilter', [ '$rootScope', 'DataService', function ($rootScope, DataService) {
    return {
      templateUrl: 'views/type-filter.html',
      restrict: 'E',
      scope: {
          'data': '=',
      },
      link: function postLink(scope, element, attrs) {
          scope.showPicker = false;
          scope.dataTypes = [];

          scope.$on('close-type-filter', function() {
              scope.dismissFilter();
          })

          scope.toggleTypeFilter = function() {
              scope.showPicker = !scope.showPicker;
              if (scope.showPicker) {
                  scope.types = {};
                  $rootScope.$broadcast('close-colour-picker');
                  angular.forEach(DataService.types, function(v,k) {
                      // only add those that are on the screen
                      if (scope.data.types[k] !== undefined) {
                          // this HAS to be a copy else the dismissFilter function
                          //  will overwrite what's stored in the service thanks
                          //  to pass by reference...
                          scope.types[k] = angular.copy(DataService.types[k]);
                      }
                  })
              }
              if (!scope.showPicker) scope.dismissFilter();
          }

          scope.toggleType = function(type) {
              scope.dataTypes = DataService.filterTypes;
              if (scope.dataTypes.indexOf(type) === -1) {
                  scope.dataTypes.push(type);
                  scope.types[type].strike = true;
              } else {
                  scope.dataTypes.splice(scope.dataTypes.indexOf(type), 1);
                  scope.types[type].strike = false;
              }
          }

          scope.redrawTheGraph = function() {
              DataService.filterTypesFromData(scope.dataTypes);
              scope.showPicker = false;
          }

          scope.dismissFilter = function() {
              angular.forEach(scope.dataTypes, function(v,k) {
                  scope.types[v].strike = false;
              })
              //scope.dataTypes = [];
              scope.showPicker = false;
          }
      }

    };
  }]);
