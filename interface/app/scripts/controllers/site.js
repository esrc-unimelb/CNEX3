'use strict';

angular.module('interfaceApp')
  .controller('GraphCtrl', [ '$scope', '$routeParams', '$http', '$timeout', 'configuration', 
    function ($scope, $routeParams, $http, $timeout, configuration) {

        console.log($routeParams);
        console.log(configuration);
        var service = configuration[configuration.service];

        $scope.init = function() {
            $scope.session_id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;return v.toString(16);
            });
            $scope.progress = false;
            $scope.processed = -1;
            $scope.total = 0;
            $scope.dataset_error = false;

            // kick off the progress update in a moment; needs time to get going..
            $timeout(function() { $scope.update(); }, 100);

            var url;
            if ($routeParams.explore == 'byEntity') {
                url = service + '/graph/' + $routeParams.code + '/byEntity/' + $scope.session_id; 
            } else if ($routeParams.explore == 'byFunction') {
                url = service + '/graph/' + $routeParams.code + '/byFunction/' + $scope.session_id; 
            }
            url += '?callback=JSON_CALLBACK';
            console.log(url);
            $http.jsonp(url).then(function(response) {
                $scope.site_name = response.data.site_name;
                $scope.graph = response.data.graph;
            },
            function(response) {
                $scope.dataset_error = true;
            })

        }

        $scope.update = function() {
            var url = service + '/status/' + $routeParams.code + '/' + $scope.session_id + '?callback=JSON_CALLBACK';
            $http.jsonp(url).then(function(response) {
                $scope.progress = true;
                $scope.processed = response.data['processed'];
                $scope.total = response.data['total'];
                $timeout(function() { $scope.update(); }, 100);


            },
            function(response){
                $scope.progress = false;
            })
        }
      
  }]);
