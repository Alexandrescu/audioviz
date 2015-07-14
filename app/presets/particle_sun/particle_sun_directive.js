(function(){
    angular.module('audioViz.directives').directive('audioVizParticleSunPreset', particleSunDirective);

    function particleSunDirective() {
        function link(scope, element, attrs) {
            console.log(scope.audioAnalyser);;
            console.log('[LOG] audioViz.directives.audioVizSpherePresetController linked');
        }
        return {
            controller: 'audioVizParticleSunController',
            link: link,
            restrict: 'E',
            scope: {
                audioAnalyser: '=?audioAnalyser'
            },
            templateUrl: 'app/presets/particle_sun/particle_sun_template.html',
        }
    }
    console.log('[LOG] Loaded audioViz.directives.audioVizParticleSunPreset');
})();
