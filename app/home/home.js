/***********************************************************
* Developer: Minhas Kamal (minhaskamal024@gmail.com)       *
* Website: https://github.com/MinhasKamal/DownGit          *
* License: MIT License                                     *
* Modification: Custom Motrix Integration                 *
***********************************************************/

var homeModule = angular.module('homeModule', [
    'ngRoute',
    'downGitModule',
]);

homeModule.config([
    '$routeProvider',

    function ($routeProvider) {
        $routeProvider
            .when('/home', {
                templateUrl: 'app/home/home.html',
                controller: [
                '$scope',
                '$routeParams',
                '$location',
                'toastr',
                'downGitService',

                function($scope, $routeParams, $location, toastr, downGitService) {
                    $scope.downUrl = "";
                    $scope.url = "";
                    $scope.isProcessing = {val: false};
                    $scope.downloadedFiles = {val: 0};
                    $scope.totalFiles = {val: 0};
                    
                    // UI State
                    $scope.isSettingsExpanded = false;

                    // Standard template URLs
                    var templateUrl = "https?://github.com/.+/.+";
                    var downloadUrlInfix = "#/home?url=";
                    // Standard prefix using origin for portability
                    var downloadUrlPrefix = window.location.origin + window.location.pathname + downloadUrlInfix;

                    // Load Settings from LocalStorage
                    var defaultSettings = {
                        motrixRpcUrl: "http://localhost:16800/jsonrpc",
                        motrixRpcSecret: "",
                        motrixSubdir: "",
                        githubToken: "",
                        enableCustomHeaders: false,
                        customUserAgent: navigator.userAgent,
                        customReferer: "",
                        customCookie: ""
                    };

                    try {
                        var storedSettings = localStorage.getItem("downgit_motrix_settings");
                        $scope.settings = storedSettings ? angular.extend({}, defaultSettings, JSON.parse(storedSettings)) : defaultSettings;
                    } catch (e) {
                        console.error("Failed to load settings from localStorage", e);
                        $scope.settings = defaultSettings;
                    }

                    // Watch settings and save to localStorage
                    $scope.$watch('settings', function(newVal, oldVal) {
                        if (newVal) {
                            try {
                                localStorage.setItem("downgit_motrix_settings", JSON.stringify(newVal));
                            } catch (e) {
                                console.error("Failed to save settings to localStorage", e);
                            }
                        }
                    }, true);

                    $scope.toggleSettings = function() {
                        $scope.isSettingsExpanded = !$scope.isSettingsExpanded;
                    };

                    $scope.catchEnter = function(keyEvent) {
                        if (keyEvent.which == 13) {
                            $scope.download();
                        }
                    };

                    $scope.createDownLink = function() {
                        $scope.downUrl = "";

                        if (!$scope.url) {
                            toastr.warning("Please enter a GitHub URL!", {iconClass: 'toast-down'});
                            return;
                        }

                        if ($scope.url.match(templateUrl)) {
                            $scope.downUrl = downloadUrlPrefix + encodeURIComponent($scope.url);
                            toastr.success("Link generated!", {iconClass: 'toast-down'});
                        } else {
                            toastr.warning("Invalid GitHub URL!", {iconClass: 'toast-down'});
                        }
                    };

                    $scope.download = function() {
                        $scope.downUrl = "";

                        if (!$scope.url) {
                            toastr.warning("Please enter a GitHub URL!", {iconClass: 'toast-down'});
                            return;
                        }

                        if ($scope.url.match(templateUrl)) {
                            var parameter = {
                                url: $scope.url,
                                fileName: $routeParams.fileName || "",
                                rootDirectory: $routeParams.rootDirectory || "true"
                            };
                            var progress = {
                                isProcessing: $scope.isProcessing,
                                downloadedFiles: $scope.downloadedFiles,
                                totalFiles: $scope.totalFiles
                            };

                            toastr.info("Connecting to Motrix...", {iconClass: 'toast-down', timeOut: 2000});
                            
                            downGitService.downloadZippedFiles(parameter, progress, toastr, $scope.settings);
                        } else {
                            toastr.warning("Invalid GitHub URL!", {iconClass: 'toast-down'});
                        }
                    };

                    // Initial Routing Trigger
                    if ($routeParams.url) {
                        $scope.url = decodeURIComponent($routeParams.url);
                        // Trigger download on load
                        $scope.download();
                    }
                }],
            });
    }
]);
