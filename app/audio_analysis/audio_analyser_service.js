(function(){
    angular.module('audioViz.services').service('audioAnalyserService', ['$http', service]);
    function service($http) {
        var LEVELS = [];
        for (var i = 0; i < 86; ++i) {
            LEVELS.push(i.toString());
        }

        function Analyser() {
            this.audioContext = new window.AudioContext ();
            this.listeners = [];
        }

        Analyser.prototype.loadSong = function(file_location) {

            var self = this;

            var request = new XMLHttpRequest();
            request.open('GET', file_location, true);
            request.responseType = 'arraybuffer';

            // Decode asynchronously
            request.onload = function() {
                self.audioContext.decodeAudioData(request.response, function(buffer) {
                    self.audioBuffer = buffer;
                    if (self.playSongRequested) {
                        self.playSong();
                    }
                }, null);
            }
            request.send();
        }

        Analyser.prototype.playSong = function () {
            var self = this;
            if (!self.audioBuffer) {
                self.playSongRequested = true;
                return;
            }
            self.source = self.audioContext.createBufferSource();
            self.source.buffer = self.audioBuffer;
            self.analyser = self.audioContext.createAnalyser();
            self.analyser.fftSize = 256;

            self.source.connect(self.analyser);
            self.analyser.connect(self.audioContext.destination);
            self.source.start(0);
            function mockPlaySong() {
                self.notifyListeners(self.getAudioData());

                setTimeout(function(){
                    mockPlaySong();
                }, 1);
            }
            mockPlaySong();
        }

        Analyser.prototype.addListener = function(listener) {
            this.listeners.push(listener);

        }

        Analyser.prototype.notifyListeners = function (data) {
            this.listeners.map(function(listener) {
                listener.notify(data);
            })
        }

        Analyser.prototype.getAudioData = function() {
            var analyser = this.analyser;
            var bufferLength = analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.analyser.getByteFrequencyData(this.dataArray);

            var barHeight;

            var audioData = {};
            for(var i = 0; i < bufferLength; i++) {
                barHeight = this.dataArray[i];
                audioData[LEVELS[i]] = barHeight / 60;
            }
            return audioData;
        }

        return {
            Analyser: Analyser,
            LEVELS: LEVELS
        }

    }
    console.log('[LOG] Loaded audioViz.services.audioAnalyserService');
})();
