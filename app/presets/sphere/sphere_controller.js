(function() {
    angular.module('audioViz.directives').controller('audioVizSpherePresetController', ['$scope', 'audioAnalyserService',  spherePresetController]);
    function spherePresetController($scope, audioAnalyserService){



        var SCREEN_WIDTH = window.innerWidth,
        SCREEN_HEIGHT = window.innerHeight,

        mouseX = 0, mouseY = 0,

        windowHalfX = window.innerWidth / 2,
        windowHalfY = window.innerHeight / 2,

        SEPARATION = 200,
        AMOUNTX = 10,
        AMOUNTY = 10,

        camera, scene, renderer;

        init();
        animate();
        
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

        function init() {
            function getInitialSphere() {
                var sphere = {};
                var LEVELS = audioAnalyserService.LEVELS;
                var PI2 = 2 * Math.PI;
                for (var j = 0; j != LEVELS.length; j++) {
                    var angleRange = {
                        low: (PI2 / LEVELS.length) * j,
                        diff: (PI2 / LEVELS.length) ,
                    }

                    sphere[LEVELS[j]] = {
                        particles: [],
                        lines: [],
                        material: new THREE.SpriteCanvasMaterial( {
                            color: getColor(angleRange.low),
                            program: function ( context ) {
                                context.beginPath();
                                context.arc( 0, 0, 0.5, 0, PI2, true );
                                context.fill();
                            }
                        })
                    };
                    for (var i = 0; i < 25; i++) {
                        particle = new THREE.Sprite( sphere[LEVELS[j]].material );
                        var randPos = getRandomPoint(angleRange.low, angleRange.diff);
                        particle.position.x = randPos.x;
                        particle.position.y = randPos.y;
                        particle.position.z = (Math.random() * 2 - 1) * 2;
                        particle.position.normalize();
                        particle.oldPosition = particle.position.clone();
                        particle.position.multiplyScalar( Math.random() * 20 + 250 );
                        particle.scale.multiplyScalar( 2 );
                        sphere[LEVELS[j]].particles.push(particle);
                    }

                    for (var i = 0; i < 10; i++) {
                        var geometry = new THREE.Geometry();
                        var randPos = getRandomPoint(angleRange.low, angleRange.diff);
                        var vertex = new THREE.Vector3(randPos.x, randPos.y, (Math.random() * 2 - 1) * 2);
                        vertex.normalize();
                        vertex.multiplyScalar( 250 );

                        geometry.vertices.push( vertex );

                        var vertex2 = vertex.clone();
                        vertex2.multiplyScalar( Math.random() * 0.1 + 1 );

                        geometry.vertices.push( vertex2 );

                        var line = new THREE.Line( geometry, new THREE.LineBasicMaterial( { color: sphere[LEVELS[j]].material.color, opacity: Math.random() } ) );
                        line.oldvertex2 = vertex2.clone();
                        sphere[LEVELS[j]].lines.push( line );
                    }
                }
                return sphere;
            }
            function updateSphere(audioData) {
                for (var level in audioData) {
                    if (!$scope.sphere[level]) {
                        continue;
                    }
                    $scope.sphere[level].lines.map(function(line) {
                        var vertex2 = line.oldvertex2.clone();
                        vertex2.multiplyScalar(audioData[level] * .3 + 1);
                        line.geometry.vertices[0] = vertex2;
                    })
                    $scope.sphere[level].particles.map(function(particle) {
                        var pos = particle.oldPosition.clone();
                        pos.multiplyScalar(audioData[level] * 40  + 230);
                        particle.position.x = pos.x;
                        particle.position.y = pos.y;
                        particle.position.z = pos.z;
                    })
                }
            }


            // Hack to create the div for now because we are LAZY hoes
            container = document.createElement('div');
            document.body.appendChild(container);

            camera = new THREE.PerspectiveCamera( 75, SCREEN_WIDTH / SCREEN_HEIGHT, 1, 10000 );
            camera.position.z = 1000;

            $scope.scene = new THREE.Scene();

            renderer = new THREE.CanvasRenderer();
            renderer.setPixelRatio( window.devicePixelRatio );
            renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
            container.appendChild( renderer.domElement );

            var PI2 = Math.PI * 2;

            $scope.sphere = getInitialSphere();
            for (var level in $scope.sphere) {
                if ($scope.sphere.hasOwnProperty(level)) {
                    var section = $scope.sphere[level];

                    section.particles.map(function(particle){
                        $scope.scene.add(particle);
                    });
                    section.lines.map(function(line){
                        $scope.scene.add(line);
                    });
                }
            }

            // lines
            document.addEventListener( 'mousemove', onDocumentMouseMove, false );
            document.addEventListener( 'touchstart', onDocumentTouchStart, false );
            document.addEventListener( 'touchmove', onDocumentTouchMove, false );

            //

            window.addEventListener( 'resize', onWindowResize, false );
            var audioListener = {
                notify : function(audioData) {
                    updateSphere(audioData);
                }
            }
            $scope.audioAnalyser.addListener(audioListener);
            $scope.audioAnalyser.playSong();

        }

        function onWindowResize() {

            windowHalfX = window.innerWidth / 2;
            windowHalfY = window.innerHeight / 2;

            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();

            renderer.setSize( window.innerWidth, window.innerHeight );

        }

        //

        function onDocumentMouseMove(event) {

            mouseX = event.clientX - windowHalfX;
            mouseY = event.clientY - windowHalfY;
        }

        function onDocumentTouchStart( event ) {

            if ( event.touches.length > 1 ) {

                event.preventDefault();

                mouseX = event.touches[ 0 ].pageX - windowHalfX;
                mouseY = event.touches[ 0 ].pageY - windowHalfY;

            }

        }

        function onDocumentTouchMove( event ) {

            if ( event.touches.length == 1 ) {

                event.preventDefault();

                mouseX = event.touches[ 0 ].pageX - windowHalfX;
                mouseY = event.touches[ 0 ].pageY - windowHalfY;

            }

        }

        //

        function animate() {

            requestAnimationFrame( animate );

            render();

        }

        function render() {

            camera.position.x += ( mouseX - camera.position.x ) * .55;
            camera.position.y += ( - mouseY + 200 - camera.position.y ) * .55;
            camera.lookAt( $scope.scene.position );

            renderer.render( $scope.scene, camera );
        }
        console.log('[LOG] audioViz.directives.audioVizSpherePresetController loaded');
    }
    console.log('[LOG] Loaded audioViz.directives.spherePresetController');
})();

