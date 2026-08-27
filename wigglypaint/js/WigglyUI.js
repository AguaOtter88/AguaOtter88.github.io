        // =========================================================================
        // MODULE 6: WigglyUI.js (Modals, Menus, Palette Presets, GIF Export)
        // =========================================================================
        class WigglyUIModule {
            init() {
                this.bindGlobalEvents();
            }

            toggleMenu(menuId, event) {
                if (event) event.stopPropagation();
                const menu = document.getElementById(menuId);
                const isHidden = menu.classList.contains('hidden');
                this.closeAllMenus();
                if (isHidden) {
                    menu.classList.remove('hidden');
                    WigglyAudio.play('pop');
                }
            }

            closeAllMenus() {
                document.querySelectorAll('.menu-dropdown-container > div').forEach(m => m.classList.add('hidden'));
            }

            openModal(id) {
                const modal = document.getElementById(id);
                if (!modal) return;
                modal.classList.add('active');
                WigglyAudio.play('pop');

                if (id === 'export-modal') {
                    document.getElementById('export-status-container').classList.remove('hidden');
                    document.getElementById('export-preview-container').classList.add('hidden');
                    setTimeout(() => this.compileAndExportGIF(), 100);
                }
            }

            closeModal(id) {
                const modal = document.getElementById(id);
                if (!modal) return;
                modal.classList.remove('active');
            }

            openCropModal() {
                document.getElementById('resize-width').value = WigglyEngine.width;
                document.getElementById('resize-height').value = WigglyEngine.height;
                document.getElementById('crop-top').value = 0;
                document.getElementById('crop-bottom').value = 0;
                document.getElementById('crop-left').value = 0;
                document.getElementById('crop-right').value = 0;
                this.openModal('crop-modal');
            }

            setPresetSize(w, h) {
                document.getElementById('resize-width').value = w;
                document.getElementById('resize-height').value = h;
                WigglyAudio.play('pop');
            }

            applyDirectResize() {
                const newW = parseInt(document.getElementById('resize-width').value, 10) || WigglyEngine.width;
                const newH = parseInt(document.getElementById('resize-height').value, 10) || WigglyEngine.height;

                if (newW <= 0 || newH <= 0) return;

                WigglyEngine.resizeDimensions(newW, newH, 0, 0);
                this.closeModal('crop-modal');
                WigglyAudio.play('pop');
            }

            applyCrop() {
                const top = parseInt(document.getElementById('crop-top').value, 10) || 0;
                const bottom = parseInt(document.getElementById('crop-bottom').value, 10) || 0;
                const left = parseInt(document.getElementById('crop-left').value, 10) || 0;
                const right = parseInt(document.getElementById('crop-right').value, 10) || 0;

                const newW = Math.max(50, WigglyEngine.width - left - right);
                const newH = Math.max(50, WigglyEngine.height - top - bottom);

                WigglyEngine.resizeDimensions(newW, newH, left, top);
                this.closeModal('crop-modal');
                WigglyAudio.play('pop');
            }

            applyTightFit() {
                let minX = WigglyEngine.width, minY = WigglyEngine.height, maxX = 0, maxY = 0;
                let hasPixels = false;

                for (let f = 0; f < WigglyConfig.NUM_FRAMES; f++) {
                    const imgData = WigglyEngine.baseFrameCtxs[f].getImageData(0, 0, WigglyEngine.width, WigglyEngine.height).data;
                    for (let y = 0; y < WigglyEngine.height; y++) {
                        for (let x = 0; x < WigglyEngine.width; x++) {
                            const alpha = imgData[(y * WigglyEngine.width + x) * 4 + 3];
                            if (alpha > 0) {
                                hasPixels = true;
                                if (x < minX) minX = x;
                                if (x > maxX) maxX = x;
                                if (y < minY) minY = y;
                                if (y > maxY) maxY = y;
                            }
                        }
                    }

                    const map = WigglyEngine.markerPaletteMaps[f];
                    for (let y = 0; y < WigglyEngine.height; y++) {
                        for (let x = 0; x < WigglyEngine.width; x++) {
                            if (map[y * WigglyEngine.width + x] > 0) {
                                hasPixels = true;
                                if (x < minX) minX = x;
                                if (x > maxX) maxX = x;
                                if (y < minY) minY = y;
                                if (y > maxY) maxY = y;
                            }
                        }
                    }
                }

                if (!hasPixels) return;

                const pad = 10;
                minX = Math.max(0, minX - pad);
                minY = Math.max(0, minY - pad);
                maxX = Math.min(WigglyEngine.width - 1, maxX + pad);
                maxY = Math.min(WigglyEngine.height - 1, maxY + pad);

                const newW = maxX - minX + 1;
                const newH = maxY - minY + 1;

                WigglyEngine.resizeDimensions(newW, newH, minX, minY);
                this.closeModal('crop-modal');
                WigglyAudio.play('pop');
            }

            applyPresetPalette(presetKey) {
                const presets = {
                    classic: { bg: '#ffffff', fg: '#000000', m1: '#FF5588', m2: '#00CCFF', m3: '#FFE000', c1: '#00FF66', c2: '#A020F0', c3: '#FF6600' },
                    retro: { bg: '#FDF6E3', fg: '#2B261F', m1: '#E88D8D', m2: '#8DAEE8', m3: '#E8D48D', c1: '#A8E88D', c2: '#C48DE8', c3: '#E8B28D' },
                    cyber: { bg: '#121218', fg: '#FFFFFF', m1: '#FF007F', m2: '#00F0FF', m3: '#FFE600', c1: '#39FF14', c2: '#B026FF', c3: '#FF5F1F' },
                    morandi: { bg: '#EAE8E3', fg: '#333333', m1: '#C08282', m2: '#829CB0', m3: '#D4C49A', c1: '#9AB09C', c2: '#A282B0', c3: '#C89B82' },
                    gameboy: { bg: '#9BBC0F', fg: '#0F380F', m1: '#8BAC0F', m2: '#306230', m3: '#0F380F', c1: '#8BAC0F', c2: '#306230', c3: '#0F380F' },
                    macaron: { bg: '#FFF5F5', fg: '#4A4A4A', m1: '#FFB7B2', m2: '#A2E8DD', m3: '#FFF1C5', c1: '#C7CEEA', c2: '#E2F0CB', c3: '#FFDAC1' }
                };

                const p = presets[presetKey];
                if (!p) return;

                WigglyEngine.setCanvasBackground(p.bg);
                WigglyEngine.setCanvasForeground(p.fg);

                const mMapping = { 'marker1': p.m1, 'marker2': p.m2, 'marker3': p.m3, 'custom1': p.c1, 'custom2': p.c2, 'custom3': p.c3 };
                WigglyConfig.markerKeys.forEach(mKey => {
                    const color = mMapping[mKey];
                    WigglyTools.markerColors[mKey] = color;
                    const picker = document.getElementById(`picker-${mKey}`);
                    if (picker) picker.value = color;
                    const swatch = document.getElementById(`swatch-${mKey}`);
                    if (swatch) swatch.style.backgroundColor = color;
                });

                WigglyTools.renderPatternButtons();
                WigglyEngine.renderMainCanvas();
                WigglyAudio.play('pop');
            }

            promptClearCanvas() {
                this.clearCanvasNow();
            }

            clearCanvasNow() {
                WigglyHistory.saveState();
                WigglyAudio.play('obliterate');

                for (let f = 0; f < WigglyConfig.NUM_FRAMES; f++) {
                    if (WigglyEngine.baseFrameCtxs[f]) {
                        WigglyEngine.baseFrameCtxs[f].clearRect(0, 0, WigglyEngine.width, WigglyEngine.height);
                    }
                    if (WigglyEngine.markerPaletteMaps[f]) {
                        WigglyEngine.markerPaletteMaps[f].fill(0);
                    }
                }
                if (WigglyEngine.stampCache) {
                    WigglyEngine.stampCache.clear();
                }
                WigglyEngine.renderMainCanvas();
            }

            triggerOpenImage() {
                document.getElementById('image-open-loader').click();
            }

            handleOpenImage(e) {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        WigglyHistory.saveState();
                        WigglyEngine.resizeDimensions(img.width, img.height, 0, 0, true);
                        for (let f = 0; f < WigglyConfig.NUM_FRAMES; f++) {
                            WigglyEngine.baseFrameCtxs[f].clearRect(0, 0, img.width, img.height);
                            WigglyEngine.baseFrameCtxs[f].drawImage(img, 0, 0);
                            if (WigglyEngine.markerPaletteMaps[f]) {
                                WigglyEngine.markerPaletteMaps[f].fill(0);
                            }
                        }
                        if (WigglyEngine.stampCache) {
                            WigglyEngine.stampCache.clear();
                        }
                        WigglyEngine.renderMainCanvas();
                        WigglyAudio.play('pop');
                        e.target.value = '';
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }

            compileAndExportGIF() {
                const tempCanvases = [];

                for (let f = 0; f < WigglyConfig.NUM_FRAMES; f++) {
                    const fCanvas = document.createElement('canvas');
                    fCanvas.width = WigglyEngine.width;
                    fCanvas.height = WigglyEngine.height;
                    const fCtx = fCanvas.getContext('2d');
                    fCtx.imageSmoothingEnabled = false;

                    // 1. Fill Background
                    fCtx.fillStyle = WigglyEngine.canvasBgColor;
                    fCtx.fillRect(0, 0, WigglyEngine.width, WigglyEngine.height);

                    // 2. Render and Draw Marker Layer
                    WigglyEngine.renderMarkerLayerToCanvas(f);
                    fCtx.drawImage(WigglyEngine.markerRenderCanvas, 0, 0);

                    // 3. Draw Foreground/Line Layer
                    const lineMaskCanvas = WigglyEngine.baseFrameCanvases[f];
                    WigglyEngine.tintCtx.save();
                    WigglyEngine.tintCtx.globalCompositeOperation = 'source-over';
                    WigglyEngine.tintCtx.clearRect(0, 0, WigglyEngine.width, WigglyEngine.height);
                    WigglyEngine.tintCtx.fillStyle = WigglyEngine.foregroundColor;
                    WigglyEngine.tintCtx.fillRect(0, 0, WigglyEngine.width, WigglyEngine.height);
                    WigglyEngine.tintCtx.globalCompositeOperation = 'destination-in';
                    WigglyEngine.tintCtx.drawImage(lineMaskCanvas, 0, 0);
                    WigglyEngine.tintCtx.restore();

                    fCtx.drawImage(WigglyEngine.tintCanvas, 0, 0);

                    tempCanvases.push(fCanvas.toDataURL('image/png'));
                }

                if (typeof gifshot !== 'undefined') {
                    gifshot.createGIF({
                        images: tempCanvases,
                        gifWidth: WigglyEngine.width,
                        gifHeight: WigglyEngine.height,
                        interval: 0.1,
                        numFrames: 3
                    }, function (obj) {
                        if (!obj.error) {
                            const animatedGIF = obj.image;
                            document.getElementById('gif-preview-img').src = animatedGIF;
                            document.getElementById('gif-download-btn').href = animatedGIF;

                            document.getElementById('export-status-container').classList.add('hidden');
                            document.getElementById('export-preview-container').classList.remove('hidden');
                        }
                    });
                }
            }

            bindGlobalEvents() {
                document.addEventListener('click', () => this.closeAllMenus());

                window.addEventListener('keydown', (e) => {
                    const tag = e.target.tagName.toLowerCase();
                    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

                    const isCmdOrCtrl = e.ctrlKey || e.metaKey;

                    if (isCmdOrCtrl) {
                        const key = e.key.toLowerCase();
                        if (key === '1') { e.preventDefault(); WigglyTools.selectTool('marker1'); }
                        else if (key === '2') { e.preventDefault(); WigglyTools.selectTool('marker2'); }
                        else if (key === '3') { e.preventDefault(); WigglyTools.selectTool('marker3'); }
                        else if (key === '4') { e.preventDefault(); WigglyTools.selectTool('custom1'); }
                        else if (key === '5') { e.preventDefault(); WigglyTools.selectTool('custom2'); }
                        else if (key === '6') { e.preventDefault(); WigglyTools.selectTool('custom3'); }
                        else if (key === 'o') { e.preventDefault(); this.triggerOpenImage(); }
                        else if (key === 'z' && !e.shiftKey) { e.preventDefault(); WigglyHistory.undo(); }
                        else if (key === 'y' || (e.shiftKey && key === 'z')) { e.preventDefault(); WigglyHistory.redo(); }
                        else if (key === 'e') { e.preventDefault(); this.openModal('export-modal'); }
                        else if (key === 'n') { e.preventDefault(); this.promptClearCanvas(); }
                    } else {
                        if (e.key === '1' || e.key.toLowerCase() === 'b') WigglyTools.selectTool('pen');
                        else if (e.key === '2') WigglyTools.selectTool('pencil');
                        else if (e.key === '3') WigglyTools.selectTool('ballpoint');
                        else if (e.key === '4') WigglyTools.selectTool('spray');
                        else if (e.key === '5' || (e.key.toLowerCase() === 'e' && !e.shiftKey)) WigglyTools.selectTool('eraser');
                        else if (e.key === '6' || (e.key.toLowerCase() === 'e' && e.shiftKey)) WigglyTools.selectTool('marker_eraser');
                        else if (e.key === 'F1') { e.preventDefault(); this.openModal('help-modal'); }
                        else if (e.key === 'Escape') {
                            document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
                        }
                    }
                });
            }
        }
        const WigglyUI = new WigglyUIModule();
