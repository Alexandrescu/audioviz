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


        var shaders = {
            simVelocityVertexShader: {
                url: 'app/presets/particle_sun/shaders/sim_vertex.c',
                shader: null
            },
            simVelocityFragmentShader: {
                url: 'app/presets/particle_sun/shaders/sim_velocity_frag.c',
                shader: null
            },
            simPositionVertexShader: {
                url: 'app/presets/particle_sun/shaders/sim_vertex.c',
                shader: null
            },
            simPositionFragmentShader: {
                url: 'app/presets/particle_sun/shaders/sim_pos_frag.c',
                shader: null
            }
        };

        function getShaders() {
            var done = true;
            for (var shaderName in shaders) {
                if (shaders.hasOwnProperty(shaderName)) {
                    if (!shaders[shaderName].shader) {
                        var p = $http.get(shaders[shaderName].url);
                        p.success(function(resp) {
                            console.log('[LOG] Loaded shader: ' + shaderName);
                            shaders[shaderName].shader = resp;
                            getShaders();
                        });
                        done = false;
                        break;
                    }

                }
            }
            if (done) {
                start();
            }
        }

        getShaders();

        function start(){
            console.log('[LOG] Playing with particles now');
            var camera, scene;
            var geometry, material, mesh, mesh2, material2;
            var texSize = 1024;
            var dispSize = {x:window.innerWidth, y:window.innerHeight};
            var velocities, positions;
            var positionTexture, velocityTexture;
            var velocitySimShader, positionSimShader;
            var rtTexturePos, rtTexturePos2;
            var fboParticles;
            var renderer = new THREE.WebGLRenderer();
            var timer=0;
            var stats;
            function updateSphere(audioData) {
                var max_level = 0; 
                var levels = [];
                for (var level in audioData) {
                    levels.push(audioData[level]);
                    if (audioData[level] > max_level) {
                        max_level = audioData[level];
                    }
                }
                levels.sort();
                velocitySimShader.uniforms.multiplier.value = levels[levels.length-2] * 1.1;

                var tlevels = [];
                for (var level in audioData) {
                    tlevels.push(audioData[level]);
                }

                velocitySimShader.uniforms.audioLevels.value = tlevels;
            }
            function init() {
                camera = new THREE.PerspectiveCamera(15, window.innerWidth / window.innerHeight, 1, 1000000);
                camera.position.z = 60;

                scene = new THREE.Scene();

                // Initialie positions to a cube
                var positions = new Float32Array( texSize * texSize * 3 );
                var velocities = new Float32Array( texSize * texSize * 3 );
                for (var i=0; i < positions.length; i+=3) {
                    positions[i] = (Math.random() - .5) * .5 ;
                    positions[i+1] = (Math.random() - .5) * .5 ;
                    positions[i+2] = (Math.random() - .5) * .5 ;
                    velocities[i] = 0.0;
                    velocities[i+1] = 0.0;
                    velocities[i+2] = 0.0;
                }

                // Calcultes the change in velocity & outputs it out 
                velocityTexture = new THREE.DataTexture(velocities, texSize, texSize, THREE.RGBFormat, THREE.FloatType);
                velocityTexture.minFilter = THREE.NearestFilter;
                velocityTexture.magFilter = THREE.NearestFilter;
                velocityTexture.needsUpdate = true;

                // outputs data no
                positionTexture = new THREE.DataTexture(positions, texSize, texSize, THREE.RGBFormat, THREE.FloatType);
                positionTexture.minFilter = THREE.NearestFilter;
                positionTexture.magFilter = THREE.NearestFilter;
                positionTexture.needsUpdate = true;



                // Following two textures are for rendering. 
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

                rtTextureVel = new THREE.WebGLRenderTarget(texSize, texSize, {
                    wrapS:THREE.RepeatWrapping,
                    wrapT:THREE.RepeatWrapping,
                    minFilter: THREE.NearestFilter,
                    magFilter: THREE.NearestFilter,
                    format: THREE.RGBFormat,
                    type:THREE.FloatType,
                    stencilBuffer: false
                });
                rtTextureVel2 = rtTextureVel.clone();
                velocitySimShader = new THREE.ShaderMaterial({
                    uniforms: {
                        audioLevels: { type: "fv1", value: [1, 0.5, 3, 2]},
                        multiplier: { type: "f", value: 0.0},
                        origin: { type: "t", value: positionTexture },
                        timer: { type: "f", value: 0},
                        tPositions: { type: "t", value: positionTexture },
                        tVelocities: { type: "t", value: velocityTexture },
                        randomNum: {type : "f", value: 0.02},
                        rotation: {type : "f", value: 0.00}
                    },
                    vertexShader: shaders.simVelocityVertexShader.shader,
                    fragmentShader: shaders.simVelocityFragmentShader.shader
                });

                positionSimShader = new THREE.ShaderMaterial({
                    uniforms: {
                        audioLevels: { type: "t", value: null },
                        multiplier: { type: "f", value: 0.0},
                        origin: { type: "t", value: positionTexture },
                        timer: { type: "f", value: 0},
                        tPositions: { type: "t", value: positionTexture },
                        tVelocities: { type: "t", value: velocityTexture },
                    },
                    vertexShader: shaders.simPositionVertexShader.shader,
                    fragmentShader: shaders.simPositionFragmentShader.shader
                })

                fboParticleVelocities = new THREE.FBOUtils( texSize, renderer, velocitySimShader );
                fboParticleVelocities.in = rtTextureVel;
                fboParticleVelocities.out = rtTextureVel2;

                fboParticlePositions = new THREE.FBOUtils( texSize, renderer, positionSimShader );
                fboParticlePositions.renderToTexture(rtTexturePos, rtTexturePos2);
                fboParticlePositions.in = rtTexturePos;
                fboParticlePositions.out = rtTexturePos2;

                geometry2 = new THREE.Geometry();

                for ( var i = 0, l = texSize * texSize; i < l; i ++ ) {
                    var vertex = new THREE.Vector3();
                    vertex.x = ( i % texSize ) / texSize ;
                    vertex.y = Math.floor( i / texSize ) / texSize;
                    geometry2.vertices.push( vertex );
                }

                material2 = new THREE.ShaderMaterial( {
                    uniforms: {
                        "map": { type: "t", value: rtTexturePos },
                        "width": { type: "f", value: texSize },
                        "height": { type: "f", value: texSize },
                        "pointSize": { type: "f", value: 0.0 },
                        "effector" : { type: "f", value: 0 },
                        "rotation" : {type: "f", value: 0.0}
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
            var diff = Math.PI / 2000; 
            function animate(t) {
                requestAnimationFrame(animate);
                // color it!
                material2.uniforms.rotation.value = angle;

                //console.log('[LOG] Calculating velocities...');
                // Calculate the new particle velocities
                velocitySimShader.uniforms.timer.value = t;
                var tmp = fboParticleVelocities.in;
                fboParticleVelocities.in = fboParticleVelocities.out;
                fboParticleVelocities.out = tmp;
                velocitySimShader.uniforms.tVelocities.value = fboParticleVelocities.in;
                velocitySimShader.uniforms.tPositions.value = fboParticlePositions.out;
                velocitySimShader.uniforms.randomNum.value = (Math.random() - 0.5) * 0.005;
                velocitySimShader.uniforms.rotation.value = angle;
                fboParticleVelocities.simulate(fboParticleVelocities.out);
                //console.log('[LOG] Calculating velocities... done');
                //


                //console.log('[LOG] Calculating positions...');
                // Calculate new positions
                positionSimShader.uniforms.timer.value = t;
                var tmp = fboParticlePositions.in;
                fboParticlePositions.in = fboParticlePositions.out;
                fboParticlePositions.out = tmp;
                positionSimShader.uniforms.tPositions.value = fboParticlePositions.in;
                positionSimShader.uniforms.tVelocities.value = fboParticleVelocities.out;
                fboParticlePositions.simulate(fboParticlePositions.out);
                //console.log('[LOG] Calculating positions... done');

                angle += diff;

                material2.uniforms.map.value = fboParticlePositions.out;
                controls.update();
                renderer.render( scene, camera );
            }


            init();
            animate(new Date().getTime());
        }
    }
    console.log('[LOG] Loaded audioViz.directives.audioVizSpherePresetController');
})();

