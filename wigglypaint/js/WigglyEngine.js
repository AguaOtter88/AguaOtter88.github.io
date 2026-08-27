        // =========================================================================
        // MODULE 4: WigglyEngine.js (Canvas Rendering, Buffers & Foreground/Background Color)
        // =========================================================================
        class WigglyEngineModule {
            constructor() {
                this.width = WigglyConfig.DEFAULT_WIDTH;
                this.height = WigglyConfig.DEFAULT_HEIGHT;
                this.currentFrameIndex = 0;
                this.lastFrameTime = performance.now();

                this.canvasBgColor = '#ffffff';
                this.foregroundColor = '#000000';

                // 3 Line Frames
                this.baseFrameCanvases = [];
                this.baseFrameCtxs = [];
                
                // 6 Distinct Marker Layer Mask Buffers
                this.markerFrameCanvases = {};
                this.markerFrameCtxs = {};

                this.tintCanvas = document.createElement('canvas');
                this.tintCtx = this.tintCanvas.getContext('2d');

                this.visibleCanvas = null;
                this.visibleCtx = null;
                this.previewCanvas = null;
                this.previewCtx = null;

                this.stampCache = new Map();
                this.dynamicPatternCanvases = [];
            }

            init() {
                this.visibleCanvas = document.getElementById('visibleCanvas');
                this.visibleCtx = this.visibleCanvas.getContext('2d');
                this.visibleCtx.imageSmoothingEnabled = false;

                this.previewCanvas = document.getElementById('previewCanvas');
                this.previewCtx = this.previewCanvas ? this.previewCanvas.getContext('2d') : null;

                this.initCanvasBuffers();
            }

            initCanvasBuffers() {
                this.baseFrameCanvases = [];
                this.baseFrameCtxs = [];
                this.markerFrameCanvases = {};
                this.markerFrameCtxs = {};

                for (let f = 0; f < WigglyConfig.NUM_FRAMES; f++) {
                    // Line Canvas
                    const bCanvas = document.createElement('canvas');
                    bCanvas.width = this.width;
                    bCanvas.height = this.height;
                    const bCtx = bCanvas.getContext('2d');
                    bCtx.imageSmoothingEnabled = false;
                    this.baseFrameCanvases.push(bCanvas);
                    this.baseFrameCtxs.push(bCtx);
                }

                // Initialize 6 separate marker layers
                WigglyConfig.markerKeys.forEach(mKey => {
                    this.markerFrameCanvases[mKey] = [];
                    this.markerFrameCtxs[mKey] = [];
                    for (let f = 0; f < WigglyConfig.NUM_FRAMES; f++) {
                        const mCanvas = document.createElement('canvas');
                        mCanvas.width = this.width;
                        mCanvas.height = this.height;
                        const mCtx = mCanvas.getContext('2d');
                        mCtx.imageSmoothingEnabled = false;
                        this.markerFrameCanvases[mKey].push(mCanvas);
                        this.markerFrameCtxs[mKey].push(mCtx);
                    }
                });

                this.tintCanvas.width = this.width;
                this.tintCanvas.height = this.height;
                this.tintCtx.imageSmoothingEnabled = false;
            }

            resizeDimensions(newW, newH, offsetX = 0, offsetY = 0, skipUndoSave = false) {
                if (!skipUndoSave) WigglyHistory.saveState();

                const tempBase = this.baseFrameCanvases.map(c => WigglyHistory.cloneCanvasBuffer(c));
                const tempMarkers = {};
                WigglyConfig.markerKeys.forEach(mKey => {
                    tempMarkers[mKey] = this.markerFrameCanvases[mKey].map(c => WigglyHistory.cloneCanvasBuffer(c));
                });

                this.width = newW;
                this.height = newH;

                this.visibleCanvas.width = newW;
                this.visibleCanvas.height = newH;
                this.tintCanvas.width = newW;
                this.tintCanvas.height = newH;

                for (let f = 0; f < WigglyConfig.NUM_FRAMES; f++) {
                    this.baseFrameCanvases[f].width = newW;
                    this.baseFrameCanvases[f].height = newH;
                    this.baseFrameCtxs[f].imageSmoothingEnabled = false;
                    this.baseFrameCtxs[f].clearRect(0, 0, newW, newH);
                    this.baseFrameCtxs[f].drawImage(tempBase[f], -offsetX, -offsetY);

                    WigglyConfig.markerKeys.forEach(mKey => {
                        this.markerFrameCanvases[mKey][f].width = newW;
                        this.markerFrameCanvases[mKey][f].height = newH;
                        this.markerFrameCtxs[mKey][f].imageSmoothingEnabled = false;
                        this.markerFrameCtxs[mKey][f].clearRect(0, 0, newW, newH);
                        this.markerFrameCtxs[mKey][f].drawImage(tempMarkers[mKey][f], -offsetX, -offsetY);
                    });
                }

                const indicator = document.getElementById('canvas-dim-indicator');
                if (indicator) indicator.innerHTML = `<i class="fa-solid fa-expand mr-1"></i>${newW} x ${newH} 像素`;
                this.renderMainCanvas();
            }

            setCanvasBackground(colorHex) {
                this.canvasBgColor = colorHex;
                const picker = document.getElementById('bg-color-picker');
                if (picker) picker.value = colorHex;
                const hexText = document.getElementById('bg-hex-text');
                if (hexText) hexText.innerText = colorHex;

                this.renderMainCanvas();
            }

            setCanvasForeground(colorHex) {
                this.foregroundColor = colorHex;
                const picker = document.getElementById('fg-color-picker');
                if (picker) picker.value = colorHex;
                const hexText = document.getElementById('fg-hex-text');
                if (hexText) hexText.innerText = colorHex;
            }

            renderMainCanvas() {
                this.visibleCtx.clearRect(0, 0, this.width, this.height);

                // 1. Draw Background
                this.visibleCtx.fillStyle = this.canvasBgColor;
                this.visibleCtx.fillRect(0, 0, this.width, this.height);

                // 2. Draw 6 Independent Marker Layers with Dynamic Recoloring
                WigglyConfig.markerKeys.forEach(mKey => {
                    const maskCanvas = this.markerFrameCanvases[mKey][this.currentFrameIndex];
                    const markerColor = WigglyTools.markerColors[mKey];

                    this.tintCtx.save();
                    this.tintCtx.globalCompositeOperation = 'source-over';
                    this.tintCtx.clearRect(0, 0, this.width, this.height);
                    this.tintCtx.fillStyle = markerColor;
                    this.tintCtx.fillRect(0, 0, this.width, this.height);
                    this.tintCtx.globalCompositeOperation = 'destination-in';
                    this.tintCtx.drawImage(maskCanvas, 0, 0);
                    this.tintCtx.restore();

                    this.visibleCtx.drawImage(this.tintCanvas, 0, 0);
                });

                // 3. Draw Line & Screentone Layer
                this.visibleCtx.drawImage(this.baseFrameCanvases[this.currentFrameIndex], 0, 0);

                // 4. Update Thumbnail
                if (this.previewCanvas && this.previewCtx) {
                    if (this.previewCanvas.width !== this.width || this.previewCanvas.height !== this.height) {
                        this.previewCanvas.width = this.width;
                        this.previewCanvas.height = this.height;
                        this.previewCtx.imageSmoothingEnabled = false;
                    }
                    this.previewCtx.clearRect(0, 0, this.width, this.height);
                    this.previewCtx.drawImage(this.visibleCanvas, 0, 0);
                }
            }

            gameLoop(timestamp) {
                if (timestamp - this.lastFrameTime >= 100) {
                    this.currentFrameIndex = (this.currentFrameIndex + 1) % WigglyConfig.NUM_FRAMES;
                    this.lastFrameTime = timestamp;
                    this.updateDynamicPatternThumbnails();
                }

                this.renderMainCanvas();
                requestAnimationFrame(t => this.gameLoop(t));
            }

            drawPatternThumbnail(pCtx, patObj, frameIdx) {
                pCtx.clearRect(0, 0, 16, 16);
                pCtx.fillStyle = this.foregroundColor;
                const pat = patObj.frames[frameIdx % patObj.frames.length];

                for (let y = 0; y < 16; y++) {
                    for (let x = 0; x < 16; x++) {
                        const patVal = pat[(y % 8) * 8 + (x % 8)];
                        if (patVal === 1) {
                            pCtx.fillRect(x, y, 1, 1);
                        }
                    }
                }
            }

            updateDynamicPatternThumbnails() {
                this.dynamicPatternCanvases.forEach(item => {
                    this.drawPatternThumbnail(item.ctx, item.patObj, this.currentFrameIndex);
                });
            }

            getStampCanvas(props, frameIndex = 0, offX = 0, offY = 0) {
                const key = `${props.type}_${props.size}_${WigglyTools.brushTipShape}_${props.color}_${props.composite}_${WigglyTools.selectedPatternIdx}_${frameIndex}_${offX}_${offY}`;
                if (this.stampCache.has(key)) return this.stampCache.get(key);

                const size = props.size;
                const pad = size + 4;
                const sCanvas = document.createElement('canvas');
                sCanvas.width = pad;
                sCanvas.height = pad;
                const sCtx = sCanvas.getContext('2d');
                sCtx.imageSmoothingEnabled = false;

                sCtx.fillStyle = props.color;
                const cx = Math.floor(pad / 2);
                const cy = Math.floor(pad / 2);

                const isInsideShape = (dx, dy) => {
                    if (WigglyTools.brushTipShape === 'square') {
                        const half = Math.floor(size / 2);
                        return Math.abs(dx) <= half && Math.abs(dy) <= half;
                    } else if (WigglyTools.brushTipShape === 'chisel') {
                        const half = Math.max(1, Math.ceil(size / 2));
                        const thick = Math.max(1, Math.floor(size / 3));
                        return Math.abs(dx + dy) <= size / 1.2 && Math.abs(-dx + dy) <= thick;
                    } else {
                        if (size <= 2) {
                            const half = Math.floor(size / 2);
                            return Math.abs(dx) <= half && Math.abs(dy) <= half;
                        } else {
                            const r = size / 2;
                            return (dx * dx + dy * dy) <= (r * r + 0.25);
                        }
                    }
                };

                const half = Math.ceil(size / 2);

                if (props.type === 'pixel') {
                    for (let dy = -half; dy <= half; dy++) {
                        for (let dx = -half; dx <= half; dx++) {
                            if (isInsideShape(dx, dy)) {
                                sCtx.fillRect(cx + dx, cy + dy, 1, 1);
                            }
                        }
                    }
                } else if (props.type === 'dither') {
                    for (let dy = -half; dy <= half; dy++) {
                        for (let dx = -half; dx <= half; dx++) {
                            if (isInsideShape(dx, dy) && (offX + dx + offY + dy) % 2 === 0) {
                                sCtx.fillRect(cx + dx, cy + dy, 1, 1);
                            }
                        }
                    }
                } else if (props.type === 'pattern') {
                    const patObj = WigglyConfig.patterns[WigglyTools.selectedPatternIdx] || WigglyConfig.patterns[0];
                    const activePat = patObj ? patObj.frames[frameIndex % patObj.frames.length] : null;

                    for (let dy = -half; dy <= half; dy++) {
                        for (let dx = -half; dx <= half; dx++) {
                            if (isInsideShape(dx, dy)) {
                                const curAbsX = ((offX + dx) % 8 + 8) % 8;
                                const curAbsY = ((offY + dy) % 8 + 8) % 8;
                                if (activePat && activePat[curAbsY * 8 + curAbsX] === 1) {
                                    sCtx.fillRect(cx + dx, cy + dy, 1, 1);
                                }
                            }
                        }
                    }
                }

                this.stampCache.set(key, sCanvas);
                return sCanvas;
            }

            drawPixelStamp(ctx, x, y, props, jx = 0, jy = 0, frameIndex = 0) {
                ctx.save();
                ctx.globalCompositeOperation = props.composite;
                ctx.globalAlpha = 1.0;

                const px = Math.floor(x + jx);
                const py = Math.floor(y + jy);

                if (props.type === 'spray') {
                    ctx.fillStyle = props.color;
                    const radius = props.size * 2;
                    const density = Math.max(5, props.size * 3);
                    for (let i = 0; i < density; i++) {
                        const ang = Math.random() * Math.PI * 2;
                        const r = Math.random() * radius;
                        const sx = Math.floor(px + Math.cos(ang) * r);
                        const sy = Math.floor(py + Math.sin(ang) * r);
                        ctx.fillRect(sx, sy, 1, 1);
                    }
                } else {
                    const offX = ((px % 8) + 8) % 8;
                    const offY = ((py % 8) + 8) % 8;
                    const stamp = this.getStampCanvas(props, frameIndex, offX, offY);
                    const half = Math.floor(stamp.width / 2);
                    ctx.drawImage(stamp, px - half, py - half);
                }

                ctx.restore();
            }
        }
        const WigglyEngine = new WigglyEngineModule();