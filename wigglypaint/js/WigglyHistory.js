        // =========================================================================
        // MODULE 3: WigglyHistory.js (Undo/Redo Engine)
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
                    markerFrameCanvases: {}
                };
                WigglyConfig.markerKeys.forEach(mKey => {
                    state.markerFrameCanvases[mKey] = WigglyEngine.markerFrameCanvases[mKey].map(c => this.cloneCanvasBuffer(c));
                });

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
                    markerFrameCanvases: {}
                };
                WigglyConfig.markerKeys.forEach(mKey => {
                    currentState.markerFrameCanvases[mKey] = WigglyEngine.markerFrameCanvases[mKey].map(c => this.cloneCanvasBuffer(c));
                });
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
                    markerFrameCanvases: {}
                };
                WigglyConfig.markerKeys.forEach(mKey => {
                    currentState.markerFrameCanvases[mKey] = WigglyEngine.markerFrameCanvases[mKey].map(c => this.cloneCanvasBuffer(c));
                });
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

                    WigglyConfig.markerKeys.forEach(mKey => {
                        WigglyEngine.markerFrameCtxs[mKey][f].clearRect(0, 0, WigglyEngine.width, WigglyEngine.height);
                        WigglyEngine.markerFrameCtxs[mKey][f].drawImage(state.markerFrameCanvases[mKey][f], 0, 0);
                    });
                }
                WigglyEngine.renderMainCanvas();
            }
        }
        const WigglyHistory = new WigglyHistoryModule();