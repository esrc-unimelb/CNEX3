'use strict';

angular.module('interfaceApp')
  .directive('typeFilter', [ '$rootScope', 'DataService', function ($rootScope, DataService) {
    return {
      templateUrl: 'views/type-filter.html',
      restrict: 'E',
      scope: {
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
                  $rootScope.$broadcast('close-colour-picker');
                  scope.types = angular.copy(DataService.types);
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
              scope.dataTypes = [];
              scope.showPicker = false;
          }
      }

    };
  }]);
