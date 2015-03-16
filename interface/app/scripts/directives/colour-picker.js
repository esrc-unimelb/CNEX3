'use strict';

angular.module('interfaceApp')
  .directive('colourPicker', [ '$rootScope', 'DataService', 'configuration', function ($rootScope, DataService, conf) {
    return {
      templateUrl: 'views/colour-picker.html',
      restrict: 'E',
      scope: {
      },
      link: function postLink(scope, element, attrs) {
          scope.showPicker = false;
          scope.showChooser = false;
          scope.custom = {};

          // get the default colours from the configuration
          scope.colours = {};
          angular.forEach(DataService.types, function(v, k) {
              scope.colours[v.coreType] = conf.colours[v.coreType.toLowerCase()];
          });

          // get the pallette from the configuration
          scope.pallette = conf.pallette;

          scope.toggleColourPicker = function() {
              scope.showPicker = !scope.showPicker;
              scope.showChooser = false;
          }

          scope.changeColour = function(type) {
              scope.showPicker = false;
              scope.showChooser = true;
              scope.type = type;
          }
          scope.setColour = function(colour) {
              scope.colours[scope.type] = colour;
              conf.colours[scope.type] = colour;
              scope.showPicker = true;
              scope.showChooser = false;
              $rootScope.$broadcast('colours-changed');
          }
          scope.save = function() {
              scope.setColour(scope.custom.colour);
              scope.dismissChooser();
          }
          scope.dismissChooser = function() {
              scope.showPicker = true;
              scope.showChooser = false;
          }
      }
    };
  }]);
