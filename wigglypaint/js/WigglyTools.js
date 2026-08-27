        // =========================================================================
        // MODULE 5: WigglyTools.js (Brushes, Markers, Tremor Stabilizer, Mirror)
        // =========================================================================
        class WigglyToolsModule {
            constructor() {
                this.currentTool = 'pen';
                this.selectedPatternIdx = 0;
                this.brushPt = 3;
                this.brushTipShape = 'round';

                this.isHorizontalMirror = false;
                this.isVerticalMirror = false;

                this.stabilizerLevel = 3;
                this.isDrawing = false;

                this.lastX = 0;
                this.lastY = 0;
                this.smoothedX = 0;
                this.smoothedY = 0;
                this.lastMidX = 0;
                this.lastMidY = 0;

                this.markerColors = { ...WigglyConfig.defaultMarkerColors };
            }

            init() {
                this.renderPatternButtons();
                this.bindCanvasInputEvents();
            }

            renderPatternButtons() {
                const grid = document.getElementById('pattern-buttons-grid');
                if (!grid) return;
                grid.innerHTML = '';
                WigglyEngine.dynamicPatternCanvases = [];

                const countBadge = document.getElementById('pattern-count-badge');
                if (countBadge) countBadge.innerText = `${WigglyConfig.patterns.length}種`;

                WigglyConfig.patterns.forEach((patObj, idx) => {
                    const btn = document.createElement('button');
                    const isActive = (idx === this.selectedPatternIdx && this.currentTool === 'pattern');
                    btn.className = `retro-btn h-8 w-full p-0 flex items-center justify-center relative ${isActive ? 'active' : ''}`;
                    btn.title = `${patObj.isDynamic ? '[動態] ' : ''}${patObj.name} (#${idx + 1})`;
                    btn.onclick = () => {
                        this.selectedPatternIdx = idx;
                        this.selectTool('pattern');
                    };

                    const pCanvas = document.createElement('canvas');
                    pCanvas.width = 16;
                    pCanvas.height = 16;
                    pCanvas.className = 'shrink-0';
                    const pCtx = pCanvas.getContext('2d');

                    WigglyEngine.drawPatternThumbnail(pCtx, patObj, 0);

                    if (patObj.isDynamic) {
                        WigglyEngine.dynamicPatternCanvases.push({ canvas: pCanvas, ctx: pCtx, patObj: patObj });
                        
                        const badge = document.createElement('span');
                        badge.className = "text-[7px] font-bold text-amber-900 bg-amber-300 border border-amber-500 px-0.5 rounded leading-none absolute top-0.5 right-0.5 pointer-events-none shadow-sm";
                        badge.innerText = "動";
                        btn.appendChild(badge);
                    }

                    btn.appendChild(pCanvas);
                    grid.appendChild(btn);
                });
            }

            selectTool(toolName) {
                this.currentTool = toolName;
                WigglyAudio.play('pop');

                document.querySelectorAll('#tool-buttons-grid .retro-btn').forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('#markers-group .retro-btn').forEach(btn => btn.classList.remove('active'));

                if (toolName !== 'pattern') {
                    document.querySelectorAll('#pattern-buttons-grid .retro-btn').forEach(btn => btn.classList.remove('active'));
                }

                const activeStdBtn = document.querySelector(`[data-tool="${toolName}"]`);
                if (activeStdBtn) {
                    activeStdBtn.classList.add('active');
                } else {
                    const markerBtn = document.getElementById(`btn-${toolName}`);
                    if (markerBtn) markerBtn.classList.add('active');
                }
            }

            getToolProps(tool) {
                const baseSize = this.brushPt;
                
                if (WigglyConfig.markerKeys.includes(tool)) {
                    return {
                        color: '#000000',
                        size: Math.max(2, baseSize * 2),
                        alpha: 1.0,
                        composite: 'source-over',
                        jitter: 1.0,
                        type: 'pixel'
                    };
                }

                switch (tool) {
                    case 'pen':
                        return { color: '#000000', size: Math.max(1, baseSize), alpha: 1.0, composite: 'source-over', jitter: 1.2, type: 'pixel' };
                    case 'pencil':
                        return { color: '#000000', size: Math.max(1, Math.floor(baseSize * 0.8)), alpha: 0.8, composite: 'source-over', jitter: 1.5, type: 'dither' };
                    case 'ballpoint':
                        return { color: '#000000', size: 1, alpha: 0.95, composite: 'source-over', jitter: 0.8, type: 'pixel' };
                    case 'spray':
                        return { color: '#000000', size: Math.max(2, baseSize * 2), alpha: 0.8, composite: 'source-over', jitter: 2.0, type: 'spray' };
                    case 'pattern':
                        return { color: '#000000', size: Math.max(3, baseSize * 2), alpha: 1.0, composite: 'source-over', jitter: 0.3, type: 'pattern' };
                    case 'eraser':
                    case 'marker_eraser':
                        return { color: '#000000', size: Math.max(3, baseSize * 2), alpha: 1.0, composite: 'destination-out', jitter: 0.5, type: 'pixel' };
                    default:
                        return { color: '#000000', size: Math.max(2, baseSize * 2), alpha: 1.0, composite: 'source-over', jitter: 1.2, type: 'pixel' };
                }
            }

            setStabilizer(val) {
                this.stabilizerLevel = parseInt(val, 10);
                const badge = document.getElementById('stabilizer-value-badge');
                if (!badge) return;
                if (this.stabilizerLevel === 0) badge.innerText = '關閉';
                else badge.innerText = `Lv. ${this.stabilizerLevel}`;
            }

            setBrushSize(val) {
                this.brushPt = parseInt(val, 10);
                const badge = document.getElementById('brush-pt-badge');
                if (badge) badge.innerText = `${this.brushPt} pt`;
            }

            setBrushTipShape(shape) {
                this.brushTipShape = shape;
                document.querySelectorAll('#tip-shape-buttons .retro-btn').forEach(btn => btn.classList.remove('active'));
                const activeBtn = document.getElementById(`btn-shape-${shape}`);
                if (activeBtn) activeBtn.classList.add('active');
                WigglyAudio.play('pop');
            }

            toggleMirror(axis) {
                if (axis === 'h') {
                    this.isHorizontalMirror = !this.isHorizontalMirror;
                    const btn = document.getElementById('btn-mirror-h');
                    if (btn) btn.classList.toggle('active', this.isHorizontalMirror);
                } else if (axis === 'v') {
                    this.isVerticalMirror = !this.isVerticalMirror;
                    const btn = document.getElementById('btn-mirror-v');
                    if (btn) btn.classList.toggle('active', this.isVerticalMirror);
                }
                WigglyAudio.play('pop');
            }

            updateMarkerColor(markerKey, hexColor) {
                this.markerColors[markerKey] = hexColor;
                const swatch = document.getElementById(`swatch-${markerKey}`);
                if (swatch) swatch.style.backgroundColor = hexColor;

                this.selectTool(markerKey);
                WigglyEngine.renderMainCanvas();
            }

            getCanvasCoordinates(e) {
                const rect = WigglyEngine.visibleCanvas.getBoundingClientRect();
                const scaleX = WigglyEngine.width / rect.width;
                const scaleY = WigglyEngine.height / rect.height;

                let clientX = e.clientX;
                let clientY = e.clientY;

                if (e.touches && e.touches.length > 0) {
                    clientX = e.touches[0].clientX;
                    clientY = e.touches[0].clientY;
                }

                return {
                    x: (clientX - rect.left) * scaleX,
                    y: (clientY - rect.top) * scaleY
                };
            }

            startDrawing(e) {
                e.preventDefault();
                WigglyHistory.saveState();
                this.isDrawing = true;
                
                if (e.target && e.target.setPointerCapture && e.pointerId !== undefined) {
                    try { e.target.setPointerCapture(e.pointerId); } catch(err) {}
                }

                const coords = this.getCanvasCoordinates(e);
                this.lastX = coords.x;
                this.lastY = coords.y;
                this.smoothedX = coords.x;
                this.smoothedY = coords.y;
                this.lastMidX = coords.x;
                this.lastMidY = coords.y;

                this.drawPoint(coords.x, coords.y);
                WigglyAudio.play('squeak');
            }

            draw(e) {
                if (!this.isDrawing) return;
                e.preventDefault();

                const events = (e.getCoalescedEvents && e.getCoalescedEvents().length > 0) ? e.getCoalescedEvents() : [e];

                for (let i = 0; i < events.length; i++) {
                    const coords = this.getCanvasCoordinates(events[i]);
                    
                    let targetX = coords.x;
                    let targetY = coords.y;

                    if (this.stabilizerLevel > 0) {
                        const alpha = Math.max(0.015, Math.pow(0.65, this.stabilizerLevel));
                        this.smoothedX += (coords.x - this.smoothedX) * alpha;
                        this.smoothedY += (coords.y - this.smoothedY) * alpha;
                        targetX = this.smoothedX;
                        targetY = this.smoothedY;
                    }
                    
                    const midX = (this.lastX + targetX) / 2;
                    const midY = (this.lastY + targetY) / 2;

                    this.drawSmoothPixelSegment(this.lastMidX, this.lastMidY, this.lastX, this.lastY, midX, midY);

                    this.lastX = targetX;
                    this.lastY = targetY;
                    this.lastMidX = midX;
                    this.lastMidY = midY;
                }

                WigglyAudio.play('squeak');
            }

            stopDrawing(e) {
                if (this.isDrawing) {
                    this.isDrawing = false;
                    if (e.target && e.target.releasePointerCapture && e.pointerId !== undefined) {
                        try { e.target.releasePointerCapture(e.pointerId); } catch(err) {}
                    }
                }
            }

            drawPoint(x, y) {
                const props = this.getToolProps(this.currentTool);
                
                const points = [{x, y}];
                if (this.isHorizontalMirror) points.push({x: WigglyEngine.width - x, y});
                if (this.isVerticalMirror) points.push({x, y: WigglyEngine.height - y});
                if (this.isHorizontalMirror && this.isVerticalMirror) points.push({x: WigglyEngine.width - x, y: WigglyEngine.height - y});

                for (let f = 0; f < WigglyConfig.NUM_FRAMES; f++) {
                    const jx = (Math.random() - 0.5) * props.jitter * 1.5;
                    const jy = (Math.random() - 0.5) * props.jitter * 1.5;

                    points.forEach(pt => {
                        if (this.currentTool === 'eraser') {
                            WigglyEngine.drawPixelStamp(WigglyEngine.baseFrameCtxs[f], pt.x, pt.y, props, jx, jy, f);
                            WigglyEngine.drawMarkerStamp(f, pt.x + jx, pt.y + jy, props.size, this.brushTipShape, 0);
                        } else if (this.currentTool === 'marker_eraser') {
                            WigglyEngine.drawMarkerStamp(f, pt.x + jx, pt.y + jy, props.size, this.brushTipShape, 0);
                        } else if (WigglyConfig.markerKeys.includes(this.currentTool)) {
                            const markerId = WigglyConfig.markerIdMap[this.currentTool];
                            WigglyEngine.drawMarkerStamp(f, pt.x + jx, pt.y + jy, props.size, this.brushTipShape, markerId);
                        } else {
                            WigglyEngine.drawPixelStamp(WigglyEngine.baseFrameCtxs[f], pt.x, pt.y, props, jx, jy, f);
                        }
                    });
                }
            }

            drawSmoothPixelSegment(p0x, p0y, p1x, p1y, p2x, p2y) {
                const curves = [{ p0x, p0y, p1x, p1y, p2x, p2y }];

                if (this.isHorizontalMirror) {
                    curves.push({
                        p0x: WigglyEngine.width - p0x, p0y,
                        p1x: WigglyEngine.width - p1x, p1y,
                        p2x: WigglyEngine.width - p2x, p2y
                    });
                }

                if (this.isVerticalMirror) {
                    curves.push({
                        p0x, p0y: WigglyEngine.height - p0y,
                        p1x, p1y: WigglyEngine.height - p1y,
                        p2x, p2y: WigglyEngine.height - p2y
                    });
                }

                if (this.isHorizontalMirror && this.isVerticalMirror) {
                    curves.push({
                        p0x: WigglyEngine.width - p0x, p0y: WigglyEngine.height - p0y,
                        p1x: WigglyEngine.width - p1x, p1y: WigglyEngine.height - p1y,
                        p2x: WigglyEngine.width - p2x, p2y: WigglyEngine.height - p2y
                    });
                }

                curves.forEach(c => {
                    this.drawSingleBezierSegment(c.p0x, c.p0y, c.p1x, c.p1y, c.p2x, c.p2y);
                });
            }

            drawSingleBezierSegment(p0x, p0y, p1x, p1y, p2x, p2y) {
                const props = this.getToolProps(this.currentTool);

                const dist = Math.hypot(p1x - p0x, p1y - p0y) + Math.hypot(p2x - p1x, p2y - p1y);
                const minStep = Math.max(1, Math.floor(props.size / 4));
                const steps = Math.max(1, Math.ceil(dist / minStep));

                const jitters = [];
                for (let f = 0; f < WigglyConfig.NUM_FRAMES; f++) {
                    jitters.push({
                        jx: (Math.random() - 0.5) * props.jitter * 1.5,
                        jy: (Math.random() - 0.5) * props.jitter * 1.5
                    });
                }

                for (let s = 0; s <= steps; s++) {
                    const t = s / steps;
                    const invT = 1 - t;

                    const cx = invT * invT * p0x + 2 * invT * t * p1x + t * t * p2x;
                    const cy = invT * invT * p0y + 2 * invT * t * p1y + t * t * p2y;

                    for (let f = 0; f < WigglyConfig.NUM_FRAMES; f++) {
                        if (this.currentTool === 'eraser') {
                            WigglyEngine.drawPixelStamp(WigglyEngine.baseFrameCtxs[f], cx, cy, props, jitters[f].jx, jitters[f].jy, f);
                            WigglyEngine.drawMarkerStamp(f, cx + jitters[f].jx, cy + jitters[f].jy, props.size, this.brushTipShape, 0);
                        } else if (this.currentTool === 'marker_eraser') {
                            WigglyEngine.drawMarkerStamp(f, cx + jitters[f].jx, cy + jitters[f].jy, props.size, this.brushTipShape, 0);
                        } else if (WigglyConfig.markerKeys.includes(this.currentTool)) {
                            const markerId = WigglyConfig.markerIdMap[this.currentTool];
                            WigglyEngine.drawMarkerStamp(f, cx + jitters[f].jx, cy + jitters[f].jy, props.size, this.brushTipShape, markerId);
                        } else {
                            WigglyEngine.drawPixelStamp(WigglyEngine.baseFrameCtxs[f], cx, cy, props, jitters[f].jx, jitters[f].jy, f);
                        }
                    }
                }
            }

            bindCanvasInputEvents() {
                const canvas = WigglyEngine.visibleCanvas;
                if (window.PointerEvent) {
                    canvas.addEventListener('pointerdown', e => this.startDrawing(e));
                    canvas.addEventListener('pointermove', e => this.draw(e));
                    window.addEventListener('pointerup', e => this.stopDrawing(e));
                    window.addEventListener('pointercancel', e => this.stopDrawing(e));
                } else {
                    canvas.addEventListener('mousedown', e => this.startDrawing(e));
                    canvas.addEventListener('mousemove', e => this.draw(e));
                    window.addEventListener('mouseup', e => this.stopDrawing(e));

                    canvas.addEventListener('touchstart', e => this.startDrawing(e), { passive: false });
                    canvas.addEventListener('touchmove', e => this.draw(e), { passive: false });
                    window.addEventListener('touchend', e => this.stopDrawing(e));
                }
            }
        }
        const WigglyTools = new WigglyToolsModule();
