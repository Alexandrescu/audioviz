(function(){
    angular.module('audioViz.directives').directive('audioVizSpherePreset', spherePresetDirective);

    function spherePresetDirective() {
        function link(scope, element, attrs) {
            console.log(scope.audioAnalyser);;
            console.log('[LOG] audioViz.directives.audioVizSpherePreset linked');
        }
        return {
            controller: 'audioVizSpherePresetController',
            link: link,
            restrict: 'E',
            scope: {
                audioAnalyser: '=?audioAnalyser'
            },
            template: '<div> asdf </div>',
        }
    }
    console.log('[LOG] Loaded audioViz.directives.audioVizSpherePreset');
})();
