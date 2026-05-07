/**
 * NodeSearch Class
 * Handles searching for nodes and adding them to the canvas
 */
class NodeSearch {
    constructor(nodeManager, menuData) {
        this.nodeManager = nodeManager;
        this.menuData = menuData || null;
        this.searchResults = [];
        this.selectedResultIndex = -1;
        this.lastClickPosition = null;
        this.lastAddedPosition = null;
        this.nodeOffset = 30;

        // DOM elements
        this.searchInput = document.getElementById('node-search-input');
        this.searchBtn = document.getElementById('node-search-btn');
        this.searchResultsContainer = document.getElementById('search-results');
        this.searchToolbar = document.querySelector('.canvas-search-toolbar');
        this.canvas = document.getElementById('node-canvas');
        this.contextMenu = document.getElementById('canvas-context-menu');

        this.init();
    }

    init() {
        this.loadMenuData();
        this.bindEvents();
    }

    loadMenuData() {
        if (window.menuLoader?.menuData) {
            this.menuData = window.menuLoader.menuData;
        } else if (window.app?.menuData) {
            this.menuData = window.app.menuData;
        }
    }

    bindEvents() {
        // Search button
        this.searchBtn?.addEventListener('click', () => this.performSearch());

        // Search input
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => this.performSearch());

