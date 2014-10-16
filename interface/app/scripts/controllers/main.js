'use strict';

angular.module('interfaceApp')
  .controller('MainCtrl', [ '$scope', '$http', 'AuthService', 'configuration',
        function ($scope, $http, AuthService, configuration) {


      var getSitesList = function() {
        var q = configuration[configuration.service];
        console.log(q);
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
          $scope.fullname = AuthService.claims.fullname;
          $scope.ready = true;
          getSitesList();
      });
      $scope.$on('user-logged-out', function() {
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
