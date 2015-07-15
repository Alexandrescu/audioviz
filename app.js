/** Initialize app */

(function(){
    var app = angular.module('audioViz', [
            'audioViz.controllers',
            'audioViz.services',
            'audioViz.directives'
    ]);

    angular.module('audioViz.controllers', [
            'audioViz.services'
    ]);

    angular.module('audioViz.services', [
            // add service specific depenencies here
    ]);

    angular.module('audioViz.directives', [
            // add service specific depenencies here
    ]);


    app.controller('MainController', ['$scope', 'audioAnalyserService', function($scope, audioAnalyserService){
        $scope.messageforyall = 'Look at the pretty picture'; 
        $scope.audioAnalyser = new audioAnalyserService.Analyser();
        $scope.audioAnalyser.loadSong('./app/debug/stendecklikefallingcrystals.mp3');
        //$scope.audioAnalyser.loadSong('./app/debug/uppermostflow.mp3');
    }])
    console.log('[LOG] Loaded App Module');
})();