            this.searchInput.addEventListener('keydown', (e) => {
                switch (e.key) {
                    case 'Enter':
                        e.preventDefault();
                        this.performSearch();
                        break;
                    case 'Escape':
                        this.hideSearchToolbar();
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        this.navigateResults(1);
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        this.navigateResults(-1);
                        break;
                }
            });
        }

        // Single document click handler covers both "click outside search" and
        // "click outside context menu" — avoids registering two listeners.
        document.addEventListener('click', (e) => {
            if (this.searchToolbar && !this.searchToolbar.contains(e.target)) {
                this.hideSearchResults();
            }
            if (this.contextMenu && !this.contextMenu.contains(e.target)) {
                this.hideContextMenu();
            }
        });

        if (this.canvas) {
            this.canvas.addEventListener('click', (e) => {
                this.storeClickPosition(e);
                this.hideContextMenu();
            });

            this.canvas.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.storeClickPosition(e);
                this.showContextMenu(e.clientX, e.clientY);
            });
        }

        this.contextMenu?.addEventListener('click', (e) => {
            const menuItem = e.target.closest('.context-menu-item');
            if (menuItem) {
                this.handleContextMenuAction(menuItem.dataset.action);
            }
        });
    }

    // -------------------------------------------------------------------------
    // Position tracking
    // -------------------------------------------------------------------------

    storeClickPosition(e) {
        const canvas = this.nodeManager?.canvas;
        if (!this.canvas || !canvas) return;

        const canvasRect = this.canvas.getBoundingClientRect();
        const { scale = 1, x: panX = 0, y: panY = 0 } = canvas;

        this.lastClickPosition = {
            x: (e.clientX - canvasRect.left) / scale + panX,
            y: (e.clientY - canvasRect.top) / scale + panY,
        };
    }

    // -------------------------------------------------------------------------
    // Search toolbar
    // -------------------------------------------------------------------------

    toggleSearchToolbar() {
        if (this.searchToolbar?.classList.contains('active')) {
            this.hideSearchToolbar();
        } else {
            this.showSearchToolbar();
        }
    }

    showSearchToolbar() {
        this.searchToolbar?.classList.add('active');
        if (this.searchInput) {
            this.searchInput.focus();
            this.searchInput.select();
        }
        // Position will come from canvas centre, not a stale click
        this.lastClickPosition = null;
    }

    hideSearchToolbar() {
        this.searchToolbar?.classList.remove('active');
        this.hideSearchResults();
        if (this.searchInput) this.searchInput.value = '';
    }

    // -------------------------------------------------------------------------
    // Search logic
    // -------------------------------------------------------------------------

    performSearch() {
        const query = this.searchInput?.value.trim().toLowerCase() ?? '';

        if (!query) {
            this.hideSearchResults();
            return;
        }

        this.searchResults = this.findNodes(query);
        this.displaySearchResults();
    }

    findNodes(query) {
        const results = [];

        // 1. Menu data
        if (this.menuData?.menus) {
            for (const menu of this.menuData.menus) {
                for (const group of menu.groups) {
                    for (const item of group.items) {
                        const itemId    = typeof item === 'string' ? item : item.id;
                        const itemLabel = typeof item === 'string' ? item : item.label;
                        const itemType  = group.nodeType || menu.id;

                        if (itemId.toLowerCase().includes(query) ||
                            itemLabel.toLowerCase().includes(query)) {
                            results.push({
                                id: itemId,
                                label: itemLabel,
                                type: itemType,
                                category: menu.id,
                                group: group.label,
                            });
                        }
                    }
                }
            }
        }

        // 2. Node schemas
        if (this.nodeManager) {
            const searchInSchema = (schema, category) => {
                if (!schema) return;
                for (const [nodeId, nodeDef] of Object.entries(schema)) {
                    const nodeTitle    = nodeDef.title || nodeId;
                    const nodeCategory = nodeDef.category || category;

                    if (nodeId.toLowerCase().includes(query) ||
                        nodeTitle.toLowerCase().includes(query)) {
                        if (!results.some(r => r.id === nodeId)) {
                            results.push({
                                id: nodeId,
                                label: nodeTitle,
                                type: nodeId,
                                category: nodeCategory || 'nodes',
                                group: nodeCategory || 'Nodes',
                            });
                        }
                    }
                }
            };

            const { nodeSchema, propertySchema } = this.nodeManager;
            if (nodeSchema) {
                searchInSchema(nodeSchema.nodes, 'nodes');
                searchInSchema(nodeSchema.transformNodes, 'transform');
                searchInSchema(nodeSchema.controlNodes, 'control');
            }
            if (propertySchema) {
                searchInSchema(propertySchema.nodes, 'properties');
                searchInSchema(propertySchema.transformNodes, 'properties');
            }
        }

        // 3. Built-in fallback for very short queries with no schema hits
        if (results.length === 0 && query.length <= 3) {
            const defaults = [
                { id: 'sine',     label: 'Sine Wave',        type: 'Instrument', category: 'instruments', group: 'Basic' },
                { id: 'square',   label: 'Square Wave',       type: 'Instrument', category: 'instruments', group: 'Basic' },
                { id: 'sawtooth', label: 'Sawtooth',          type: 'Instrument', category: 'instruments', group: 'Basic' },
                { id: 'triangle', label: 'Triangle',          type: 'Instrument', category: 'instruments', group: 'Basic' },
                { id: 'piano',    label: 'Piano',             type: 'Instrument', category: 'instruments', group: 'Instruments' },
                { id: 'bd',       label: 'Bass Drum',         type: 'DrumSymbol', category: 'drums',       group: 'Drums' },
                { id: 'sd',       label: 'Snare Drum',        type: 'DrumSymbol', category: 'drums',       group: 'Drums' },
                { id: 'hh',       label: 'Hi-Hat',            type: 'DrumSymbol', category: 'drums',       group: 'Drums' },
                { id: 'lpf',      label: 'Low Pass Filter',   type: 'Effect',     category: 'effects',     group: 'Filters' },
                { id: 'hpf',      label: 'High Pass Filter',  type: 'Effect',     category: 'effects',     group: 'Filters' },
                { id: 'delay',    label: 'Delay',             type: 'Effect',     category: 'effects',     group: 'Time' },
                { id: 'reverb',   label: 'Reverb',            type: 'Effect',     category: 'effects',     group: 'Space' },
            ];

            for (const node of defaults) {
                if (node.id.includes(query) || node.label.toLowerCase().includes(query)) {
                    results.push(node);
                }
            }
        }

        return results.slice(0, 10);
    }

    // -------------------------------------------------------------------------
    // Results display
    // -------------------------------------------------------------------------

    displaySearchResults() {
        if (!this.searchResultsContainer) return;

        if (this.searchResults.length === 0) {
            this.searchResultsContainer.innerHTML =
                '<div class="search-result-item">No results found</div>';
            this.searchResultsContainer.style.display = 'block';
            return;
        }

        this.searchResultsContainer.innerHTML = this.searchResults
            .map((result, index) => `
                <div class="search-result-item ${index === this.selectedResultIndex ? 'selected' : ''}"
                     data-index="${index}">
                    <div class="result-name">${NodeSearch.escapeHtml(result.label)}</div>
                    <div class="result-category">${NodeSearch.escapeHtml(result.group)} • ${NodeSearch.escapeHtml(result.type)}</div>
                </div>
            `)
            .join('');

        this.searchResultsContainer.style.display = 'block';

        this.searchResultsContainer.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.addNodeFromSearch(parseInt(e.currentTarget.dataset.index, 10));
            });
        });
    }

    hideSearchResults() {
        if (this.searchResultsContainer) {
            this.searchResultsContainer.style.display = 'none';
        }
        this.selectedResultIndex = -1;
    }

    navigateResults(direction) {
        if (!this.searchResults.length) return;

        this.selectedResultIndex =
            (this.selectedResultIndex + direction + this.searchResults.length) %
            this.searchResults.length;

        this.displaySearchResults();

        // Scroll selected item into view
        const selected = this.searchResultsContainer?.querySelector('.search-result-item.selected');
        selected?.scrollIntoView({ block: 'nearest' });
    }

    // -------------------------------------------------------------------------
    // Node creation
    // -------------------------------------------------------------------------

    addNodeFromSearch(index) {
        if (index < 0 || index >= this.searchResults.length) return;
        const result = this.searchResults[index];
        this.addNode(result.type, result.id, result.label, null);
        this.hideSearchToolbar();
    }

    addNode(type, instrument, label, position = null) {
        if (!this.nodeManager) {
            console.error('NodeSearch: NodeManager not available');
            return;
        }

        const canvas = this.nodeManager.canvas;
        if (!canvas) {
            console.error('NodeSearch: nodeManager.canvas not available');
            return;
        }

        const { scale = 1, x: panX = 0, y: panY = 0 } = canvas;
        let x, y;

        if (position) {
            ({ x, y } = position);
        } else if (this.lastClickPosition) {
            ({ x, y } = this.lastClickPosition);
        } else {
            const rect = this.canvas.getBoundingClientRect();
            x = (rect.width  / 2) / scale + panX;
            y = (rect.height / 2) / scale + panY;
        }

        // Nudge if too close to the last-placed node
        if (this.lastAddedPosition) {
            const dx = x - this.lastAddedPosition.x;
            const dy = y - this.lastAddedPosition.y;
            const distance = Math.hypot(dx, dy);

            if (distance < this.nodeOffset * 2) {
                const angle = ((this.nodeManager.nodes?.length ?? 0) * 0.5) % (Math.PI * 2);
                x += Math.cos(angle) * this.nodeOffset;
                y += Math.sin(angle) * this.nodeOffset;
            }
        }

        const node = this.nodeManager.createNode(type, instrument, x, y);

        if (node) {
            this.lastAddedPosition = { x, y };
            console.log(`NodeSearch: added ${type} "${instrument}" at (${x.toFixed(0)}, ${y.toFixed(0)})`);
            this.showStatusMessage(`Added ${label || instrument}`);
            setTimeout(() => this.nodeManager.selectNode(node), 100);
        }
    }

    // -------------------------------------------------------------------------
    // Context menu
    // -------------------------------------------------------------------------

    showContextMenu(x, y) {
        if (!this.contextMenu) return;

        // Make visible before measuring so getBoundingClientRect is accurate
        this.contextMenu.style.left = `${x}px`;
        this.contextMenu.style.top  = `${y}px`;
        this.contextMenu.classList.add('visible');

        const rect = this.contextMenu.getBoundingClientRect();
        if (rect.right  > window.innerWidth)  this.contextMenu.style.left = `${x - rect.width}px`;
        if (rect.bottom > window.innerHeight) this.contextMenu.style.top  = `${y - rect.height}px`;
    }

    hideContextMenu() {
        this.contextMenu?.classList.remove('visible');
    }

    handleContextMenuAction(action) {
        this.hideContextMenu();

        switch (action) {
            case 'add-node':
            case 'search-node':
                this.showSearchToolbar();
                this.searchInput?.focus();
                break;
            case 'add-sound':
                this.addNode('s', 'bd', 'Sound Pattern', this.lastClickPosition);
                break;
            case 'add-instrument':
                this.addNode('Instrument', 'sine',   'Sine Wave',       this.lastClickPosition);
                break;
            case 'add-effect':
                this.addNode('Effect',     'lpf',    'Low Pass Filter', this.lastClickPosition);
                break;
            case 'add-pattern':
                this.addNode('Repeater',   'repeat', 'Repeater',        this.lastClickPosition);
                break;
            default:
                console.warn(`NodeSearch: unknown context menu action "${action}"`);
        }
    }

    // -------------------------------------------------------------------------
    // Status
    // -------------------------------------------------------------------------

    showStatusMessage(message) {
        const el = document.getElementById('status-message');
        if (!el) return;

        const DEFAULT_MSG = 'Node Editor Ready - Click play buttons on nodes to test sounds';
        el.textContent = message;
        setTimeout(() => {
            if (el.textContent === message) el.textContent = DEFAULT_MSG;
        }, 3000);
    }

    // -------------------------------------------------------------------------
    // Utilities
    // -------------------------------------------------------------------------

    /** Prevent XSS when injecting user-derived strings into innerHTML */
    static escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /** Add a node directly by type/instrument without going through the search UI */
    addNodeByType(type, instrument) {
        this.addNode(type, instrument, instrument);
    }

    /** Pre-fill the search box and open the toolbar */
    searchAndAdd(query) {
        if (!this.searchInput) return;
        this.searchInput.value = query;
        this.showSearchToolbar();
        this.performSearch();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NodeSearch };
}