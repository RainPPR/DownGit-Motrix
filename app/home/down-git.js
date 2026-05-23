/***********************************************************
* Developer: Minhas Kamal (minhaskamal024@gmail.com)       *
* Website: https://github.com/MinhasKamal/DownGit          *
* License: MIT License                                     *
* Modification: Custom Motrix Integration                 *
***********************************************************/

var downGitModule = angular.module('downGitModule', []);

downGitModule.factory('downGitService', [
    '$http',
    '$q',

    function ($http, $q) {
        var repoInfo = {};

        var parseInfo = function(parameters) {
            var repoPath = new URL(parameters.url).pathname;
            var splitPath = repoPath.split("/");
            var info = {};

            info.author = splitPath[1];
            info.repository = splitPath[2];
            info.branch = splitPath[4];

            info.rootName = splitPath[splitPath.length-1];
            if(!!splitPath[4]){
                info.resPath = repoPath.substring(
                    repoPath.indexOf(splitPath[4])+splitPath[4].length+1
                );
            }
            info.urlPrefix = "https://api.github.com/repos/"+
                info.author+"/"+info.repository+"/contents/";
            info.urlPostfix = "?ref="+info.branch;

            if(!parameters.fileName || parameters.fileName==""){
                info.downloadFileName = info.rootName;
            } else{
                info.downloadFileName = parameters.fileName;
            }

            if(parameters.rootDirectory=="false"){
                info.rootDirectoryName = "";

            } else if(!parameters.rootDirectory || parameters.rootDirectory=="" ||
                parameters.rootDirectory=="true"){
                info.rootDirectoryName = info.rootName+"/";

            } else{
                info.rootDirectoryName = parameters.rootDirectory+"/";
            }

            return info;
        }

        // Helper to construct authorization config for Github API calls
        var getHttpConfig = function(settings) {
            var config = {};
            if (settings && settings.githubToken) {
                config.headers = {
                    "Authorization": "token " + settings.githubToken
                };
            }
            return config;
        };

        // Determine if target URL is the Motrix Next custom Axum REST API (port 16801 or /add)
        var isMotrixNextRestApi = function(url) {
            if (!url) return false;
            return url.indexOf("/add") !== -1 || url.indexOf("16801") !== -1;
        };

        // Normalize RPC URLs automatically
        var getNormalizedRpcUrl = function(url) {
            if (!url) return "";
            url = url.trim();
            if (isMotrixNextRestApi(url)) {
                if (url.indexOf("/add") === -1) {
                    url = url.replace(/\/+$/, '') + '/add';
                }
            } else {
                if (url.indexOf("/jsonrpc") === -1) {
                    url = url.replace(/\/+$/, '') + '/jsonrpc';
                }
            }
            return url;
        };

        var downloadDir = function(progress, toastr, settings, parameters) {
            progress.isProcessing.val = true;
            progress.downloadedFiles.val = 0;
            progress.totalFiles.val = 0;

            var dirPaths = [];
            var filesToDownload = [];

            dirPaths.push(repoInfo.resPath);
            mapFileAndDirectory(dirPaths, filesToDownload, progress, toastr, settings, parameters);
        }

        var mapFileAndDirectory = function(dirPaths, filesToDownload, progress, toastr, settings, parameters) {
            $http.get(repoInfo.urlPrefix + dirPaths.pop() + repoInfo.urlPostfix, getHttpConfig(settings)).then(function(response) {
                for(var i=response.data.length-1; i>=0; i--){
                    if(response.data[i].type=="dir"){
                        dirPaths.push(response.data[i].path);
                    } else {
                        if(response.data[i].download_url){
                            filesToDownload.push({
                                path: response.data[i].path,
                                url: response.data[i].download_url
                            });
                            // Update dynamic scan state
                            progress.totalFiles.val = filesToDownload.length;
                        } else {
                            console.log(response.data[i]);
                        }
                    }
                }

                if(dirPaths.length<=0){
                    sendToMotrix(filesToDownload, progress, toastr, settings, parameters);
                } else{
                    mapFileAndDirectory(dirPaths, filesToDownload, progress, toastr, settings, parameters);
                }
            }, function(error) {
                console.error("Error fetching repository contents:", error);
                progress.isProcessing.val = false;
                var errMsg = "Failed to scan folder contents from GitHub API.";
                if (error.status === 403) {
                    errMsg += " Rate limit exceeded or access forbidden. Please configure a GitHub Token in settings.";
                }
                toastr.warning(errMsg, {iconClass: 'toast-down', timeOut: 8000});
            });
        }

        // Main logic to dispatch multiple download tasks directly to Motrix Next
        var sendToMotrix = function(filesToDownload, progress, toastr, settings, parameters) {
            if (filesToDownload.length === 0) {
                progress.isProcessing.val = false;
                toastr.warning("No files found to download!", {iconClass: 'toast-down'});
                return;
            }

            progress.isProcessing.val = true;
            progress.downloadedFiles.val = 0;
            progress.totalFiles.val = filesToDownload.length;

            var rpcPromises = [];
            var isNext = isMotrixNextRestApi(settings.motrixRpcUrl);
            var postUrl = getNormalizedRpcUrl(settings.motrixRpcUrl);

            angular.forEach(filesToDownload, function(file) {
                // Calculate output relative path preserving folder structures
                var relativePath = repoInfo.rootDirectoryName + file.path.substring(decodeURI(repoInfo.resPath).length + 1);
                var finalOut = settings.motrixSubdir ? (settings.motrixSubdir.replace(/\/+$/, '') + '/' + relativePath) : relativePath;

                var promise;

                if (isNext) {
                    // Use Motrix Next HTTP REST API
                    var config = {
                        headers: { "Content-Type": "application/json" }
                    };
                    if (settings.motrixRpcSecret) {
                        config.headers["Authorization"] = "Bearer " + settings.motrixRpcSecret;
                    }

                    var requestData = {
                        "url": file.url,
                        "filename": finalOut,
                        "referer": (settings.enableCustomHeaders && settings.customReferer) ? settings.customReferer : parameters.url
                    };
                    if (settings.enableCustomHeaders && settings.customCookie) {
                        requestData.cookie = settings.customCookie;
                    }

                    promise = $http.post(postUrl, requestData, config).then(function(response) {
                        progress.downloadedFiles.val++;
                    }, function(err) {
                        console.error("HTTP error sending to Motrix Next REST API:", err);
                        throw err;
                    });
                } else {
                    // Use standard JSON-RPC
                    var rpcOptions = {
                        "out": finalOut,
                        "user-agent": (settings.enableCustomHeaders && settings.customUserAgent) ? settings.customUserAgent : navigator.userAgent,
                        "referer": (settings.enableCustomHeaders && settings.customReferer) ? settings.customReferer : parameters.url
                    };

                    var headersArray = [];
                    if (settings.enableCustomHeaders && settings.customCookie) {
                        headersArray.push("Cookie: " + settings.customCookie);
                    }
                    if (settings.githubToken) {
                        headersArray.push("Authorization: token " + settings.githubToken);
                    }
                    if (headersArray.length > 0) {
                        rpcOptions.header = headersArray;
                    }

                    var rpcData = {
                        "jsonrpc": "2.0",
                        "id": "downgit-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9),
                        "method": "aria2.addUri",
                        "params": []
                    };

                    if (settings.motrixRpcSecret) {
                        rpcData.params.push("token:" + settings.motrixRpcSecret);
                    }
                    rpcData.params.push([file.url]);
                    rpcData.params.push(rpcOptions);

                    promise = $http.post(postUrl, rpcData).then(function(response) {
                        if (response.data.error) {
                            console.error("Motrix RPC error:", response.data.error);
                            throw new Error(response.data.error.message || "RPC error");
                        }
                        progress.downloadedFiles.val++;
                    }, function(err) {
                        console.error("HTTP error sending to Motrix JSON-RPC:", err);
                        throw err;
                    });
                }

                rpcPromises.push(promise);
            });

            // Wait for all RPC calls to resolve
            $q.all(rpcPromises).then(function() {
                progress.isProcessing.val = false;
                toastr.success("All " + filesToDownload.length + " tasks sent to Motrix successfully!", {iconClass: 'toast-down'});
            }, function(err) {
                progress.isProcessing.val = false;
                toastr.error("Failed to send tasks to Motrix. Make sure Motrix is running and RPC credentials are correct.", {
                    iconClass: 'toast-down',
                    timeOut: 8000
                });
            });
        };

        // Main logic to dispatch a single file download task directly to Motrix Next
        var downloadFile = function (url, progress, toastr, settings, parameters) {
            progress.isProcessing.val = true;
            progress.downloadedFiles.val = 0;
            progress.totalFiles.val = 1;

            var finalOut = settings.motrixSubdir ? (settings.motrixSubdir.replace(/\/+$/, '') + '/' + repoInfo.downloadFileName) : repoInfo.downloadFileName;
            var isNext = isMotrixNextRestApi(settings.motrixRpcUrl);
            var postUrl = getNormalizedRpcUrl(settings.motrixRpcUrl);

            if (isNext) {
                // Use Motrix Next HTTP REST API
                var config = {
                    headers: { "Content-Type": "application/json" }
                };
                if (settings.motrixRpcSecret) {
                    config.headers["Authorization"] = "Bearer " + settings.motrixRpcSecret;
                }

                var requestData = {
                    "url": url,
                    "filename": finalOut,
                    "referer": (settings.enableCustomHeaders && settings.customReferer) ? settings.customReferer : parameters.url
                };
                if (settings.enableCustomHeaders && settings.customCookie) {
                    requestData.cookie = settings.customCookie;
                }

                $http.post(postUrl, requestData, config).then(function(response) {
                    progress.downloadedFiles.val = 1;
                    progress.isProcessing.val = false;
                    toastr.success("Task sent to Motrix Next successfully!", {iconClass: 'toast-down'});
                }, function(err) {
                    console.error("Failed to send task to Motrix Next REST API:", err);
                    toastr.error("Failed to connect to Motrix Next. Ensure the app is running and RPC configurations are correct.", {
                        iconClass: 'toast-down',
                        timeOut: 8000
                    });
                    progress.isProcessing.val = false;
                });
            } else {
                // Use standard JSON-RPC
                var rpcOptions = {
                    "out": finalOut,
                    "user-agent": (settings.enableCustomHeaders && settings.customUserAgent) ? settings.customUserAgent : navigator.userAgent,
                    "referer": (settings.enableCustomHeaders && settings.customReferer) ? settings.customReferer : parameters.url
                };

                var headersArray = [];
                if (settings.enableCustomHeaders && settings.customCookie) {
                    headersArray.push("Cookie: " + settings.customCookie);
                }
                if (settings.githubToken) {
                    headersArray.push("Authorization: token " + settings.githubToken);
                }
                if (headersArray.length > 0) {
                    rpcOptions.header = headersArray;
                }

                var rpcData = {
                    "jsonrpc": "2.0",
                    "id": "downgit-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9),
                    "method": "aria2.addUri",
                    "params": []
                };

                if (settings.motrixRpcSecret) {
                    rpcData.params.push("token:" + settings.motrixRpcSecret);
                }
                rpcData.params.push([url]);
                rpcData.params.push(rpcOptions);

                $http.post(postUrl, rpcData).then(function(response) {
                    if (response.data.error) {
                        console.error("Motrix RPC error:", response.data.error);
                        toastr.error("Motrix RPC error: " + response.data.error.message, {iconClass: 'toast-down'});
                        progress.isProcessing.val = false;
                    } else {
                        progress.downloadedFiles.val = 1;
                        progress.isProcessing.val = false;
                        toastr.success("Task sent to Motrix successfully!", {iconClass: 'toast-down'});
                    }
                }, function(err) {
                    console.error("Failed to send task to Motrix JSON-RPC:", err);
                    toastr.error("Failed to connect to Motrix. Ensure the app is running and RPC configurations are correct.", {
                        iconClass: 'toast-down',
                        timeOut: 8000
                    });
                    progress.isProcessing.val = false;
                });
            }
        }

        return {
            downloadZippedFiles: function(parameters, progress, toastr, settings) {
                repoInfo = parseInfo(parameters);

                if(!repoInfo.resPath || repoInfo.resPath==""){
                    if(!repoInfo.branch || repoInfo.branch==""){
                        repoInfo.branch="master";
                    }

                    var downloadUrl = "https://github.com/"+repoInfo.author+"/"+
                        repoInfo.repository+"/archive/"+repoInfo.branch+".zip";

                    // Send whole repo zip URL to Motrix
                    downloadFile(downloadUrl, progress, toastr, settings, parameters);

                } else {
                    $http.get(repoInfo.urlPrefix+repoInfo.resPath+repoInfo.urlPostfix, getHttpConfig(settings)).then(function(response) {
                        if(response.data instanceof Array){
                            downloadDir(progress, toastr, settings, parameters);
                        }else{
                            downloadFile(response.data.download_url, progress, toastr, settings, parameters);
                        }

                    }, function(error) {
                        console.log("probable big file or nested path issue, trying fallback raw download.");
                        downloadFile("https://raw.githubusercontent.com/"+repoInfo.author+"/"+
                                repoInfo.repository+"/"+repoInfo.branch+"/"+repoInfo.resPath,
                                progress, toastr, settings, parameters);
                    });
                }
            },
        };
    }
]);
