 // =========================================================================
        // MODULE 2: WigglyAudio.js (Sound Synthesizer)
        // =========================================================================
        class WigglyAudioModule {
            constructor() {
                this.audioCtx = null;
                this.lastSqueakTime = 0;
            }

            init() {
                if (!this.audioCtx) {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    if (AudioContext) this.audioCtx = new AudioContext();
                }
            }

            play(type) {
                const toggle = document.getElementById('sound-toggle');
                if (toggle && !toggle.checked) return;

                if (type === 'squeak') {
                    const nowMs = performance.now();
                    if (nowMs - this.lastSqueakTime < 80) return;
                    this.lastSqueakTime = nowMs;
                }

                this.init();
                if (!this.audioCtx) return;

                try {
                    const osc = this.audioCtx.createOscillator();
                    const gain = this.audioCtx.createGain();
                    osc.connect(gain);
                    gain.connect(this.audioCtx.destination);

                    const now = this.audioCtx.currentTime;

                    if (type === 'pop') {
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(400, now);
                        osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
                        gain.gain.setValueAtTime(0.15, now);
                        gain.gain.linearRampToValueAtTime(0.01, now + 0.05);
                        osc.start(now);
                        osc.stop(now + 0.05);
                    } else if (type === 'squeak') {
                        osc.type = 'triangle';
                        osc.frequency.setValueAtTime(600 + Math.random() * 200, now);
                        gain.gain.setValueAtTime(0.03, now);
                        gain.gain.linearRampToValueAtTime(0.001, now + 0.03);
                        osc.start(now);
                        osc.stop(now + 0.03);
                    } else if (type === 'obliterate') {
                        osc.type = 'sawtooth';
                        osc.frequency.setValueAtTime(300, now);
                        osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
                        gain.gain.setValueAtTime(0.3, now);
                        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
                        osc.start(now);
                        osc.stop(now + 0.3);
                    } else if (type === 'undo') {
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(600, now);
                        osc.frequency.exponentialRampToValueAtTime(250, now + 0.08);
                        gain.gain.setValueAtTime(0.15, now);
                        gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
                        osc.start(now);
                        osc.stop(now + 0.08);
                    }
                } catch(e) {}
            }

            toggleSoundMenu() {
                const toggle = document.getElementById('sound-toggle');
                if (toggle) toggle.checked = !toggle.checked;
                const menuCheck = document.getElementById('menu-check-sound');
                if (menuCheck) menuCheck.classList.toggle('opacity-0', !toggle.checked);
            }
        }
        const WigglyAudio = new WigglyAudioModule();