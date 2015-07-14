(function() {
    angular.module('audioViz.directives').controller('audioVizParticleSunController', 
            ['$scope', 'audioAnalyserService', '$http', particleSunPresetController]);
    function particleSunPresetController($scope, audioAnalyserService, $http){

        function getRandomPoint(low_angle, diff) {
            var m = Math.random() * diff  + low_angle;
            return {
                x: Math.sin(m),
                y: Math.cos(m)
            }
        }

        function getColor(angle) {
            var f = angle / (Math.PI * 2) * 6;
            var R = Math.sin(f + 0) * 127 + 128;
            var G = Math.sin(f + 2 * (Math.PI / 3)) * 127 + 128;
            var B = Math.sin(f + 4 * (Math.PI / 3)) * 127 + 128;
            return new THREE.Color (R / 255, G / 255, B / 255);
        }

        var simVertexShader;
        var simFragmentShader;

        console.log('[LOG] audioViz.directives.audioVizSpherePresetController loading shaders');

        // Async load the shader files for the simulation
        var vertexShaderPromise = $http.get('app/presets/particle_sun/shaders/sim_vertex.c');
        vertexShaderPromise.success(function(resp) {
            simVertexShader = resp;
            var fragmentShaderPromise = $http.get('app/presets/particle_sun/shaders/sim_fragment.c');
            fragmentShaderPromise.success(function(resp) {
                simFragmentShader = resp;
                start();
            })
        });
       
        function start(){
            console.log('[LOG] Playing with particles now');
            var camera, scene;
            var geometry, material, mesh, mesh2, material2;
            var texSize = 1024;
            var dispSize = {x:window.innerWidth, y:window.innerHeight};
            var data;
            var texture;
            var simulationShader;
            var rtTexturePos, rtTexturePos2;
            var fboParticles;
            var renderer = new THREE.WebGLRenderer();
            var timer=0;
            var stats;
            function updateSphere(audioData) {
                var max_level = 0; 
                var levels = [];
                var c = 0;
                for (var level in audioData) {
                    levels.push(audioData[level]);
                    if (audioData[level] > max_level) {
                        max_level = audioData[level];
                    }
                }
                levels.sort();
                simulationShader.uniforms.multiplier.value = levels[levels.length-2] * 1.1;
            }
            function init() {
                camera = new THREE.PerspectiveCamera(15, window.innerWidth / window.innerHeight, 1, 10000);
                camera.position.z = 2;

                scene = new THREE.Scene();

                // INIT FBO
                var data = new Float32Array( texSize * texSize * 3 );
                for (var i=0; i<data.length; i+=3){
                    data[i] = (Math.random() - .5) * .5 ;
                    data[i+1] = (Math.random() - .5) * .5 ;
                    data[i+2] = (Math.random() - .5) * .5 ;
                }
                texture = new THREE.DataTexture( data, texSize, texSize, THREE.RGBFormat, THREE.FloatType );
                texture.minFilter = THREE.NearestFilter;
                texture.magFilter = THREE.NearestFilter;
                texture.needsUpdate = true;

                rtTexturePos = new THREE.WebGLRenderTarget(texSize, texSize, {
                    wrapS:THREE.RepeatWrapping,
                    wrapT:THREE.RepeatWrapping,
                    minFilter: THREE.NearestFilter,
                    magFilter: THREE.NearestFilter,
                    format: THREE.RGBFormat,
                    type:THREE.FloatType,
                    stencilBuffer: false
                });

                rtTexturePos2 = rtTexturePos.clone();

                simulationShader = new THREE.ShaderMaterial({

                    uniforms: {
                        tPositions: { type: "t", value: texture },
                        origin: { type: "t", value: texture },
                        timer: { type: "f", value: 0},
                        multiplier: { type: "f", value: 0.0}
                    },

                    vertexShader: simVertexShader,
                    fragmentShader: simFragmentShader

                });

                fboParticles = new THREE.FBOUtils( texSize, renderer, simulationShader );
                fboParticles.renderToTexture(rtTexturePos, rtTexturePos2);

                fboParticles.in = rtTexturePos;
                fboParticles.out = rtTexturePos2;

                geometry2 = new THREE.Geometry();

                for ( var i = 0, l = texSize * texSize; i < l; i ++ ) {

                    var vertex = new THREE.Vector3();
                    //vertex.set(Math.random(), Math.random(), Math.random());
                    vertex.x = ( i % texSize ) / texSize ;
                    vertex.y = Math.floor( i / texSize ) / texSize;
                    geometry2.vertices.push( vertex );
                }

                material2 = new THREE.ShaderMaterial( {

                    uniforms: {

                        "map": { type: "t", value: rtTexturePos },
                        "width": { type: "f", value: texSize },
                        "height": { type: "f", value: texSize },
                        "pointSize": { type: "f", value: 3 },
                        "effector" : { type: "f", value: 0 },
                        "color" : {type: "c", value: new THREE.Color(0.2, 0.3, 0.1)}

                    },
                    vertexShader: document.getElementById('fboRenderVert').innerHTML,
                    fragmentShader: document.getElementById('fboRenderFrag').innerHTML,
                    depthTest: true,
                    transparent: true,
                    blending: THREE.AdditiveBlending
                } );

                mesh2 = new THREE.PointCloud( geometry2, material2 );
                scene.add( mesh2 );

                controls = new THREE.OrbitControls( camera, renderer.domElement );
                renderer.setSize(window.innerWidth, window.innerHeight);
                document.body.appendChild(renderer.domElement);

                var audioListener = {
                    notify : function(audioData) {
                        updateSphere(audioData);
                    }
                }
                $scope.audioAnalyser.addListener(audioListener);
                $scope.audioAnalyser.playSong();

            }

            var angle = 0;
            var diff = Math.PI / 1000; 
            function animate(t) {
                requestAnimationFrame(animate);

                simulationShader.uniforms.timer.value = t;
                material2.uniforms.color.value = getColor(angle);
                // swap
                var tmp = fboParticles.in;
                fboParticles.in = fboParticles.out;
                fboParticles.out = tmp;

                angle += diff;

                simulationShader.uniforms.tPositions.value = fboParticles.in;
                fboParticles.simulate(fboParticles.out);
                material2.uniforms.map.value = fboParticles.out;
                controls.update();
                renderer.render( scene, camera );
            }


            init();
            animate(new Date().getTime());
        }
    }
    console.log('[LOG] Loaded audioViz.directives.audioVizSpherePresetController');
})();

