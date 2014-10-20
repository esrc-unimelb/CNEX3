'use strict';

angular.module('interfaceApp')
  .controller('MainCtrl', [ '$scope', '$http', 'AuthService', 'configuration',
        function ($scope, $http, AuthService, configuration) {

      var getSitesList = function() {
        var q = configuration[configuration.service];
        $http.get(q).then(function(d) {
            $scope.sites = d.data.sites;
            $scope.serviceUnavailable = false;
        },
        function(resp) {
            $scope.serviceUnavailable = true;
        });
      }

      // listen for the logged in message from the auth service
      $scope.ready = false;
      $scope.$on('user-logged-in', function() {
          // check the claims in the token to see if the user is an admin and
          //   set up the permissions accordingly
          var userData = AuthService.getUserData();
          $scope.admin = userData.admin;
          $scope.name = userData.name;
          getSitesList();
          $scope.ready = true;
      });
      $scope.$on('user-logged-out', function() {
          $scope.admin = false;
          $scope.name = undefined;
          $scope.ready = false;
          $scope.sites = undefined;
      });

      // Valid token?
      AuthService.verify(false);

      $scope.login =  function() {
          // Log the user in - or otherwise
          AuthService.login();
      };

      $scope.logout = function() {
          // initialise the authentication service
          AuthService.logout();
      };
  }]);
