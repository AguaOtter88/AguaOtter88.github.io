        // =========================================================================
        // MODULE 3: WigglyHistory.js (Undo/Redo Engine with Unified Marker Maps)
        // =========================================================================
        class WigglyHistoryModule {
            constructor() {
                this.undoStack = [];
                this.redoStack = [];
            }

            cloneCanvasBuffer(srcCanvas) {
                const copy = document.createElement('canvas');
                copy.width = srcCanvas.width;
                copy.height = srcCanvas.height;
                const ctx = copy.getContext('2d');
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(srcCanvas, 0, 0);
                return copy;
            }

            saveState() {
                const state = {
                    width: WigglyEngine.width,
                    height: WigglyEngine.height,
                    baseFrameCanvases: WigglyEngine.baseFrameCanvases.map(c => this.cloneCanvasBuffer(c)),
                    markerPaletteMaps: WigglyEngine.markerPaletteMaps.map(m => new Uint8Array(m))
                };

                this.undoStack.push(state);
                if (this.undoStack.length > WigglyConfig.MAX_UNDO) this.undoStack.shift();
                this.redoStack = [];
            }

            undo() {
                if (this.undoStack.length === 0) return;
                
                const currentState = {
                    width: WigglyEngine.width,
                    height: WigglyEngine.height,
                    baseFrameCanvases: WigglyEngine.baseFrameCanvases.map(c => this.cloneCanvasBuffer(c)),
                    markerPaletteMaps: WigglyEngine.markerPaletteMaps.map(m => new Uint8Array(m))
                };
                this.redoStack.push(currentState);
                if (this.redoStack.length > WigglyConfig.MAX_UNDO) this.redoStack.shift();

                const previousState = this.undoStack.pop();
                this.restoreState(previousState);
                WigglyAudio.play('undo');
            }

            redo() {
                if (this.redoStack.length === 0) return;

                const currentState = {
                    width: WigglyEngine.width,
                    height: WigglyEngine.height,
                    baseFrameCanvases: WigglyEngine.baseFrameCanvases.map(c => this.cloneCanvasBuffer(c)),
                    markerPaletteMaps: WigglyEngine.markerPaletteMaps.map(m => new Uint8Array(m))
                };
                this.undoStack.push(currentState);
                if (this.undoStack.length > WigglyConfig.MAX_UNDO) this.undoStack.shift();

                const nextState = this.redoStack.pop();
                this.restoreState(nextState);
                WigglyAudio.play('pop');
            }

            restoreState(state) {
                if (state.width !== WigglyEngine.width || state.height !== WigglyEngine.height) {
                    WigglyEngine.resizeDimensions(state.width, state.height, 0, 0, true);
                }

                for (let f = 0; f < WigglyConfig.NUM_FRAMES; f++) {
                    WigglyEngine.baseFrameCtxs[f].clearRect(0, 0, WigglyEngine.width, WigglyEngine.height);
                    WigglyEngine.baseFrameCtxs[f].drawImage(state.baseFrameCanvases[f], 0, 0);

                    WigglyEngine.markerPaletteMaps[f].set(state.markerPaletteMaps[f]);
                }
                WigglyEngine.renderMainCanvas();
            }
        }
        const WigglyHistory = new WigglyHistoryModule();
