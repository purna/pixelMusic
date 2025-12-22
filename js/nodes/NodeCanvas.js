/**
 * NodeCanvas.js
 * Handles canvas interactions, panning, zooming, and coordinate systems.
 */
class NodeCanvas {
    constructor(manager) {
        this.manager = manager;
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isPanning = false;
        this.panToolActive = true;
        this.lastPanX = 0;
        this.lastPanY = 0;
    }

    init() {
        this.bindCanvasControls();

        // Initialize canvas zoom level display and pan tool
        setTimeout(() => {
            const zoomLevel = document.getElementById('zoom-level');
            if (zoomLevel) {
                zoomLevel.textContent = '100%';
            }
            this.updatePanToolButton();
        }, 100);
    }

    bindCanvasControls() {
        // Zoom controls
        document.getElementById('zoom-in')?.addEventListener('click', () => {
            this.zoomIn();
        });

        document.getElementById('zoom-out')?.addEventListener('click', () => {
            this.zoomOut();
        });

        // Pan tool toggle
        const panToolBtn = document.getElementById('pan-tool');
        if (panToolBtn) {
            panToolBtn.addEventListener('click', () => {
                this.togglePanTool();
            });
        }

        // Canvas panning with mouse
        const canvas = document.getElementById('canvas-content');
        if (canvas) {
            // Start panning when pan tool is active
            canvas.addEventListener('mousedown', (e) => {
                if (this.panToolActive && e.button === 0) {
                    this.startPanning(e);
                }
            });

            document.addEventListener('mousemove', (e) => {
                if (this.isPanning) {
                    this.updatePanning(e);
                }
            });

            document.addEventListener('mouseup', () => {
                this.stopPanning();
            });

            // Zoom with mouse wheel
            canvas.addEventListener('wheel', (e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                this.zoom(delta, e.clientX, e.clientY);
            });
        }
    }

    zoomIn() {
        this.zoom(0.1);
    }

    zoomOut() {
        this.zoom(-0.1);
    }

    zoom(delta, centerX = null, centerY = null) {
        const newScale = Math.max(0.1, Math.min(3, this.scale + delta));

        if (centerX !== null && centerY !== null) {
            // Zoom towards cursor position
            const canvas = document.getElementById('canvas-content');
            const rect = canvas.getBoundingClientRect();
            const canvasX = centerX - rect.left;
            const canvasY = centerY - rect.top;

            // Adjust offset to zoom towards cursor
            this.offsetX = canvasX - (canvasX - this.offsetX) * (newScale / this.scale);
            this.offsetY = canvasY - (canvasY - this.offsetY) * (newScale / this.scale);
        }

        this.scale = newScale;
        this.updateCanvasTransform();
    }

    resetZoom() {
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.updateCanvasTransform();
    }

    togglePanTool() {
        this.panToolActive = !this.panToolActive;
        this.updatePanToolButton();
        this.manager.updateStatus(this.panToolActive ? 'Pan tool active - Click and drag to move canvas' : 'Pan tool inactive - Select nodes to interact');
    }

    updatePanToolButton() {
        const panToolBtn = document.getElementById('pan-tool');
        const canvas = document.getElementById('canvas-content');

        if (panToolBtn) {
            if (this.panToolActive) {
                panToolBtn.classList.add('active');
                panToolBtn.innerHTML = '<i class="fas fa-hand-paper"></i>';
                panToolBtn.title = 'Pan Tool (Active - Click and drag to move canvas)';
                if (canvas) {
                    canvas.classList.add('pan-tool-active');
                }
            } else {
                panToolBtn.classList.remove('active');
                panToolBtn.innerHTML = '<i class="fas fa-mouse-pointer"></i>';
                panToolBtn.title = 'Select Tool (Inactive - Click nodes to interact)';
                if (canvas) {
                    canvas.classList.remove('pan-tool-active');
                }
            }
        }
    }

    startPanning(event) {
        this.isPanning = true;
        this.lastPanX = event.clientX;
        this.lastPanY = event.clientY;

        document.body.style.cursor = 'grabbing';
        event.preventDefault();
    }

    updatePanning(event) {
        const deltaX = event.clientX - this.lastPanX;
        const deltaY = event.clientY - this.lastPanY;

        this.offsetX += deltaX;
        this.offsetY += deltaY;

        this.lastPanX = event.clientX;
        this.lastPanY = event.clientY;

        this.updateCanvasTransform();
    }

    stopPanning() {
        if (this.isPanning) {
            this.isPanning = false;
            document.body.style.cursor = '';
        }
    }

    updateCanvasTransform() {
        const canvas = document.getElementById('canvas-content');
        if (canvas) {
            const transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;
            canvas.style.transform = transform;

            // Add zoomed class when not at 100%
            if (this.scale !== 1) {
                canvas.classList.add('zoomed');
            } else {
                canvas.classList.remove('zoomed');
            }

            // Update zoom level display
            const zoomLevel = document.getElementById('zoom-level');
            if (zoomLevel) {
                zoomLevel.textContent = `${Math.round(this.scale * 100)}%`;
            }

            // Update all connection positions when zoomed/panned
            this.manager.connections.updateAllConnections();
        }
    }
}
