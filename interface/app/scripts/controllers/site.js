'use strict';

angular.module('interfaceApp')
    .controller('SiteCtrl', ['$rootScope', '$scope', '$routeParams', '$http', '$timeout', '$location', 'configuration', 'DataService',
        function ($rootScope, $scope, $routeParams, $http, $timeout, $location, conf, DataService) {

            $scope.site = $routeParams.code;
            $scope.graph = $routeParams.explore;
            $scope.service = conf[conf.service];
            $scope.showEntityNetwork = false;

            $scope.initting = true;
            $scope.progress = false;
            $scope.datasetError = false;
            $scope.ready = false;
            $scope.loadGraph = false;
            $scope.total = 0;
            $scope.processed = 0;

            var url = $scope.service + '/network/' + $scope.site + '/' + $scope.graph;
            $http.get(url).then(function (d) {
                // kick off the progress update in a moment; needs time to get going..
                $timeout(function () { $scope.update(); }, 100);
                $scope.progress = false;
                $scope.site = {
                    'name': d.data.name,
                    'url': d.data.url,
                    'code': $scope.site
                };
                DataService.site = $scope.site;
            },
                function () {
                    $scope.datasetError = true;
                    $scope.progress = false;
                    $scope.initting = false;
                });

            $scope.$on('graph-ready', function () {
                $scope.showControls = true;
            });
            $scope.$on('load-entity-network-view', function () {
                $scope.showEntityNetwork = true;
            });
            $scope.$on('destroy-entity-network-view', function () {
                $scope.showEntityNetwork = false;
            });

            // When the back button is pressed whilst viewing the entity network,
            //  intercept the location change event, cancel it, and destroy the 
            //  entity network
            $scope.$on('$locationChangeStart', function (e, n, o) {
                if (o.match(/^.*\/site\/.*\/byEntity$/) && $scope.showEntityNetwork === true) {
                    $scope.showEntityNetwork = false;
                    e.preventDefault();
                }
            });

            $scope.update = function () {
                var url = $scope.service + '/network/' + $scope.site.code + '/' + $scope.graph + '/status';
                $http.get(url).then(function (resp) {
                    if ((resp.data.processed !== null) && (resp.data.processed !== '')) {
                        $scope.initting = false;
                        $scope.progress = true;
                        $scope.processed = resp.data.processed;
                        $scope.total = resp.data.total;
                        $timeout(function () { $scope.update(); }, 100);
                    } else {
                        $scope.progress = false;
                        $scope.initting = false;
                        $scope.processData(resp.data);
                    }
                },
                    function () {
                        $scope.progress = false;
                    });
            };

            $scope.processData = function (d) {
                DataService.init();
                $scope.data = DataService.processSiteData(d);

                // now get it all going
                $scope.ready = true;

                $timeout(function () {
                    $scope.loadGraph = true;
                }, 100);
            };


        }]);
