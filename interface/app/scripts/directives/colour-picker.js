'use strict';

angular.module('interfaceApp')
  .directive('colourPicker', [ '$rootScope', 'DataService', 'configuration', function ($rootScope, DataService, conf) {
    return {
      templateUrl: 'views/colour-picker.html',
      restrict: 'E',
      scope: {
          'data': '=',
      },
      controllerAs: 'colourPickerCtrl',
      link: function postLink(scope, element, attrs) {
          scope.showPicker = false;
          scope.showChooser = false;
          scope.custom = {};

          // get the pallette from the configuration
          scope.pallette = conf.pallette;

          scope.$on('close-colour-picker', function() {
              scope.showPicker = false;
              scope.showChooser = false;
          })

          // get the default colours from the configuration
          var process = function() {
              scope.types = {};
              angular.forEach(DataService.types, function(v, k) {
                  // only add those that are on the screen
                  // and part of this set
                  if (!v.strike && scope.data.types[k] !== undefined) {
                    scope.types[k] = DataService.types[k];
                  }
              });
          }

          scope.toggleColourPicker = function() {
              scope.showPicker = !scope.showPicker;
              scope.showChooser = false;
              if (scope.showPicker) {
                  $rootScope.$broadcast('close-type-filter');
                  process();
              }
          }

          scope.changeColour = function(type) {
              scope.showPicker = false;
              scope.showChooser = true;
              scope.type = type;
          }
          scope.setColor = function(color) {
              scope.types[scope.type].color = color;
              DataService.setColor(scope.type, color);
              scope.showPicker = true;
              scope.showChooser = false;
              $rootScope.$broadcast('colours-changed');
          }
          scope.save = function() {
              scope.setColor(scope.custom.color);
              scope.dismissChooser();
          }
          scope.dismissChooser = function() {
              scope.showPicker = true;
              scope.showChooser = false;
          }
      }
    };
  }]);
