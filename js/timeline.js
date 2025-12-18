// timeline.js - Fixed version with proper rendering

class Timeline {
    constructor(app) {
        this.app = app;
        this.canvas = null;
        this.ctx = null;
        this.width = 0;
        this.height = 0;

        this.zoom = 100;
        this.offsetX = 0;
        this.playheadPosition = 0;
        this.isPlaying = false;
        this.playbackStartTime = 0;

        this.isDragging = false;
        this.draggedLayer = null;
        this.dragStartX = 0;
        this.dragStartTime = 0;
        this.dragMode = null; // 'move', 'left', 'right'

        this.trackHeight = 60;
        this.trackPadding = 5;
        this.rulerHeight = 30;
        this.totalLength = 5; // seconds (user can change)
    }

    init() {
        this.canvas = document.getElementById('timeline-canvas');
        if (!this.canvas) {
            console.error('Timeline canvas not found');
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        this.setupEventListeners();
        this.render();
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', e => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', e => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('wheel', e => this.onWheel(e), { passive: true });
        window.addEventListener('resize', () => this.resize());
        document.addEventListener('layersChanged', () => this.render());
    }

    resize() {
        const container = this.canvas.parentElement;
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.render();
    }

    render() {
        if (!this.ctx) return;
        
        // Clear canvas
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.drawRuler();
        this.drawTracks();
        if (this.isPlaying || this.playheadPosition > 0) this.drawPlayhead();
    }

    drawRuler() {
        const y = this.rulerHeight;
        this.ctx.fillStyle = '#16213e';
        this.ctx.fillRect(0, 0, this.width, y);
        this.ctx.strokeStyle = '#00ff41';
        this.ctx.fillStyle = '#e0e7ff';
        this.ctx.font = '11px sans-serif';
        this.ctx.textAlign = 'center';

        const secondWidth = this.zoom;
        const visibleSeconds = this.width / secondWidth;
        const startSecond = Math.max(0, -this.offsetX / secondWidth);
        const endSecond = Math.min(this.totalLength, startSecond + visibleSeconds);

        for (let i = Math.floor(startSecond); i <= Math.ceil(endSecond); i++) {
            if (i > this.totalLength) break;
            const x = i * secondWidth + this.offsetX;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y - 15);
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
            this.ctx.fillText(`${i}s`, x, y - 18);
        }

        // End marker
        const endX = this.totalLength * secondWidth + this.offsetX;
        this.ctx.strokeStyle = '#ff006e';
        this.ctx.beginPath();
        this.ctx.moveTo(endX, 0);
        this.ctx.lineTo(endX, y);
        this.ctx.stroke();

        this.ctx.strokeStyle = '#00ff41';
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.width, y);
        this.ctx.stroke();
    }

    drawTracks() {
        if (!this.app || !this.app.layerManager || !this.app.layerManager.layers) {
            console.error('LayerManager or layers not available');
            return;
        }

        const layers = this.app.layerManager.layers;
        const startY = this.rulerHeight;

        layers.forEach((layer, index) => {
            const y = startY + index * (this.trackHeight + this.trackPadding);
            this.drawTrack(layer, y);
        });
    }

    drawTrack(layer, y) {
        if (!layer || !layer.settings) {
            console.error('Invalid layer', layer);
            return;
        }

        const duration = this.app.soundGenerator.calculateDuration(layer.settings);
        const x = layer.startTime * this.zoom + this.offsetX;
        const width = duration * this.zoom;

        // Track background
        this.ctx.fillStyle = '#2d3748';
        this.ctx.fillRect(0, y, this.width, this.trackHeight);

        // Layer name and duration
        this.ctx.fillStyle = '#e0e7ff';
        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(layer.name, 10, y + 20);
        
        // Show duration and volume
        this.ctx.font = '11px sans-serif';
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.fillText(`${duration.toFixed(2)}s | Vol: ${(layer.volume * 100).toFixed(0)}%`, 10, y + 35);

        // Only draw waveform if it's visible
        if (x + width > 0 && x < this.width && width > 2) {
            // Draw colored block
            this.ctx.fillStyle = layer.color;
            this.ctx.globalAlpha = layer.muted ? 0.25 : 0.7;
            this.ctx.fillRect(x, y + 5, width, this.trackHeight - 10);
            this.ctx.globalAlpha = 1;

            // Border + selection highlight
            this.ctx.strokeStyle = layer.id === this.app.layerManager.selectedLayerId ? '#00ff41' : '#666';
            this.ctx.lineWidth = layer.id === this.app.layerManager.selectedLayerId ? 3 : 1;
            this.ctx.strokeRect(x, y + 5, width, this.trackHeight - 10);
            this.ctx.lineWidth = 1;

            // Resize handles
            if (layer.id === this.app.layerManager.selectedLayerId) {
                this.ctx.fillStyle = '#00ff41';
                this.ctx.fillRect(x - 4, y + 5, 8, this.trackHeight - 10);
                this.ctx.fillRect(x + width - 4, y + 5, 8, this.trackHeight - 10);
            }

            // WAVEFORM VISUALIZATION - Only draw if width is reasonable
            if (width > 10) {
                try {
                    const buffer = this.app.soundGenerator.generate(layer.settings, 44100);
                    if (!buffer || !buffer.getChannelData) {
                        throw new Error('Invalid audio buffer');
                    }
                    
                    const raw = buffer.getChannelData(0);
                    const samples = raw.length;
                    
                    if (samples === 0) {
                        throw new Error('Empty audio buffer');
                    }
                    
                    const amp = (this.trackHeight - 16) / 2;

                    this.ctx.save();
                    this.ctx.translate(x, y + 5 + (this.trackHeight - 10) / 2);
                    this.ctx.strokeStyle = layer.id === this.app.layerManager.selectedLayerId ? '#ffffff' : '#e0e7ff';
                    this.ctx.lineWidth = layer.id === this.app.layerManager.selectedLayerId ? 2 : 1.2;
                    this.ctx.globalAlpha = layer.muted ? 0.4 : 0.9;

                    this.ctx.beginPath();
                    let first = true;

                    for (let i = 0; i < width; i += 1) {
                        const sampleIndex = Math.floor(i * samples / width);
                        const val = raw[sampleIndex] || 0;
                        const h = val * amp;

                        if (first) {
                            this.ctx.moveTo(i, h);
                            first = false;
                        } else {
                            this.ctx.lineTo(i, h);
                        }
                    }

                    // Mirror for symmetric waveform
                    for (let i = width; i >= 0; i -= 1) {
                        const sampleIndex = Math.floor(i * samples / width);
                        const val = raw[sampleIndex] || 0;
                        const h = val * amp;
                        this.ctx.lineTo(i, -h);
                    }

                    this.ctx.closePath();
                    this.ctx.stroke();
                    this.ctx.restore();
                } catch (e) {
                    console.error('Error drawing waveform:', e);
                    // Fallback: just draw a simple pulse
                    this.ctx.fillStyle = '#ffffff44';
                    this.ctx.fillRect(x + width * 0.3, y + 15, width * 0.4, 20);
                }
            }

            // Mute indicator
            if (layer.muted) {
                this.ctx.fillStyle = '#f44336';
                this.ctx.font = 'bold 14px sans-serif';
                this.ctx.fillText('M', this.width - 30, y + 25);
            }
        }
    }

    drawPlayhead() {
        const x = this.playheadPosition * this.zoom + this.offsetX;
        if (x >= 0 && x <= this.width) {
            this.ctx.strokeStyle = '#f44336';
            this.ctx.lineWidth = 2;
            this.ctx.shadowColor = '#f44336';
            this.ctx.shadowBlur = 10;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
        }
    }

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (y < this.rulerHeight) {
            this.playheadPosition = Math.max(0, Math.min(this.totalLength, (x - this.offsetX) / this.zoom));
            this.render();
            return;
        }

        const layer = this.getLayerAtPosition(x, y);
        if (layer) {
            const layerX = layer.startTime * this.zoom + this.offsetX;
            const layerRight = layerX + this.app.soundGenerator.calculateDuration(layer.settings) * this.zoom;

            if (e.detail === 2) {
                this.app.layerManager.selectLayer(layer.id);
                document.querySelector('[data-tab="settings"]').click();
                return;
            }

            this.app.layerManager.selectLayer(layer.id);

            if (Math.abs(x - layerX) < 10) {
                this.dragMode = 'left';
                this.canvas.style.cursor = 'w-resize';
            } else if (Math.abs(x - layerRight) < 10) {
                this.dragMode = 'right';
                this.canvas.style.cursor = 'e-resize';
            } else if (x >= layerX && x <= layerRight) {
                this.dragMode = 'move';
                this.canvas.style.cursor = 'move';
            }

            if (this.dragMode) {
                this.isDragging = true;
                this.draggedLayer = layer;
                this.dragStartX = x;
                this.dragStartTime = layer.startTime;
            }
        }
    }

    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Handle cursor changes when hovering over clip edges
        if (!this.isDragging) {
            const layer = this.getLayerAtPosition(x, y);
            if (layer) {
                const layerX = layer.startTime * this.zoom + this.offsetX;
                const layerRight = layerX + this.app.soundGenerator.calculateDuration(layer.settings) * this.zoom;

                if (Math.abs(x - layerX) < 10) {
                    this.canvas.style.cursor = 'w-resize';
                    return;
                } else if (Math.abs(x - layerRight) < 10) {
                    this.canvas.style.cursor = 'e-resize';
                    return;
                } else if (x >= layerX && x <= layerRight) {
                    this.canvas.style.cursor = 'move';
                    return;
                }
            }
            // Reset cursor if not hovering over any clip
            this.canvas.style.cursor = 'default';
        }

        // Handle dragging if in progress
        if (!this.isDragging || !this.draggedLayer) return;

        // Snap to 0.1 second grid for finer control
        const snapInterval = 0.1;
        let deltaX = x - this.dragStartX;
        let deltaTime = deltaX / this.zoom;

        // Snap deltaTime to nearest 0.1 second
        deltaTime = Math.round(deltaTime / snapInterval) * snapInterval;

        const currentDuration = this.app.soundGenerator.calculateDuration(this.draggedLayer.settings);
        let newStart = this.dragStartTime;
        let newDuration = currentDuration;

        if (this.dragMode === 'move') {
            newStart = Math.max(0, this.dragStartTime + deltaTime);
            // Snap newStart
            newStart = Math.round(newStart / snapInterval) * snapInterval;
        } else if (this.dragMode === 'left') {
            newStart = Math.max(0, this.dragStartTime + deltaTime);
            // Snap newStart
            newStart = Math.round(newStart / snapInterval) * snapInterval;
            newDuration = currentDuration - (newStart - this.dragStartTime);
        } else if (this.dragMode === 'right') {
            // Limit extension to cursor position only
            const maxDuration = Math.max(0, (x - this.offsetX) / this.zoom - this.draggedLayer.startTime);
            newDuration = Math.min(currentDuration + deltaTime, maxDuration);
        }

        // Enforce minimum duration of 0.05 seconds
        const minDuration = 0.05;
        if (newDuration < minDuration) {
            newDuration = minDuration;
        }

        // Snap newDuration to 0.1 second intervals
        newDuration = Math.round(newDuration / snapInterval) * snapInterval;
        if (newDuration < minDuration) newDuration = minDuration;

        // Ensure we don't exceed total length
        if (newStart + newDuration > this.totalLength) {
            newDuration = this.totalLength - newStart;
            if (newDuration < minDuration) {
                newStart = this.totalLength - minDuration;
                newDuration = minDuration;
            }
        }

        // Update layer settings to change duration
        const oldSettings = this.draggedLayer.settings;
        const totalOld = oldSettings.attack + oldSettings.sustain + oldSettings.decay;
        const ratio = newDuration / totalOld;

        const newSettings = {
            attack: oldSettings.attack * ratio,
            sustain: oldSettings.sustain * ratio,
            decay: oldSettings.decay * ratio
        };

        this.app.layerManager.updateLayer(this.draggedLayer.id, { startTime: newStart });
        this.app.layerManager.updateLayerSettings(this.draggedLayer.id, newSettings);

        this.render();
    }

    onMouseUp() {
        if (this.isDragging) {
            // Save undo state after dragging
            this.app.saveUndoState();
        }

        this.isDragging = false;
        this.draggedLayer = null;
        this.dragMode = null;

        // Reset cursor after dragging
        this.canvas.style.cursor = 'default';
    }

    onWheel(e) {
        e.preventDefault();
        if (e.ctrlKey) {
            this.zoom = Math.max(20, Math.min(500, this.zoom * (e.deltaY > 0 ? 0.9 : 1.1)));
        } else {
            this.offsetX -= e.deltaX;
            this.offsetX = Math.min(0, this.offsetX);
        }
        this.render();
    }

    getLayerAtPosition(x, y) {
        const layers = this.app.layerManager.layers;
        const startY = this.rulerHeight;

        for (let i = 0; i < layers.length; i++) {
            const layer = layers[i];
            const trackY = startY + i * (this.trackHeight + this.trackPadding);
            if (y >= trackY && y < trackY + this.trackHeight) {
                const duration = this.app.soundGenerator.calculateDuration(layer.settings);
                const layerX = layer.startTime * this.zoom + this.offsetX;
                const layerWidth = duration * this.zoom;
                if (x >= layerX - 10 && x <= layerX + layerWidth + 10) {
                    return layer;
                }
            }
        }
        return null;
    }

    startPlayback() {
        this.isPlaying = true;
        this.playbackStartTime = Date.now();
        this.animatePlayback();
    }

    stopPlayback() {
        this.isPlaying = false;
        this.app.audioEngine.stopAll();
        this.playheadPosition = 0;
        this.render();
    }

    animatePlayback() {
        if (!this.isPlaying) return;
        const elapsed = (Date.now() - this.playbackStartTime) / 1000;
        this.playheadPosition = elapsed;
        if (this.playheadPosition >= this.totalLength) {
            this.stopPlayback();
            return;
        }
        this.render();
        requestAnimationFrame(() => this.animatePlayback());
    }

    getState() {
        return { zoom: this.zoom, offsetX: this.offsetX, totalLength: this.totalLength };
    }

    setState(state) {
        this.zoom = state.zoom || 100;
        this.offsetX = state.offsetX || 0;
        this.totalLength = state.totalLength || 5;
        this.render();
    }
}
