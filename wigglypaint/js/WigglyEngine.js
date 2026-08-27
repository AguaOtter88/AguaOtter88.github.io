        // =========================================================================
        // MODULE 4: WigglyEngine.js (Unified Marker Palette Map Engine)
        // =========================================================================
        class WigglyEngineModule {
            constructor() {
                this.width = WigglyConfig.DEFAULT_WIDTH;
                this.height = WigglyConfig.DEFAULT_HEIGHT;
                this.currentFrameIndex = 0;
                this.lastFrameTime = performance.now();

                this.canvasBgColor = '#ffffff';
                this.foregroundColor = '#000000';

                // 3 Line/Foreground Frames
                this.baseFrameCanvases = [];
                this.baseFrameCtxs = [];
                
                // Unified 3-Frame Marker Palette Maps (Uint8Array per frame: 0=Empty, 1..6=MarkerID)
                this.markerPaletteMaps = [];

                // Offscreen Render Canvas for Marker Layer
                this.markerRenderCanvas = document.createElement('canvas');
                this.markerRenderCtx = this.markerRenderCanvas.getContext('2d');

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
                this.markerPaletteMaps = [];

                for (let f = 0; f < WigglyConfig.NUM_FRAMES; f++) {
                    const bCanvas = document.createElement('canvas');
                    bCanvas.width = this.width;
                    bCanvas.height = this.height;
                    const bCtx = bCanvas.getContext('2d');
                    bCtx.imageSmoothingEnabled = false;
                    this.baseFrameCanvases.push(bCanvas);
                    this.baseFrameCtxs.push(bCtx);

                    this.markerPaletteMaps.push(new Uint8Array(this.width * this.height));
                }

                this.markerRenderCanvas.width = this.width;
                this.markerRenderCanvas.height = this.height;
                this.markerRenderCtx.imageSmoothingEnabled = false;

                this.tintCanvas.width = this.width;
                this.tintCanvas.height = this.height;
                this.tintCtx.imageSmoothingEnabled = false;
            }

            resizeDimensions(newW, newH, offsetX = 0, offsetY = 0, skipUndoSave = false) {
                if (!skipUndoSave) WigglyHistory.saveState();

                const tempBase = this.baseFrameCanvases.map(c => WigglyHistory.cloneCanvasBuffer(c));
                const tempMaps = this.markerPaletteMaps.map(m => new Uint8Array(m));
                const oldW = this.width;
                const oldH = this.height;

                this.width = newW;
                this.height = newH;

                this.visibleCanvas.width = newW;
                this.visibleCanvas.height = newH;
                this.markerRenderCanvas.width = newW;
                this.markerRenderCanvas.height = newH;
                this.tintCanvas.width = newW;
                this.tintCanvas.height = newH;

                for (let f = 0; f < WigglyConfig.NUM_FRAMES; f++) {
                    this.baseFrameCanvases[f].width = newW;
                    this.baseFrameCanvases[f].height = newH;
                    this.baseFrameCtxs[f].imageSmoothingEnabled = false;
                    this.baseFrameCtxs[f].clearRect(0, 0, newW, newH);
                    this.baseFrameCtxs[f].drawImage(tempBase[f], -offsetX, -offsetY);

                    const newMap = new Uint8Array(newW * newH);
                    const oldMap = tempMaps[f];
                    for (let y = 0; y < oldH; y++) {
                        const newY = y - offsetY;
                        if (newY >= 0 && newY < newH) {
                            for (let x = 0; x < oldW; x++) {
                                const newX = x - offsetX;
                                if (newX >= 0 && newX < newW) {
                                    newMap[newY * newW + newX] = oldMap[y * oldW + x];
                                }
                            }
                        }
                    }
                    this.markerPaletteMaps[f] = newMap;
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

                this.renderMainCanvas();
            }

            renderMarkerLayerToCanvas(frameIndex) {
                const map = this.markerPaletteMaps[frameIndex];
                const w = this.width;
                const h = this.height;
                const imgData = this.markerRenderCtx.createImageData(w, h);
                const data32 = new Uint32Array(imgData.data.buffer);

                // Build lookup array for 32-bit Little-Endian ABGR colors (0xFFBBGGRR)
                const colorLookup = new Uint32Array(7);
                colorLookup[0] = 0x00000000; // Transparent

                WigglyConfig.markerKeys.forEach(mKey => {
                    const id = WigglyConfig.markerIdMap[mKey];
                    const hex = WigglyTools.markerColors[mKey] || WigglyConfig.defaultMarkerColors[mKey];
                    let r = parseInt(hex.slice(1, 3), 16) || 0;
                    let g = parseInt(hex.slice(3, 5), 16) || 0;
                    let b = parseInt(hex.slice(5, 7), 16) || 0;
                    colorLookup[id] = (0xFF << 24) | (b << 16) | (g << 8) | r;
                });

                const len = w * h;
                for (let i = 0; i < len; i++) {
                    const markerId = map[i];
                    if (markerId > 0) {
                        data32[i] = colorLookup[markerId];
                    }
                }

                this.markerRenderCtx.putImageData(imgData, 0, 0);
            }

            renderMainCanvas() {
                this.visibleCtx.clearRect(0, 0, this.width, this.height);

                // 1. Draw Background
                this.visibleCtx.fillStyle = this.canvasBgColor;
                this.visibleCtx.fillRect(0, 0, this.width, this.height);

                // 2. Render and Draw Unified Marker Layer
                this.renderMarkerLayerToCanvas(this.currentFrameIndex);
                this.visibleCtx.drawImage(this.markerRenderCanvas, 0, 0);

                // 3. Draw Foreground/Line Layer with Dynamic Tinting
                const lineMaskCanvas = this.baseFrameCanvases[this.currentFrameIndex];
                this.tintCtx.save();
                this.tintCtx.globalCompositeOperation = 'source-over';
                this.tintCtx.clearRect(0, 0, this.width, this.height);
                this.tintCtx.fillStyle = this.foregroundColor;
                this.tintCtx.fillRect(0, 0, this.width, this.height);
                this.tintCtx.globalCompositeOperation = 'destination-in';
                this.tintCtx.drawImage(lineMaskCanvas, 0, 0);
                this.tintCtx.restore();

                this.visibleCtx.drawImage(this.tintCanvas, 0, 0);

                // 4. Update Thumbnail Preview
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

            drawMarkerStamp(frameIndex, x, y, size, shape, markerId) {
                const w = this.width;
                const h = this.height;
                const map = this.markerPaletteMaps[frameIndex];
                const px = Math.floor(x);
                const py = Math.floor(y);

                const half = Math.ceil(size / 2);

                const isInsideShape = (dx, dy) => {
                    if (shape === 'square') {
                        const hSize = Math.floor(size / 2);
                        return Math.abs(dx) <= hSize && Math.abs(dy) <= hSize;
                    } else if (shape === 'chisel') {
                        const hSize = Math.max(1, Math.ceil(size / 2));
                        const thick = Math.max(1, Math.floor(size / 3));
                        return Math.abs(dx + dy) <= size / 1.2 && Math.abs(-dx + dy) <= thick;
                    } else {
                        if (size <= 2) {
                            const hSize = Math.floor(size / 2);
                            return Math.abs(dx) <= hSize && Math.abs(dy) <= hSize;
                        } else {
                            const r = size / 2;
                            return (dx * dx + dy * dy) <= (r * r + 0.25);
                        }
                    }
                };

                for (let dy = -half; dy <= half; dy++) {
                    const curY = py + dy;
                    if (curY < 0 || curY >= h) continue;
                    for (let dx = -half; dx <= half; dx++) {
                        const curX = px + dx;
                        if (curX < 0 || curX >= w) continue;

                        if (isInsideShape(dx, dy)) {
                            map[curY * w + curX] = markerId; // 0 for erase, 1..6 for markers
                        }
                    }
                }
            }
        }
        const WigglyEngine = new WigglyEngineModule();
