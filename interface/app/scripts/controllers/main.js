'use strict';

angular.module('interfaceApp')
  .controller('MainCtrl', [ '$scope', '$http', 'AuthService', 'configuration',
      function ($scope, $http, AuthService, configuration) {
      $scope.ready = false;
      $scope.loggedIn = false;

      var getSitesList = function() {
        var q = configuration[configuration.service];
        $http.get(q).then(function(d) {
            $scope.sites = d.data.sites;
            console.log($scope.sites);
            $scope.serviceUnavailable = false;
            $scope.ready = true;
        },
        function(resp) {
            $scope.serviceUnavailable = true;
            $scope.ready = false;
        });
      }
      //getSitesList();

      // Valid token?
      AuthService.verify(false);

      // listen for the logged in message from the auth service
      $scope.$on('user-logged-in', function() {
          // check the claims in the token to see if the user is an admin and
          //   set up the permissions accordingly
          var userData = AuthService.getUserData();
          $scope.name = userData.name;
          $scope.loggedIn = true;
          getSitesList();
      });
      $scope.$on('user-logged-out', function() {
          $scope.loggedIn = false;
          $scope.name = undefined;
          $scope.sites = undefined;
          getSitesList();
      });


      $scope.login =  function() {
          // Log the user in - or otherwise
          AuthService.login();
      };

      $scope.logout = function() {
          // initialise the authentication service
          AuthService.logout();
      };
  }]);
