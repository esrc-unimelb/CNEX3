'use strict';

angular.module('interfaceApp')
  .directive('colourPicker', [ '$rootScope', 'DataService', 'configuration', function ($rootScope, DataService, conf) {
    return {
      templateUrl: 'views/colour-picker.html',
      restrict: 'E',
      scope: {
          types: '='
      },
      link: function postLink(scope, element, attrs) {
          scope.showPicker = false;
          scope.showChooser = false;
          scope.custom = {};

          // get the default colours from the configuration
          scope.colours = {};
          var t = scope.types === undefined ? DataService.types : scope.types
          angular.forEach(t, function(v, k) {
              scope.colours[conf.mapForward[v.coreType]] = conf.colours[v.coreType];
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
              conf.colours[conf.mapReverse()[scope.type]] = colour;
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
