/**
 * Node Manager for Pixel Music Grid
 * Integrates with the existing index.html structure
 */

class NodeManager {
    constructor() {
        this.nodes = [];
        this.selectedNode = null;
        this.connections = [];
        this.audioInitialized = false;
        this.currentPattern = '';
        this.isConnecting = false;
        this.connectionStartNode = null;
        this.connectionPreview = null;
        this.propertySchema = null;
        this.nodeSchema = null;
        this.controlNodesSchema = null;
        this.graphNormalizer = null;
        this.instrumentList = [];
        
        // Canvas transformation state
        this.canvasScale = 1;
        this.canvasOffsetX = 0;
        this.canvasOffsetY = 0;
        this.isPanning = false;
        this.panToolActive = true;  // Pan tool is active by default
        this.lastPanX = 0;
        this.lastPanY = 0;
        
        this.init();
    }

    init() {
        console.log('Node Manager initializing...');
        this.loadPropertySchema();
        this.loadNodeSchema();
        this.bindEvents();
        this.updateStatus('Node Editor Ready - Click play buttons on nodes to test sounds');
        
        // Initialize delete button state
        this.updateDeleteButtonState();
        
        // Initialize canvas zoom level display and pan tool
        setTimeout(() => {
            const zoomLevel = document.getElementById('zoom-level');
            if (zoomLevel) {
                zoomLevel.textContent = '100%';
            }
            this.updatePanToolButton();
        }, 100);
        
        // Initialize audio on first user interaction
        document.getElementById('initAudioBtn')?.addEventListener('click', async () => {
            const btn = document.getElementById('initAudioBtn');
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Initializing...';
            }
            
            try {
                await this.initializeAudio();
            } finally {
                if (btn && !this.audioInitialized) {
                    btn.disabled = false;
                    btn.textContent = 'Enable Audio';
                }
            }
        });
        
        // Auto-initialize audio after a delay if Strudel loads
        setTimeout(async () => {
            if (typeof strudel !== 'undefined' && !this.audioInitialized) {
                try {
                    await this.initializeAudio();
                } catch (error) {
                    console.log('Auto-initialization failed:', error.message);
                }
            }
        }, 2000);
    }

    async loadPropertySchema() {
        try {
            // Load node properties schema
            const response = await fetch('strudel-node-properties.json');
            if (response.ok) {
                this.propertySchema = await response.json();
                console.log('Property schema loaded with', Object.keys(this.propertySchema.nodes || {}).length, 'node types and', Object.keys(this.propertySchema.transformNodes || {}).length, 'transform types');
            }
        } catch (error) {
            console.warn('Could not load property schema:', error);
        }

        try {
            // Load control nodes schema
            const controlResponse = await fetch('strudel-control-nodes.json');
            if (controlResponse.ok) {
                this.controlNodesSchema = await controlResponse.json();
                console.log('Control nodes schema loaded with', Object.keys(this.controlNodesSchema.controlNodes || {}).length, 'control node types');
            }
        } catch (error) {
            console.warn('Could not load control nodes schema:', error);
        }

        try {
            // Load instrument list from strudel-node-instruments.json
            const menuResponse = await fetch('strudel-node-instruments.json');
            if (menuResponse.ok) {
                const menuData = await menuResponse.json();
                this.extractInstrumentList(menuData);
            }
        } catch (error) {
            console.warn('Could not load instrument list:', error);
        }
    }

    async loadNodeSchema() {
        try {
            // Load new Strudel Node Schema
            const response = await fetch('strudel-node-schema.json');
            if (response.ok) {
                this.nodeSchema = await response.json();
                console.log('Node schema loaded with', Object.keys(this.nodeSchema.nodes).length, 'node types');
                
                // Initialize GraphNormalizer if available
                try {
                    if (typeof GraphNormalizer !== 'undefined') {
                        this.graphNormalizer = new GraphNormalizer(this.nodeSchema);
                        console.log('Graph normalizer initialized successfully');
                    } else {
                        console.log('Graph normalizer class not available - using basic normalization');
                        this.graphNormalizer = null;
                    }
                } catch (normalizerError) {
                    console.warn('Graph normalizer initialization failed:', normalizerError);
                    this.graphNormalizer = null;
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.warn('Could not load node schema:', error);
            this.nodeSchema = null;
            this.graphNormalizer = null;
        }
    }

    extractInstrumentList(menuData) {
        const instruments = [];
        
        menuData.menus.forEach(menu => {
            menu.groups.forEach(group => {
                group.items.forEach(item => {
                    if (typeof item === 'string') {
                        instruments.push(item);
                    } else if (item.id) {
                        instruments.push(item.id);
                    }
                });
            });
        });
        
        this.instrumentList = [...new Set(instruments)].sort();
        console.log('Instrument list extracted:', this.instrumentList.length, 'instruments');
    }

    bindEvents() {
        // Node canvas events
        const canvas = document.getElementById('canvas-content');
        if (canvas) {
            canvas.addEventListener('click', (e) => {
                if (e.target === canvas) {
                    this.clearSelection();
                }
            });
        }

        // Play controls
        document.getElementById('play-all-nodes')?.addEventListener('click', () => {
            this.playAllNodes();
        });

        document.getElementById('stop-all-nodes')?.addEventListener('click', () => {
            this.stopAllNodes();
        });

        document.getElementById('clear-nodes')?.addEventListener('click', () => {
            this.clearAllNodes();
        });

        document.getElementById('delete-selected-node')?.addEventListener('click', () => {
            this.deleteSelectedNode();
        });

        // Side panel events
        document.getElementById('side-panel-close')?.addEventListener('click', () => {
            this.hideSidePanel();
        });

        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && this.selectedNode) {
                this.deleteNode(this.selectedNode.id);
            }
            
            // Keyboard shortcuts for canvas controls
            if (e.target.tagName.toLowerCase() !== 'input' && e.target.tagName.toLowerCase() !== 'textarea') {
                switch (e.key) {
                    case '=':
                    case '+':
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            this.zoomIn();
                        }
                        break;
                    case '-':
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            this.zoomOut();
                        }
                        break;
                    case '0':
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            this.resetZoom();
                        }
                        break;
                    case ' ':
                        // Space bar to temporarily activate pan tool
                        if (!e.repeat && this.panToolActive) {
                            document.body.style.cursor = 'grab';
                        }
                        break;
                    case 'h':
                    case 'H':
                        // H key to toggle pan tool
                        if (!e.repeat) {
                            this.togglePanTool();
                        }
                        break;
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === ' ') {
                document.body.style.cursor = '';
            }
        });

        // Connection click events (for deletion)
        document.addEventListener('click', (e) => {
            if (e.target.closest('.connection-line')) {
                const connectionLine = e.target.closest('.connection-line');
                const connectionId = connectionLine.dataset.connectionId;
                if (e.shiftKey) {
                    this.removeConnection(connectionId);
                }
            }
        });

        // Canvas pan and zoom controls
        this.bindCanvasControls();
    }





    async initializeAudio() {
        try {
            this.updateStatus('Initializing audio...');
            
            // Check if Strudel is available
            if (typeof strudel === 'undefined') {
                this.updateStatus('Loading Strudel library from CDN...');
                await this.loadStrudelFromCDN();
            }

            // Double-check Strudel availability and structure
            if (!strudel) {
                throw new Error('Strudel library is not available after loading attempt');
            }
            
            if (typeof strudel.init !== 'function') {
                throw new Error('Strudel library is loaded but missing init method');
            }

            // Initialize strudel
            await strudel.init();
            this.audioInitialized = true;
            this.updateStatus('Audio initialized - Ready to play sounds');
            
            // Re-enable audio features if they were disabled
            this.enableAudioFeatures();
            
        } catch (error) {
            console.error('Audio initialization failed:', error);
            this.updateStatus('Audio initialization failed: ' + error.message + ' - Node editor will work without audio');
            
            // Disable audio-related UI elements
            this.disableAudioFeatures();
        }
    }

    enableAudioFeatures() {
        // Re-enable play buttons and audio-related controls
        const playButtons = document.querySelectorAll('.node-play-btn, #play-all-nodes');
        playButtons.forEach(btn => {
            btn.disabled = false;
            btn.title = '';
        });
        
        const initAudioBtn = document.getElementById('initAudioBtn');
        if (initAudioBtn) {
            initAudioBtn.disabled = false;
            initAudioBtn.textContent = 'Audio Ready';
        }
    }

    disableAudioFeatures() {
        // Disable play buttons and audio-related controls
        const playButtons = document.querySelectorAll('.node-play-btn, #play-all-nodes');
        playButtons.forEach(btn => {
            btn.disabled = true;
            btn.title = 'Audio not available';
        });
        
        const initAudioBtn = document.getElementById('initAudioBtn');
        if (initAudioBtn) {
            initAudioBtn.disabled = true;
            initAudioBtn.textContent = 'Audio Unavailable';
        }
    }

    async loadStrudelFromCDN() {
        console.log('Loading Strudel from CDN...');
        
        // Check if script is already being loaded
        const existingScript = document.querySelector('script[src*="strudel"]');
        if (existingScript) {
            console.log('Strudel script already exists, waiting for it to load...');
            return this.waitForStrudel(30);
        }
        
        // Create and load the script
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/strudel@0.12.2/dist/strudel.web.js';
            script.async = true;
            
            script.onload = () => {
                console.log('Strudel CDN script loaded successfully');
                // Wait a bit for global to be set
                setTimeout(() => {
                    if (typeof strudel !== 'undefined' && strudel) {
                        console.log('Strudel global is available after load');
                        resolve();
                    } else {
                        reject(new Error('Strudel global not available after script load'));
                    }
                }, 500);
            };
            
            script.onerror = (error) => {
                console.error('Failed to load Strudel from CDN:', error);
                reject(new Error('Failed to load Strudel from CDN - check network connection'));
            };
            
            document.head.appendChild(script);
            console.log('Strudel script tag added to head');
        });
    }

    async waitForStrudel(maxAttempts = 50) {
        console.log('Waiting for Strudel library to be available...');
        
        for (let i = 0; i < maxAttempts; i++) {
            console.log(`Attempt ${i + 1}/${maxAttempts}: Checking for Strudel...`, {
                strudelDefined: typeof strudel !== 'undefined',
                strudelValue: typeof strudel !== 'undefined' ? typeof strudel : 'undefined',
                hasInit: typeof strudel !== 'undefined' && strudel && typeof strudel.init === 'function'
            });
            
            if (typeof strudel !== 'undefined' && strudel && typeof strudel.init === 'function') {
                console.log('Strudel library is ready!');
                return true;
            }
            
            // Wait before next attempt
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        console.error('Strudel library not ready after', maxAttempts, 'attempts');
        throw new Error(`Strudel library not available after ${maxAttempts} attempts`);
    }

    createNode(type, instrument, x = 100, y = 100) {
        const nodeId = 'node-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const node = {
            id: nodeId,
            type: type,
            instrument: instrument,
            x: x,
            y: y,
            properties: {
                note: '',
                duration: 500,
                volume: 80,
                effects: {},
                strudelProperties: {}
            }
        };

        // Initialize strudelProperties based on node type
        if (this.propertySchema) {
            // Check regular nodes first
            if (this.propertySchema.nodes && this.propertySchema.nodes[type]) {
                node.properties.strudelProperties = this.getDefaultProperties(type);
            }
            // Then check transform nodes
            else if (this.propertySchema.transformNodes && this.propertySchema.transformNodes[type]) {
                node.properties.strudelProperties = this.getDefaultProperties(type);
            }
        }

        // Check control nodes schema
        if (this.controlNodesSchema && this.controlNodesSchema.controlNodes && this.controlNodesSchema.controlNodes[type]) {
            node.properties.strudelProperties = this.getDefaultControlNodeProperties(type);
        }

        // Set initial instrument/sound properties based on type
        if (type === 'DrumSymbol') {
            node.properties.strudelProperties.symbol = instrument;
        } else if (type === 'Instrument') {
            node.properties.strudelProperties.sound = instrument;
        }

        this.nodes.push(node);
        this.renderNode(node);
        this.updateStatus(`Created ${type} node: ${instrument}`);
        
        return node;
    }

    renderNode(node) {
        const canvas = document.getElementById('canvas-content');
        if (!canvas) {
            console.error('Canvas content not found for node rendering');
            return;
        }

        const nodeElement = document.createElement('div');
        
        // Get node category and stage for styling
        const category = this.getNodeCategory(node);
        const stage = this.getNodeExecutionStage(node);
        
        nodeElement.className = `node node-${node.type} node-category-${category}`;
        nodeElement.id = node.id;
        nodeElement.style.left = node.x + 'px';
        nodeElement.style.top = node.y + 'px';

        // Build node content with category and stage information
        const categoryIcon = this.getCategoryIcon(category);
        const stageInfo = stage ? `<div class="node-stage">${stage.toUpperCase()}</div>` : '';
        
        // Build connection ports based on node type
        let portsHTML = '';
        if (this.isControlNode(node)) {
            // Control nodes use controlIn/controlOut sockets
            const controlNodeDef = this.controlNodesSchema?.controlNodes?.[node.type];
            const hasInput = controlNodeDef?.inputs?.includes('controlIn') || false;
            const hasOutput = controlNodeDef?.outputs?.includes('controlOut') || false;
            
            if (hasInput) {
                portsHTML += `<div class="node-input connection-port control-port" data-port="input" title="Control Input - Connect from other control nodes"></div>`;
            }
            if (hasOutput) {
                portsHTML += `<div class="node-output connection-port control-port" data-port="output" title="Control Output - Connect to effect control inputs"></div>`;
            }
        } else {
            // Regular nodes use patternIn/patternOut sockets
            portsHTML = `
                <div class="node-input connection-port" data-port="input" title="Input - Connect from other nodes"></div>
                <div class="node-output connection-port" data-port="output" title="Output - Connect to other nodes"></div>
            `;
        }

        nodeElement.innerHTML = `
            <div class="node-header">
                <div class="node-title">${categoryIcon} ${this.getNodeTitle(node)}</div>
                ${stageInfo}
            </div>
            <div class="node-content">
                <div class="node-subtitle">${node.instrument}</div>
                ${node.properties.note ? `<div class="node-note">Note: ${node.properties.note}</div>` : ''}
                ${this.renderNodeEffects(node)}
                <button class="node-play-btn" onclick="nodeManager.playNode('${node.id}')">
                    <i class="fas fa-play"></i> Play
                </button>
            </div>
            ${portsHTML}
        `;

        console.log(`Rendered node ${node.type} with connection ports`);

        // Make node draggable
        this.makeNodeDraggable(nodeElement, node);

        // Make node clickable for selection
        nodeElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectNode(node);
        });

        // Add connection port event listeners
        this.addConnectionPortListeners(nodeElement, node);

        canvas.appendChild(nodeElement);
        
        // Debug: Check if ports were created
        setTimeout(() => {
            const inputPort = nodeElement.querySelector('.node-input');
            const outputPort = nodeElement.querySelector('.node-output');
            console.log(`Node ${node.type} ports:`, {
                inputPort: inputPort ? 'found' : 'missing',
                outputPort: outputPort ? 'found' : 'missing',
                canvas: canvas.id
            });
        }, 100);
    }

    getCategoryIcon(category) {
        const icons = {
            'source': '🎵',
            'structural': '🔗',
            'rhythmic': '🥁',
            'effect': '🎛️',
            'wrapper': '📦',
            'control': '🎮',
            'modulation': '🎚️',
            'pitch': '🎼',
            'spectral': '🌈',
            'space': '🌌',
            'value': '🔢',
            'lfo': '🌊',
            'random': '🎲',
            'pattern': '📝',
            'utility': '🔧'
        };
        return icons[category] || '⚙️';
    }

    getNodeTitle(node) {
        // Check for control nodes first
        if (this.isControlNode(node)) {
            const controlDef = this.getControlNodeDefinition(node.type);
            return controlDef?.label || node.type;
        }
        
        if (this.nodeSchema && this.nodeSchema.nodes[node.type]) {
            return this.nodeSchema.nodes[node.type].title || node.type;
        }
        
        // Check for individual transform nodes
        if (this.propertySchema && this.propertySchema.transformNodes && this.propertySchema.transformNodes[node.type]) {
            return this.propertySchema.transformNodes[node.type].label || node.type;
        }
        
        // Check regular nodes in property schema (like Transform, Effect, etc.)
        if (this.propertySchema && this.propertySchema.nodes && this.propertySchema.nodes[node.type]) {
            return this.propertySchema.nodes[node.type].title || node.type;
        }
        
        // Legacy titles for backward compatibility
        const titles = {
            'DrumSymbol': 'Instrument',
            'Instrument': 'Instrument',
            'Repeater': 'Multiplier',
            'Group': 'Group',
            'Chance': 'Chance',
            'Effect': 'Effect',
            'Generator': 'Generator',
            'Transform': 'Transform',
            'Output': 'Output',
            'Pitch': 'Pitch',
            'Stack': 'Stack',
            'LPF': 'Low-Pass Filter',
            'HPF': 'High-Pass Filter',
            'Delay': 'Delay',
            'Reverb': 'Reverb',
            'Chop': 'Chop',
            'Stutter': 'Stutter',
            'instrument': 'Instrument',
            'note': 'Musical Note',
            'rest': 'Rest',
            'multiplier': 'Multiplier',
            'stack': 'Stack Operation',
            'parallel': 'Parallel Execution',
            'group': 'Group'
        };
        return titles[node.type] || 'Node';
    }

    getNodeCategory(node) {
        if (!this.nodeSchema) return 'unknown';
        const nodeDef = this.nodeSchema.nodes[node.type];
        if (nodeDef) {
            return nodeDef.category || 'unknown';
        }
        
        // Check for individual transform nodes
        if (this.propertySchema && this.propertySchema.transformNodes && this.propertySchema.transformNodes[node.type]) {
            return this.propertySchema.transformNodes[node.type].category || 'transform';
        }
        
        return 'unknown';
    }

    getNodeExecutionStage(node) {
        if (!this.nodeSchema) return null;
        const nodeDef = this.nodeSchema.nodes[node.type];
        return nodeDef?.execution?.stage || null;
    }

    getNodePriority(node) {
        if (!this.nodeSchema) return 50;
        const nodeDef = this.nodeSchema.nodes[node.type];
        return nodeDef?.execution?.priority || 50;
    }

    isControlNode(node) {
        if (!this.controlNodesSchema || !this.controlNodesSchema.controlNodes) {
            return false;
        }
        return this.controlNodesSchema.controlNodes[node.type] !== undefined;
    }

    getControlNodeDefinition(nodeType) {
        if (!this.controlNodesSchema || !this.controlNodesSchema.controlNodes) {
            return null;
        }
        return this.controlNodesSchema.controlNodes[nodeType];
    }

    addConnectionPortListeners(nodeElement, node) {
        const inputPort = nodeElement.querySelector('.node-input');
        const outputPort = nodeElement.querySelector('.node-output');

        if (inputPort) {
            inputPort.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                this.startConnection(node, 'input', e);
            });
        }

        if (outputPort) {
            outputPort.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                this.startConnection(node, 'output', e);
            });
        }
    }

    startConnection(node, portType, event) {
        this.isConnecting = true;
        this.connectionStartNode = { node, portType };
        
        // Create preview line
        this.createConnectionPreview(event);
        
        // Add global mouse move and up listeners
        document.addEventListener('mousemove', this.updateConnectionPreview.bind(this));
        document.addEventListener('mouseup', this.finishConnection.bind(this));
    }

    createConnectionPreview(event) {
        const canvas = document.getElementById('canvas-content');
        if (!canvas) return;

        // Remove existing preview
        if (this.connectionPreview) {
            this.connectionPreview.remove();
        }

        this.connectionPreview = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.connectionPreview.setAttribute('class', 'connection-preview');
        this.connectionPreview.style.position = 'absolute';
        this.connectionPreview.style.top = '0';
        this.connectionPreview.style.left = '0';
        this.connectionPreview.style.width = '100%';
        this.connectionPreview.style.height = '100%';
        this.connectionPreview.style.pointerEvents = 'none';
        this.connectionPreview.style.zIndex = '5';

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'connection-path-preview');
        path.setAttribute('stroke', '#00ff41');
        path.setAttribute('stroke-width', '3');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-dasharray', '5,5');
        
        this.connectionPreview.appendChild(path);
        canvas.appendChild(this.connectionPreview);
    }

    updateConnectionPreview(event) {
        if (!this.isConnecting || !this.connectionPreview || !this.connectionStartNode) return;

        const path = this.connectionPreview.querySelector('.connection-path-preview');
        if (!path) return;

        // Get start position (from the start node's port)
        const startNodeElement = document.getElementById(this.connectionStartNode.node.id);
        if (!startNodeElement) return;

        const startPort = startNodeElement.querySelector(`.node-${this.connectionStartNode.portType}`);
        if (!startPort) return;

        const startRect = startPort.getBoundingClientRect();
        const canvasRect = document.getElementById('canvas-content').getBoundingClientRect();
        
        const startX = startRect.left + startRect.width / 2 - canvasRect.left;
        const startY = startRect.top + startRect.height / 2 - canvasRect.top;
        const endX = event.clientX - canvasRect.left;
        const endY = event.clientY - canvasRect.top;

        // Create curved path
        const controlX1 = startX + (endX - startX) * 0.3;
        const controlY1 = startY;
        const controlX2 = startX + (endX - startX) * 0.7;
        const controlY2 = endY;
        
        const pathData = `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;
        path.setAttribute('d', pathData);
    }

    finishConnection(event) {
        if (!this.isConnecting || !this.connectionStartNode) return;

        console.log('Finishing connection at:', event.clientX, event.clientY);

        // Check if we clicked on a valid connection port
        const targetElement = document.elementFromPoint(event.clientX, event.clientY);
        console.log('Target element:', targetElement);
        
        const targetPort = targetElement?.closest('.connection-port');
        console.log('Target port:', targetPort);
        
        if (targetPort && targetPort !== document.querySelector(`.node-${this.connectionStartNode.node.id} .node-${this.connectionStartNode.portType}`)) {
            const targetNodeElement = targetPort.closest('.node');
            console.log('Target node element:', targetNodeElement);
            
            if (targetNodeElement) {
                const targetNodeId = targetNodeElement.id;
                const targetNode = this.nodes.find(n => n.id === targetNodeId);
                const targetPortType = targetPort.dataset.port;
                
                console.log('Connection attempt:', {
                    source: this.connectionStartNode.node.type,
                    sourcePort: this.connectionStartNode.portType,
                    target: targetNode?.type,
                    targetPort: targetPortType
                });
                
                if (targetNode && this.canConnect(this.connectionStartNode.node, this.connectionStartNode.portType, targetNode, targetPortType)) {
                    console.log('Connection validated, creating...');
                    this.createConnection(this.connectionStartNode.node, this.connectionStartNode.portType, targetNode, targetPortType);
                } else {
                    console.log('Connection rejected by validation');
                }
            }
        } else {
            console.log('No valid target port found');
        }

        // Cleanup
        this.isConnecting = false;
        this.connectionStartNode = null;
        
        if (this.connectionPreview) {
            this.connectionPreview.remove();
            this.connectionPreview = null;
        }

        document.removeEventListener('mousemove', this.updateConnectionPreview.bind(this));
        document.removeEventListener('mouseup', this.finishConnection.bind(this));
    }

    canConnect(sourceNode, sourcePort, targetNode, targetPort) {
        // Prevent self-connection
        if (sourceNode.id === targetNode.id) {
            this.updateStatus('Cannot connect node to itself');
            return false;
        }

        // Debug: Log connection attempt
        console.log(`Connection attempt: ${sourceNode.type} (${sourcePort}) -> ${targetNode.type} (${targetPort})`);

        // Check for control node connections first
        const isSourceControl = this.isControlNode(sourceNode);
        const isTargetControl = this.isControlNode(targetNode);
        
        if (isSourceControl || isTargetControl) {
            return this.validateControlConnection(sourceNode, sourcePort, targetNode, targetPort);
        }

        // Get node definitions from schema
        if (!this.nodeSchema) {
            console.warn('Node schema not loaded, using legacy validation');
            return this.legacyCanConnect(sourceNode, sourcePort, targetNode, targetPort);
        }

        const sourceNodeDef = this.nodeSchema.nodes[sourceNode.type];
        const targetNodeDef = this.nodeSchema.nodes[targetNode.type];

        if (!sourceNodeDef || !targetNodeDef) {
            console.warn('Node definitions not found for validation');
            console.log('Available nodes:', Object.keys(this.nodeSchema.nodes));
            // For unknown node types, allow basic legacy connection
            return this.legacyCanConnect(sourceNode, sourcePort, targetNode, targetPort);
        }

        console.log(`Node definitions: ${sourceNodeDef.category} -> ${targetNodeDef.category}`);

        // Validate socket types based on schema
        const sourceSocket = this.getNodeSocket(sourceNodeDef, sourcePort);
        const targetSocket = this.getNodeSocket(targetNodeDef, targetPort);

        if (!sourceSocket || !targetSocket) {
            console.log(`Socket validation failed: source=${sourceSocket}, target=${targetSocket}`);
            this.updateStatus(`Invalid socket types: ${sourcePort} -> ${targetPort}`);
            // Fallback to legacy validation for compatibility
            return this.legacyCanConnect(sourceNode, sourcePort, targetNode, targetPort);
        }

        console.log(`Socket types: ${sourceSocket} -> ${targetSocket}`);

        // Check socket compatibility using the matrix
        const isCompatible = this.areSocketsCompatible(sourceSocket, targetSocket);
        if (!isCompatible) {
            console.log(`Socket compatibility failed`);
            this.updateStatus(`Incompatible connection: ${sourceNode.type} (${sourceSocket}) -> ${targetNode.type} (${targetSocket})`);
            // For now, allow the connection anyway for testing
            return true;
        }

        // Apply validation rules
        const validationResult = this.validateConnection(sourceNodeDef, targetNodeDef);
        if (!validationResult.valid) {
            console.log(`Connection validation failed: ${validationResult.reason}`);
            this.updateStatus(`Connection rejected: ${validationResult.reason}`);
            // For now, allow the connection anyway for testing
            return true;
        }

        console.log('Connection allowed');
        return true;
    }

    getNodeSocket(nodeDef, portType) {
        const portMap = {
            'input': 'in',
            'output': 'out'
        };
        const socketKey = portMap[portType];
        if (!socketKey || !nodeDef.sockets[socketKey]) {
            return null;
        }
        
        // For multi-input nodes, return first available input
        if (Array.isArray(nodeDef.sockets[socketKey])) {
            return nodeDef.sockets[socketKey][0];
        }
        return nodeDef.sockets[socketKey];
    }

    areSocketsCompatible(sourceSocket, targetSocket) {
        const matrix = this.nodeSchema.socketCompatibilityMatrix;
        const sourceCompatibility = matrix[sourceSocket];
        
        if (!sourceCompatibility) {
            return false;
        }
        
        return sourceCompatibility[targetSocket] === true;
    }

    validateConnection(sourceNodeDef, targetNodeDef) {
        // Check forbidden connections
        const forbiddenRules = this.nodeSchema.validationRules.forbiddenConnections;
        
        for (const rule of forbiddenRules) {
            if ((rule.from === sourceNodeDef.category || rule.from === 'patternOut') &&
                (rule.to === targetNodeDef.category || rule.to === 'patternIn')) {
                return {
                    valid: false,
                    reason: `Forbidden connection: ${sourceNodeDef.category} -> ${targetNodeDef.category}`
                };
            }
        }

        // Check category-specific rules
        if (sourceNodeDef.category === 'source' && targetNodeDef.category === 'source') {
            return {
                valid: false,
                reason: 'Cannot connect source to source'
            };
        }

        if (sourceNodeDef.category === 'wrapper' && targetNodeDef.category !== 'source') {
            return {
                valid: false,
                reason: 'Wrapper nodes must connect to source nodes'
            };
        }

        return { valid: true };
    }

    validateControlConnection(sourceNode, sourcePort, targetNode, targetPort) {
        const isSourceControl = this.isControlNode(sourceNode);
        const isTargetControl = this.isControlNode(targetNode);
        
        // Control nodes can only connect to control inputs
        if (isSourceControl && !isTargetControl) {
            // Check if target effect accepts control
            const targetDef = this.propertySchema?.nodes?.[targetNode.type];
            if (targetDef && targetDef.acceptsControl) {
                if (sourcePort === 'output' && targetPort === 'input') {
                    console.log('Control connection allowed: Control -> Effect with acceptsControl');
                    return true;
                }
            }
            this.updateStatus(`Control nodes can only connect to control inputs or effects that accept control`);
            return false;
        }
        
        // Control to Control connections
        if (isSourceControl && isTargetControl) {
            const sourceDef = this.getControlNodeDefinition(sourceNode.type);
            const targetDef = this.getControlNodeDefinition(targetNode.type);
            
            // Check socket availability
            const sourceHasOutput = sourceDef.outputs.includes('controlOut');
            const targetHasInput = targetDef.inputs.includes('controlIn');
            
            if (sourceHasOutput && targetHasInput && sourcePort === 'output' && targetPort === 'input') {
                console.log('Control to Control connection allowed');
                return true;
            }
            
            this.updateStatus(`Invalid control socket connection: ${sourceNode.type} (${sourcePort}) -> ${targetNode.type} (${targetPort})`);
            return false;
        }
        
        // Non-control to control (should not be allowed)
        if (!isSourceControl && isTargetControl) {
            this.updateStatus(`Cannot connect non-control node to control node`);
            return false;
        }
        
        console.log('Control connection validation completed');
        return true;
    }

    legacyCanConnect(sourceNode, sourcePort, targetNode, targetPort) {
        // Legacy validation for backward compatibility
        const validConnections = {
            'Effect': {
                'output': ['Effect', 'Instrument', 'Transform']
            },
            'Instrument': {
                'input': ['Effect', 'Repeater', 'Chance', 'Group', 'Transform'],
                'output': []
            },
            'DrumSymbol': {
                'input': ['Effect', 'Repeater', 'Chance', 'Group', 'Transform'],
                'output': []
            },
            'Repeater': {
                'output': ['Instrument', 'Effect', 'DrumSymbol', 'Transform']
            },
            'Chance': {
                'output': ['Instrument', 'Effect', 'DrumSymbol', 'Transform'],
                'input': ['wrapIn']
            },
            'Often': {
                'output': ['Instrument', 'Effect', 'DrumSymbol', 'Transform'],
                'input': ['wrapIn']
            },
            'Sometimes': {
                'output': ['Instrument', 'Effect', 'DrumSymbol', 'Transform'],
                'input': ['wrapIn']
            },
            'Rarely': {
                'output': ['Instrument', 'Effect', 'DrumSymbol', 'Transform'],
                'input': ['wrapIn']
            },
            'Group': {
                'output': ['Instrument', 'Effect', 'DrumSymbol', 'Transform']
            },
            'Transform': {
                'output': ['Instrument', 'Effect', 'DrumSymbol', 'Transform']
            }
        };

        const sourceRules = validConnections[sourceNode.type];
        if (!sourceRules) return false;

        const allowedTargets = sourceRules[sourcePort] || [];
        
        // Special handling for wrapper nodes (chance nodes)
        if (['Chance', 'Often', 'Sometimes', 'Rarely'].includes(targetNode.type)) {
            return targetPort === 'input' && allowedTargets.includes('wrapIn');
        }
        
        return allowedTargets.includes(targetNode.type);
    }

    createConnection(sourceNode, sourcePort, targetNode, targetPort) {
        const connectionId = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const connection = {
            id: connectionId,
            sourceNodeId: sourceNode.id,
            sourcePort: sourcePort,
            targetNodeId: targetNode.id,
            targetPort: targetPort
        };

        console.log('Creating connection:', connection);
        
        this.connections.push(connection);
        this.renderConnection(connection);
        this.updateStatus(`Connected ${sourceNode.type} to ${targetNode.type}`);
        
        console.log('Total connections:', this.connections.length);
    }

    renderConnection(connection) {
        const canvas = document.getElementById('canvas-content');
        if (!canvas) {
            console.error('Canvas content not found for connection rendering');
            return;
        }

        console.log('Rendering connection:', connection);

        // Create SVG for the connection
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'connection-line');
        svg.setAttribute('data-connection-id', connection.id);
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '1';

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'connection-path');
        path.setAttribute('stroke', '#475569');
        path.setAttribute('stroke-width', '3');
        path.setAttribute('fill', 'none');
        
        svg.appendChild(path);
        canvas.appendChild(svg);

        console.log('SVG connection created:', svg);

        // Update connection position
        this.updateConnectionPosition(connection);
    }

    updateConnectionPosition(connection) {
        const svg = document.querySelector(`[data-connection-id="${connection.id}"]`);
        if (!svg) return;

        const path = svg.querySelector('.connection-path');
        const sourceNodeElement = document.getElementById(connection.sourceNodeId);
        const targetNodeElement = document.getElementById(connection.targetNodeId);
        
        if (!sourceNodeElement || !targetNodeElement) return;

        const sourcePort = sourceNodeElement.querySelector(`.node-${connection.sourcePort}`);
        const targetPort = targetNodeElement.querySelector(`.node-${connection.targetPort}`);
        
        if (!sourcePort || !targetPort) return;

        const canvasRect = document.getElementById('canvas-content').getBoundingClientRect();
        const sourceRect = sourcePort.getBoundingClientRect();
        const targetRect = targetPort.getBoundingClientRect();
        
        const startX = sourceRect.left + sourceRect.width / 2 - canvasRect.left;
        const startY = sourceRect.top + sourceRect.height / 2 - canvasRect.top;
        const endX = targetRect.left + targetRect.width / 2 - canvasRect.left;
        const endY = targetRect.top + targetRect.height / 2 - canvasRect.top;

        // Create curved path
        const controlX1 = startX + (endX - startX) * 0.3;
        const controlY1 = startY;
        const controlX2 = startX + (endX - startX) * 0.7;
        const controlY2 = endY;
        
        const pathData = `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;
        path.setAttribute('d', pathData);
    }

    removeConnection(connectionId) {
        this.connections = this.connections.filter(conn => conn.id !== connectionId);
        const svg = document.querySelector(`[data-connection-id="${connectionId}"]`);
        if (svg) {
            svg.remove();
        }
    }

    updateAllConnections() {
        this.connections.forEach(connection => {
            this.updateConnectionPosition(connection);
        });
    }

    clearAllConnections() {
        this.connections = [];
        document.querySelectorAll('.connection-line').forEach(el => el.remove());
        this.updateStatus('Cleared all connections');
    }

    generateExampleNodes() {
        // Clear existing nodes first
        this.clearAllNodes();
        
        // 808 Beat with enhanced properties
        const bdNode = this.createNode('DrumSymbol', 'bd', 100, 100);
        if (bdNode.properties.strudelProperties) {
            bdNode.properties.strudelProperties.bank = 'RolandTR808';
            bdNode.properties.strudelProperties.dec = 0.4;
            bdNode.properties.strudelProperties.gain = 1.2;
        }
        
        const sdNode = this.createNode('DrumSymbol', 'sd', 300, 100);
        if (sdNode.properties.strudelProperties) {
            sdNode.properties.strudelProperties.bank = 'RolandTR808';
            sdNode.properties.strudelProperties.dec = 0.3;
            sdNode.properties.strudelProperties.gain = 0.8;
        }
        
        const hhNode = this.createNode('DrumSymbol', 'hh', 500, 100);
        if (hhNode.properties.strudelProperties) {
            hhNode.properties.strudelProperties.bank = 'RolandTR808';
            hhNode.properties.strudelProperties.dec = 0.1;
            hhNode.properties.strudelProperties.hpf = 200;
        }
        
        // Piano melody with ADSR envelope
        const pianoNode = this.createNode('Instrument', 'piano', 100, 300);
        if (pianoNode.properties.strudelProperties) {
            pianoNode.properties.strudelProperties.gain = 0.8;
            pianoNode.properties.strudelProperties.pan = -0.2;
            pianoNode.properties.strudelProperties.attack = 0.01;
            pianoNode.properties.strudelProperties.decay = 0.3;
            pianoNode.properties.strudelProperties.sustain = 0.7;
            pianoNode.properties.strudelProperties.release = 0.8;
        }
        
        // Filtered saw bass with effects
        const sawNode = this.createNode('Instrument', 'sawtooth', 300, 300);
        if (sawNode.properties.strudelProperties) {
            sawNode.properties.strudelProperties.gain = 0.6;
            sawNode.properties.strudelProperties.pan = 0.1;
            sawNode.properties.strudelProperties.lpf = 500;
            sawNode.properties.strudelProperties.reverb = 0.3;
            sawNode.properties.strudelProperties.attack = 0.05;
            sawNode.properties.strudelProperties.release = 0.3;
        }
        
        // Vocal-style synth with vowel filter
        const vocalNode = this.createNode('Instrument', 'sawtooth', 500, 300);
        if (vocalNode.properties.strudelProperties) {
            vocalNode.properties.strudelProperties.gain = 0.7;
            vocalNode.properties.strudelProperties.vowel = true;
            vocalNode.properties.strudelProperties.lpf = 2000;
            vocalNode.properties.strudelProperties.delay = 0.2;
        }
        
        // Effects chain
        const delayNode = this.createNode('Effect', 'delay', 300, 500);
        if (delayNode.properties.strudelProperties) {
            delayNode.properties.strudelProperties.type = 'delay';
            delayNode.properties.strudelProperties.amount = 0.3;
        }
        
        const reverbNode = this.createNode('Effect', 'reverb', 500, 500);
        if (reverbNode.properties.strudelProperties) {
            reverbNode.properties.strudelProperties.type = 'reverb';
            reverbNode.properties.strudelProperties.amount = 0.4;
        }
        
        // Pattern nodes
        const repeatNode = this.createNode('Repeater', '*', 100, 500);
        if (repeatNode.properties.strudelProperties) {
            repeatNode.properties.strudelProperties.amount = 2;
        }
        
        const chanceNode = this.createNode('Chance', 'sometimes', 700, 300);
        if (chanceNode.properties.strudelProperties) {
            chanceNode.properties.strudelProperties.type = 'sometimes';
            chanceNode.properties.strudelProperties.probability = 0.6;
            chanceNode.properties.strudelProperties.interval = 4;
        }
        
        // Dedicated probability wrapper nodes
        const oftenNode = this.createNode('Often', 'high_prob', 900, 200);
        if (oftenNode.properties.strudelProperties) {
            oftenNode.properties.strudelProperties.probability = 0.75;
        }
        
        const rarelyNode = this.createNode('Rarely', 'low_prob', 900, 400);
        if (rarelyNode.properties.strudelProperties) {
            rarelyNode.properties.strudelProperties.probability = 0.25;
        }
        
        // Transform nodes - individual transform types
        const chopTransformNode = this.createNode('chop', 'slices', 500, 400);
        if (chopTransformNode.properties.strudelProperties) {
            chopTransformNode.properties.strudelProperties.slices = 8;
        }
        
        const stutterTransformNode = this.createNode('stutter', 'repeats', 700, 400);
        if (stutterTransformNode.properties.strudelProperties) {
            stutterTransformNode.properties.strudelProperties.repeats = 3;
        }
        
        const lpfTransformNode = this.createNode('lpf', 'frequency', 900, 400);
        if (lpfTransformNode.properties.strudelProperties) {
            lpfTransformNode.properties.strudelProperties.frequency = 800;
        }
        
        const delayTransformNode = this.createNode('delay', 'time', 1100, 400);
        if (delayTransformNode.properties.strudelProperties) {
            delayTransformNode.properties.strudelProperties.time = 0.25;
        }
        
        // Create some example connections
        this.createConnection(repeatNode, 'output', bdNode, 'input');
        this.createConnection(chanceNode, 'output', pianoNode, 'input');
        this.createConnection(sawNode, 'output', delayNode, 'input');
        this.createConnection(delayNode, 'output', reverbNode, 'input');
        this.createConnection(bdNode, 'output', chopTransformNode, 'input');
        this.createConnection(chopTransformNode, 'output', lpfTransformNode, 'input');
        this.createConnection(lpfTransformNode, 'output', delayTransformNode, 'input');
        
        // Wrapper connections (chance nodes wrap other nodes)
        this.createConnection(pianoNode, 'output', oftenNode, 'input');
        this.createConnection(sdNode, 'output', rarelyNode, 'input');
        
        // Update visual displays
        [bdNode, sdNode, hhNode, pianoNode, sawNode, vocalNode, delayNode, reverbNode, repeatNode, chanceNode, chopTransformNode, stutterTransformNode, lpfTransformNode, delayTransformNode, oftenNode, rarelyNode].forEach(node => {
            this.updateNodeDisplay(node);
        });
        
        this.updateStatus('Generated example nodes with ADSR envelopes and audio effects');
    }

    makeNodeDraggable(element, node) {
        let isDragging = false;
        let startX, startY, initialX, initialY;

        element.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('node-title')) {
                isDragging = true;
                element.classList.add('dragging');
                startX = e.clientX;
                startY = e.clientY;
                initialX = node.x;
                initialY = node.y;
                
                document.addEventListener('mousemove', drag);
                document.addEventListener('mouseup', stopDrag);
            }
        });

        const drag = (e) => {
            if (isDragging) {
                e.preventDefault();
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                
                node.x = initialX + deltaX;
                node.y = initialY + deltaY;
                
                element.style.left = node.x + 'px';
                element.style.top = node.y + 'px';
            }
        };

        const stopDrag = () => {
            if (isDragging) {
                isDragging = false;
                element.classList.remove('dragging');
                document.removeEventListener('mousemove', drag);
                document.removeEventListener('mouseup', stopDrag);
                
                // Update all connection positions
                this.updateAllConnections();
            }
        };
    }

    selectNode(node) {
        // Clear previous selection
        document.querySelectorAll('.node.selected').forEach(el => {
            el.classList.remove('selected');
        });

        // Select new node
        this.selectedNode = node;
        const nodeElement = document.getElementById(node.id);
        if (nodeElement) {
            nodeElement.classList.add('selected');
        }

        // Show side panel and update content
        this.showSidePanel();
        this.updateSidePanel(node);
        
        // Update delete button state
        this.updateDeleteButtonState();
    }

    showSidePanel() {
        const sidePanel = document.getElementById('side-panel');
        if (sidePanel) {
            sidePanel.classList.add('open');
            sidePanel.style.right = '0'; // Reset position when showing
        }
    }

    deleteNode(nodeId) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) return;

        // Remove all connections involving this node
        this.connections = this.connections.filter(conn => {
            if (conn.sourceNodeId === nodeId || conn.targetNodeId === nodeId) {
                const svg = document.querySelector(`[data-connection-id="${conn.id}"]`);
                if (svg) svg.remove();
                return false;
            }
            return true;
        });

        // Remove the node
        this.nodes = this.nodes.filter(n => n.id !== nodeId);
        const nodeElement = document.getElementById(nodeId);
        if (nodeElement) {
            nodeElement.remove();
        }

        // Clear selection if this was the selected node
        if (this.selectedNode && this.selectedNode.id === nodeId) {
            this.selectedNode = null;
        }
        
        // Update delete button state
        this.updateDeleteButtonState();

        this.updateStatus(`Deleted ${node.type} node`);
    }

    deleteSelectedNode() {
        if (!this.selectedNode) {
            this.updateStatus('No node selected to delete');
            return;
        }
        
        const nodeType = this.selectedNode.type;
        const instrument = this.selectedNode.instrument;
        
        this.deleteNode(this.selectedNode.id);
        
        // Hide side panel since no node is selected
        this.hideSidePanel();
        
        this.updateStatus(`Deleted ${nodeType} node: ${instrument}`);
    }
    
    updateDeleteButtonState() {
        const deleteBtn = document.getElementById('delete-selected-node');
        if (deleteBtn) {
            if (this.selectedNode) {
                deleteBtn.disabled = false;
                deleteBtn.classList.remove('btn-disabled');
                deleteBtn.title = `Delete selected ${this.selectedNode.type} node`;
            } else {
                deleteBtn.disabled = true;
                deleteBtn.classList.add('btn-disabled');
                deleteBtn.title = 'No node selected';
            }
        }
    }

    clearSelection() {
        this.selectedNode = null;
        document.querySelectorAll('.node.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Update delete button state
        this.updateDeleteButtonState();
    }

    updateSidePanel(node) {
        if (!this.propertySchema && !this.controlNodesSchema) {
            console.warn('Property schema not loaded');
            return;
        }

        const nodeType = node.type;
        let schema = this.propertySchema?.nodes?.[nodeType];
        
        // Check if it's a control node
        if (!schema && this.isControlNode(node)) {
            schema = this.createControlNodeSchema(nodeType);
        }
        
        // Check if it's an individual transform node
        if (!schema && this.propertySchema?.transformNodes?.[nodeType]) {
            schema = this.createTransformNodeSchema(nodeType);
        }
        
        // Debug logging for schema lookup
        if (!schema) {
            console.log(`Schema lookup for node type: ${nodeType}`, {
                hasNodes: !!this.propertySchema?.nodes,
                hasTransformNodes: !!this.propertySchema?.transformNodes,
                hasControlNodes: !!this.controlNodesSchema?.controlNodes,
                availableNodes: Object.keys(this.propertySchema?.nodes || {}),
                availableTransformNodes: Object.keys(this.propertySchema?.transformNodes || {}),
                availableControlNodes: Object.keys(this.controlNodesSchema?.controlNodes || {})
            });
        }
        
        if (!schema) {
            console.warn(`No schema found for node type: ${nodeType}`);
            return;
        }

        // Initialize node properties if not exists
        if (!node.properties.strudelProperties) {
            if (this.isControlNode(node)) {
                node.properties.strudelProperties = this.getDefaultControlNodeProperties(nodeType);
            } else {
                node.properties.strudelProperties = this.getDefaultProperties(nodeType);
            }
        }

        // Update side panel content
        const sidePanel = document.getElementById('side-panel');
        const propertiesContent = sidePanel?.querySelector('#node-properties');
        
        if (propertiesContent) {
            propertiesContent.innerHTML = this.generatePropertiesHTML(node, schema);
            this.bindPropertyEvents(node, schema);
            
            // Update the visual display on the node
            this.updateNodeDisplay(node);
        }
    }

    getDefaultProperties(nodeType) {
        let schema = this.propertySchema.nodes[nodeType];
        
        // Check if it's a transform node
        if (!schema && this.propertySchema.transformNodes && this.propertySchema.transformNodes[nodeType]) {
            const transformDef = this.propertySchema.transformNodes[nodeType];
            const defaults = {};
            
            // Extract default values from transform node properties
            Object.keys(transformDef.properties).forEach(propKey => {
                const propDef = transformDef.properties[propKey];
                if (propDef.default !== undefined) {
                    defaults[propKey] = propDef.default;
                } else {
                    defaults[propKey] = this.getDefaultValueForType(propDef.type);
                }
            });
            
            return defaults;
        }
        
        const defaults = {};
        
        if (schema && schema.sections) {
            schema.sections.forEach(section => {
                Object.keys(section.properties).forEach(propKey => {
                    const prop = section.properties[propKey];
                    if (prop.default !== undefined) {
                        defaults[propKey] = prop.default;
                    } else {
                        defaults[propKey] = this.getDefaultValueForType(prop.type);
                    }
                });
            });
        }
        
        return defaults;
    }

    getDefaultControlNodeProperties(nodeType) {
        if (!this.controlNodesSchema || !this.controlNodesSchema.controlNodes || !this.controlNodesSchema.controlNodes[nodeType]) {
            return {};
        }

        const controlNodeDef = this.controlNodesSchema.controlNodes[nodeType];
        const defaults = {};
        
        // Extract default values from control node properties
        Object.keys(controlNodeDef.properties).forEach(propKey => {
            const propDef = controlNodeDef.properties[propKey];
            if (propDef.default !== undefined) {
                defaults[propKey] = propDef.default;
            } else {
                defaults[propKey] = this.getDefaultValueForType(propDef.type);
            }
        });
        
        return defaults;
    }

    getDefaultValueForType(type) {
        switch (type) {
            case 'knob':
            case 'slider':
            case 'number':
                return 0;
            case 'toggle':
                return false;
            case 'select':
                return '';
            default:
                return '';
        }
    }

    createTransformNodeSchema(transformType) {
        if (!this.propertySchema.transformNodes || !this.propertySchema.transformNodes[transformType]) {
            return null;
        }

        const transformDef = this.propertySchema.transformNodes[transformType];
        
        // Convert transform node definition to the expected schema format
        const schema = {
            title: transformDef.label || transformType,
            sections: []
        };

        // Create a properties section for the transform node
        const properties = {};
        
        Object.keys(transformDef.properties).forEach(propKey => {
            const propDef = transformDef.properties[propKey];
            
            // Map property types to UI control types
            let uiType = 'number'; // default
            if (propDef.type === 'number') {
                if (propKey === 'factor' || propKey === 'frequency' || propKey === 'rate') {
                    uiType = 'knob';
                } else if (propKey === 'chance' || propKey === 'probability') {
                    uiType = 'slider'; // Use slider for probability values
                } else if (propKey === 'amount' && (transformType.includes('often') || transformType.includes('sometimes') || transformType.includes('rarely'))) {
                    uiType = 'slider'; // Use slider for probability values
                }
            }
            
            properties[propKey] = {
                label: propDef.label || propKey,
                type: uiType,
                min: propDef.min,
                max: propDef.max,
                step: propDef.step,
                default: propDef.default,
                mapsTo: this.getTransformMapTo(transformType, propKey)
            };
        });

        if (Object.keys(properties).length > 0) {
            schema.sections.push({
                id: 'transform',
                label: 'Transform Settings',
                properties: properties
            });
        }

        return schema;
    }

    createControlNodeSchema(controlType) {
        if (!this.controlNodesSchema || !this.controlNodesSchema.controlNodes || !this.controlNodesSchema.controlNodes[controlType]) {
            return null;
        }

        const controlDef = this.controlNodesSchema.controlNodes[controlType];
        
        // Convert control node definition to the expected schema format
        const schema = {
            title: controlDef.label || controlType,
            sections: []
        };

        // Create a properties section for the control node
        const properties = {};
        
        Object.keys(controlDef.properties).forEach(propKey => {
            const propDef = controlDef.properties[propKey];
            
            // Map property types to UI control types
            let uiType = 'number'; // default
            if (propDef.type === 'number') {
                if (propKey === 'rate' || propKey === 'frequency') {
                    uiType = 'knob'; // Use knob for frequency/rate values
                } else if (propKey === 'chance' || propKey === 'probability') {
                    uiType = 'slider'; // Use slider for probability values
                }
            }
            
            properties[propKey] = {
                label: propDef.label || propKey,
                type: uiType,
                min: propDef.min,
                max: propDef.max,
                step: propDef.step,
                default: propDef.default
            };
        });

        if (Object.keys(properties).length > 0) {
            schema.sections.push({
                id: 'control',
                label: 'Control Settings',
                properties: properties
            });
        }

        return schema;
    }

    getTransformMapTo(transformType, propKey) {
        // Map transform properties to Strudel methods
        const mapToMap = {
            'chop': { 'slices': 'arg' },
            'stutter': { 'repeats': 'arg' },
            'trunc': { 'amount': 'arg' },
            'speed': { 'factor': 'arg' },
            'note': { 'semitones': 'arg' },
            'coarse': { 'octaves': 'arg' },
            'vibrato': { 'rate': 'arg', 'depth': '.depth' },
            'tremolo': { 'rate': 'arg', 'depth': '.depth' },
            'lpf': { 'frequency': 'arg' },
            'hpf': { 'frequency': 'arg' },
            'lpq': { 'q': 'arg' },
            'gain': { 'amount': 'arg' },
            'delay': { 'time': 'arg' },
            'delayfb': { 'amount': 'arg' },
            'reverb': { 'amount': 'arg' },
            'room': { 'size': 'arg' },
            'often': { 'chance': 'arg' },
            'sometimes': { 'chance': 'arg' },
            'rarely': { 'chance': 'arg' }
        };

        const transformMap = mapToMap[transformType];
        return transformMap && transformMap[propKey] ? transformMap[propKey] : 'arg';
    }

    generatePropertiesHTML(node, schema) {
        let html = `
            <div class="node-info">
                <h3>${schema.title}</h3>
                <p class="node-id">Node: ${node.id}</p>
            </div>
        `;

        if (schema.sections) {
            schema.sections.forEach(section => {
                html += `
                    <div class="property-section">
                        <h4>${section.label}</h4>
                        <div class="property-controls">
                `;

                Object.keys(section.properties).forEach(propKey => {
                    const prop = section.properties[propKey];
                    const value = node.properties.strudelProperties[propKey] || prop.default || '';
                    html += this.generatePropertyControl(propKey, prop, value, node.id);
                });

                html += `
                        </div>
                    </div>
                `;
            });
        }

        return html;
    }

    generatePropertyControl(propKey, prop, value, nodeId) {
        const controlId = `prop-${nodeId}-${propKey}`;
        const label = prop.label || propKey;
        
        switch (prop.type) {
            case 'knob':
                return this.generateKnobControl(controlId, propKey, label, value, prop);
            case 'slider':
                return this.generateSliderControl(controlId, propKey, label, value, prop);
            case 'select':
                return this.generateSelectControl(controlId, propKey, label, value, prop);
            case 'toggle':
                return this.generateToggleControl(controlId, propKey, label, value, prop);
            case 'number':
                return this.generateNumberControl(controlId, propKey, label, value, prop);
            default:
                return this.generateTextControl(controlId, propKey, label, value, prop);
        }
    }

    generateKnobControl(id, propKey, label, value, prop) {
        return `
            <div class="property-control">
                <label for="${id}">${label}</label>
                <div class="knob-container">
                    <input type="range" id="${id}" class="knob" 
                           min="${prop.min || 0}" max="${prop.max || 1}" 
                           step="${prop.step || 0.01}" value="${value}"
                           data-prop="${propKey}">
                    <span class="knob-value">${value}</span>
                </div>
            </div>
        `;
    }

    generateSliderControl(id, propKey, label, value, prop) {
        return `
            <div class="property-control">
                <label for="${id}">${label}</label>
                <div class="slider-container">
                    <input type="range" id="${id}" class="slider" 
                           min="${prop.min || 0}" max="${prop.max || 1}" 
                           step="${prop.step || 0.01}" value="${value}"
                           data-prop="${propKey}">
                    <span class="slider-value">${value}</span>
                </div>
            </div>
        `;
    }

    generateSelectControl(id, propKey, label, value, prop) {
        let options = '';
        
        if (prop.source === 'instrumentList') {
            // Use instrument list from menu
            this.instrumentList.forEach(instrument => {
                const selected = instrument === value ? 'selected' : '';
                options += `<option value="${instrument}" ${selected}>${this.formatLabel(instrument)}</option>`;
            });
        } else if (prop.values) {
            prop.values.forEach(val => {
                const selected = val === value ? 'selected' : '';
                options += `<option value="${val}" ${selected}>${this.formatLabel(val)}</option>`;
            });
        }
        
        return `
            <div class="property-control">
                <label for="${id}">${label}</label>
                <select id="${id}" class="select" data-prop="${propKey}">
                    ${options}
                </select>
            </div>
        `;
    }

    generateToggleControl(id, propKey, label, value, prop) {
        const checked = value ? 'checked' : '';
        return `
            <div class="property-control">
                <label class="toggle-label" for="${id}">
                    <input type="checkbox" id="${id}" class="toggle" 
                           ${checked} data-prop="${propKey}">
                    <span class="toggle-slider"></span>
                    <span class="toggle-text">${label}</span>
                </label>
            </div>
        `;
    }

    generateNumberControl(id, propKey, label, value, prop) {
        return `
            <div class="property-control">
                <label for="${id}">${label}</label>
                <input type="number" id="${id}" class="number-input" 
                       min="${prop.min || 0}" max="${prop.max || 999}" 
                       step="${prop.step || 1}" value="${value}"
                       data-prop="${propKey}">
            </div>
        `;
    }

    generateTextControl(id, propKey, label, value, prop) {
        return `
            <div class="property-control">
                <label for="${id}">${label}</label>
                <input type="text" id="${id}" class="text-input" 
                       value="${value}" data-prop="${propKey}">
            </div>
        `;
    }

    formatLabel(text) {
        return text.replace(/_/g, ' ')
                   .replace(/([A-Z])/g, ' $1')
                   .replace(/^./, str => str.toUpperCase())
                   .trim();
    }

    renderNodeEffects(node) {
        const props = node.properties.strudelProperties || {};
        let effectsHTML = '';
        
        // Show effect properties for Effect nodes
        if (node.type === 'Effect' && props.type) {
            const effectName = props.type.toUpperCase();
            const amount = props.amount !== undefined ? props.amount : 0.5;
            effectsHTML += `
                <div class="property-value" data-property="effect">
                    ${effectName}: ${amount}
                </div>
            `;
        }
        
        // Show instrument properties (gain, pan, etc.)
        if ((node.type === 'Instrument' || node.type === 'DrumSymbol') && Object.keys(props).length > 0) {
            const properties = [];
            
            // Basic properties
            if (props.gain !== undefined && props.gain !== 1) {
                properties.push(`GAIN: ${props.gain}`);
            }
            if (props.pan !== undefined && props.pan !== 0) {
                properties.push(`PAN: ${props.pan}`);
            }
            if (props.bank) {
                properties.push(`BANK: ${props.bank}`);
            }
            if (props.dec !== undefined && props.dec !== 0.3) {
                properties.push(`DECAY: ${props.dec}`);
            }
            if (props.n !== undefined && props.n !== 0) {
                properties.push(`VAR: ${props.n}`);
            }
            
            // ADSR Envelope
            if (props.attack !== undefined && props.attack !== 0.01) {
                properties.push(`A: ${props.attack}`);
            }
            if (props.decay !== undefined && props.decay !== 0.3) {
                properties.push(`D: ${props.decay}`);
            }
            if (props.sustain !== undefined && props.sustain !== 0.7) {
                properties.push(`S: ${props.sustain}`);
            }
            if (props.release !== undefined && props.release !== 0.5) {
                properties.push(`R: ${props.release}`);
            }
            
            // Audio effects
            if (props.vowel) {
                properties.push(`VOWEL`);
            }
            if (props.lpf !== undefined && props.lpf !== 8000) {
                properties.push(`LPF: ${props.lpf}Hz`);
            }
            if (props.hpf !== undefined && props.hpf !== 20) {
                properties.push(`HPF: ${props.hpf}Hz`);
            }
            if (props.bpf !== undefined && props.bpf !== 1000) {
                properties.push(`BPF: ${props.bpf}Hz`);
            }
            if (props.delay !== undefined && props.delay !== 0) {
                properties.push(`DELAY: ${props.delay}`);
            }
            if (props.reverb !== undefined && props.reverb !== 0) {
                properties.push(`REVERB: ${props.reverb}`);
            }
            if (props.distort !== undefined && props.distort !== 0) {
                properties.push(`DIST: ${props.distort}`);
            }
            if (props.crush !== undefined && props.crush !== 0) {
                properties.push(`CRUSH: ${props.crush}`);
            }
            if (props.speed !== undefined && props.speed !== 1) {
                properties.push(`SPEED: ${props.speed}x`);
            }
            
            properties.forEach(prop => {
                effectsHTML += `
                    <div class="property-value" data-property="instrument">
                        ${prop}
                    </div>
                `;
            });
        }
        
        // Show pattern node properties
        if (node.type === 'Repeater' && props.amount) {
            effectsHTML += `
                <div class="property-value" data-property="pattern">
                    REPEAT: ${props.amount}
                </div>
            `;
        }
        
        if (node.type === 'Chance' && props.probability !== undefined) {
            const prob = props.probability;
            let label = 'SOMETIMES';
            if (prob > 0.7) label = 'OFTEN';
            else if (prob < 0.3) label = 'RARELY';
            
            effectsHTML += `
                <div class="property-value" data-property="pattern">
                    ${label}: ${prob}
                </div>
            `;
        }
        
        // Show individual transform node properties
        if (this.propertySchema.transformNodes && this.propertySchema.transformNodes[node.type]) {
            const transformDef = this.propertySchema.transformNodes[node.type];
            const label = transformDef.label || node.type;
            
            effectsHTML += `
                <div class="property-value" data-property="transform">
                    ${label.toUpperCase()}
                </div>
            `;
            
            // Show key properties
            Object.keys(props).forEach(propKey => {
                if (props[propKey] !== undefined && props[propKey] !== null) {
                    const value = props[propKey];
                    const propDef = transformDef.properties[propKey];
                    const displayLabel = propDef?.label || propKey;
                    
                    effectsHTML += `
                        <div class="property-value" data-property="transform">
                            ${displayLabel}: ${value}
                        </div>
                    `;
                }
            });
        }
        
        // Show pitch properties
        if (node.type === 'Pitch') {
            if (props.note !== undefined && props.note !== 0) {
                effectsHTML += `
                    <div class="property-value" data-property="pitch">
                        NOTE: ${props.note > 0 ? '+' : ''}${props.note}
                    </div>
                `;
            }
            if (props.speed !== undefined && props.speed !== 1) {
                effectsHTML += `
                    <div class="property-value" data-property="pitch">
                        SPEED: ${props.speed}x
                    </div>
                `;
            }
        }
        
        // Show control node properties
        if (this.isControlNode(node)) {
            const controlDef = this.getControlNodeDefinition(node.type);
            const category = controlDef?.category || 'control';
            const label = controlDef?.label || node.type;
            
            effectsHTML += `
                <div class="property-value" data-property="control">
                    ${label.toUpperCase()} (${category})
                </div>
            `;
            
            // Show key control properties
            Object.keys(props).forEach(propKey => {
                if (props[propKey] !== undefined && props[propKey] !== null) {
                    const value = props[propKey];
                    const propDef = controlDef?.properties?.[propKey];
                    const displayLabel = propDef?.label || propKey;
                    
                    effectsHTML += `
                        <div class="property-value" data-property="control">
                            ${displayLabel}: ${value}
                        </div>
                    `;
                }
            });
        }
        
        return effectsHTML;
    }

    bindPropertyEvents(node, schema) {
        const propertiesContent = document.querySelector('#node-properties');
        if (!propertiesContent) return;

        // Remove existing listeners to prevent duplicates
        const newPropertiesContent = propertiesContent.cloneNode(true);
        propertiesContent.parentNode.replaceChild(newPropertiesContent, propertiesContent);
        
        // Store the current node in the properties content for event handling
        newPropertiesContent.dataset.nodeId = node.id;

        // Set initial values for all controls based on node properties
        this.initializePropertyControls(newPropertiesContent, node, schema);

        // Bind all property controls
        newPropertiesContent.addEventListener('input', (e) => {
            if (e.target.dataset.prop) {
                const currentNode = this.nodes.find(n => n.id === newPropertiesContent.dataset.nodeId);
                if (currentNode) {
                    this.updateNodeProperty(currentNode, e.target.dataset.prop, e.target.value, e.target.type === 'checkbox');
                }
            }
        });

        newPropertiesContent.addEventListener('change', (e) => {
            if (e.target.dataset.prop) {
                const currentNode = this.nodes.find(n => n.id === newPropertiesContent.dataset.nodeId);
                if (currentNode) {
                    this.updateNodeProperty(currentNode, e.target.dataset.prop, e.target.value, e.target.type === 'checkbox');
                }
            }
        });

        // Update value displays for sliders and knobs
        newPropertiesContent.addEventListener('input', (e) => {
            if (e.target.type === 'range') {
                const valueDisplay = e.target.parentElement.querySelector('.knob-value, .slider-value');
                if (valueDisplay) {
                    valueDisplay.textContent = e.target.value;
                }
            }
        });
    }

    initializePropertyControls(propertiesContent, node, schema) {
        if (!node.properties.strudelProperties) {
            node.properties.strudelProperties = this.getDefaultProperties(node.type);
        }

        const props = node.properties.strudelProperties;
        
        // Set initial values for all controls
        Object.keys(props).forEach(propKey => {
            const control = propertiesContent.querySelector(`[data-prop="${propKey}"]`);
            if (control) {
                if (control.type === 'checkbox') {
                    control.checked = props[propKey];
                } else {
                    control.value = props[propKey];
                }
                
                // Update value display for sliders and knobs
                const valueDisplay = control.parentElement?.querySelector('.knob-value, .slider-value');
                if (valueDisplay) {
                    valueDisplay.textContent = props[propKey];
                }
            }
        });

        // Special handling for node instrument/properties that affect display
        if (node.instrument) {
            // Update the node subtitle to match the current instrument
            const nodeElement = document.getElementById(node.id);
            if (nodeElement) {
                const subtitle = nodeElement.querySelector('.node-subtitle');
                if (subtitle) {
                    subtitle.textContent = node.instrument;
                }
            }
        }
    }

    updateNodeProperty(node, propKey, value, isCheckbox = false) {
        // Ensure we're working with the correct node instance
        const targetNode = this.nodes.find(n => n.id === node.id);
        if (!targetNode) return;
        
        if (!targetNode.properties.strudelProperties) {
            targetNode.properties.strudelProperties = {};
        }

        // Convert value to appropriate type
        let schema = this.propertySchema.nodes[targetNode.type];
        let propSchema = null;
        
        // Check if it's a transform node
        if (!schema && this.propertySchema.transformNodes && this.propertySchema.transformNodes[targetNode.type]) {
            const transformDef = this.propertySchema.transformNodes[targetNode.type];
            propSchema = transformDef.properties[propKey];
        } else if (schema && schema.sections) {
            schema.sections.forEach(section => {
                if (section.properties[propKey]) {
                    propSchema = section.properties[propKey];
                }
            });
        }

        let convertedValue = value;
        if (isCheckbox) {
            convertedValue = value === 'true' || value === true;
        } else if (propSchema) {
            switch (propSchema.type) {
                case 'knob':
                case 'slider':
                case 'number':
                    convertedValue = parseFloat(value) || 0;
                    break;
                case 'toggle':
                    convertedValue = value === 'true' || value === true;
                    break;
            }
        }

        targetNode.properties.strudelProperties[propKey] = convertedValue;
        
        // Special handling for symbol/instrument changes - update node display
        if (propKey === 'symbol' || propKey === 'sound') {
            targetNode.instrument = convertedValue;
        }
        
        // Special handling for Transform nodes - update subtitle when type changes
        if (targetNode.type === 'Transform' && propKey === 'type') {
            targetNode.instrument = convertedValue;
        }
        
        this.updateStatus(`Updated ${targetNode.type} ${propKey}: ${convertedValue}`);
        
        // Update the visual display on the node
        this.updateNodeDisplay(targetNode);
        
        // Refresh the property panel to reflect the new values
        if (this.selectedNode && this.selectedNode.id === targetNode.id) {
            this.updateSidePanel(targetNode);
        }
    }



    async playNode(nodeId) {
        if (!this.audioInitialized) {
            try {
                await this.initializeAudio();
            } catch (error) {
                this.updateStatus('Cannot play: Audio not available - ' + error.message);
                return;
            }
        }

        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) return;

        try {
            this.updateStatus(`Playing ${node.instrument}...`);
            
            // Generate pattern based on connected network
            const pattern = this.generatePatternFromNode(node);
            
            this.currentPattern = pattern;
            eval(`strudel(${pattern})`);
            
            this.updateStatus(`Playing: ${pattern}`);
            
        } catch (error) {
            console.error('Error playing node:', error);
            this.updateStatus(`Error playing node: ${error.message}`);
        }
    }

    generatePatternFromNode(node) {
        // Build pattern by traversing connections backwards from this node
        const connectedNodes = this.getConnectedNodes(node);
        
        // Start with the base pattern for this node
        let pattern = this.buildNodePattern(node);
        
        // Apply connected nodes in reverse order (effect chains, etc.)
        connectedNodes.reverse().forEach(connectedNode => {
            const connectedPattern = this.buildNodePattern(connectedNode.node);
            pattern = `${connectedPattern}(${pattern})`;
        });
        
        return pattern;
    }

    getConnectedNodes(node) {
        // Find nodes that connect to this node (input connections)
        const inputConnections = this.connections.filter(conn => 
            conn.targetNodeId === node.id && conn.targetPort === 'input'
        );
        
        return inputConnections.map(conn => {
            const sourceNode = this.nodes.find(n => n.id === conn.sourceNodeId);
            return {
                node: sourceNode,
                connection: conn
            };
        }).filter(item => item.node);
    }

    buildNodePattern(node) {
        let pattern = '';
        const props = node.properties.strudelProperties || {};
        
        if (node.type === 'Instrument' || node.type === 'DrumSymbol' || node.type === 'instrument') {
            // Build instrument pattern with properties
            if (node.properties.note) {
                pattern = `note("${node.properties.note}")`;
            } else {
                // Use sound property if available, otherwise fall back to instrument
                const sound = props.sound || props.symbol || node.instrument;
                pattern = `s("${sound}")`;
            }
            
            // Apply instrument properties
            if (props.n !== undefined) {
                pattern += `.n(${props.n})`;
            }
            if (props.gain !== undefined && props.gain !== 1) {
                pattern += `.gain(${props.gain})`;
            }
            if (props.pan !== undefined && props.pan !== 0) {
                pattern += `.pan(${props.pan})`;
            }
            if (props.bank) {
                pattern += `.bank("${props.bank}")`;
            }
            if (props.dec !== undefined && props.dec !== 0.3) {
                pattern += `.dec(${props.dec})`;
            }
            
            // Apply ADSR envelope
            if (props.attack !== undefined && props.attack !== 0.01) {
                pattern += `.attack(${props.attack})`;
            }
            if (props.decay !== undefined && props.decay !== 0.3) {
                pattern += `.decay(${props.decay})`;
            }
            if (props.sustain !== undefined && props.sustain !== 0.7) {
                pattern += `.sustain(${props.sustain})`;
            }
            if (props.release !== undefined && props.release !== 0.5) {
                pattern += `.release(${props.release})`;
            }
            
            // Apply audio effects
            if (props.vowel) {
                pattern += `.vowel()`;
            }
            if (props.lpf !== undefined && props.lpf !== 8000) {
                pattern += `.lpf(${props.lpf})`;
            }
            if (props.hpf !== undefined && props.hpf !== 20) {
                pattern += `.hpf(${props.hpf})`;
            }
            if (props.bpf !== undefined && props.bpf !== 1000) {
                pattern += `.bpf(${props.bpf})`;
            }
            if (props.delay !== undefined && props.delay !== 0) {
                pattern += `.delay(${props.delay})`;
            }
            if (props.reverb !== undefined && props.reverb !== 0) {
                pattern += `.reverb(${props.reverb})`;
            }
            if (props.distort !== undefined && props.distort !== 0) {
                pattern += `.distort(${props.distort})`;
            }
            if (props.crush !== undefined && props.crush !== 0) {
                pattern += `.crush(${Math.round(props.crush)})`;
            }
            if (props.speed !== undefined && props.speed !== 1) {
                pattern += `.speed(${props.speed})`;
            }
            
        } else if (node.type === 'Repeater' || node.type === 'multiplier') {
            const amount = props.amount || 4;
            pattern = `*(${amount})`;
        } else if (node.type === 'Chance') {
            const probType = props.type || 'sometimes';
            const probability = props.probability || 0.5;
            const interval = props.interval || 4;
            
            // Map chance types to Strudel functions
            const chanceMap = {
                'often': `often(${probability})`,
                'sometimes': `sometimes(${probability})`,
                'rarely': `rarely(${probability})`,
                'chance': `when(${probability})`,
                'every': `every(${interval})`
            };
            
            pattern = chanceMap[probType] || `sometimes(${probability})`;
        } else if (node.type === 'Effect') {
            pattern = this.buildEffectPattern(node);
        } else if (node.type === 'Pitch') {
            const note = props.note || 0;
            const speed = props.speed || 1;
            pattern = `.note(${note}).speed(${speed})`;
        } else if (node.type === 'Generator') {
            const type = props.type || 'rand';
            const max = props.max || 8;
            pattern = `${type}(${max})`;
        } else if (node.type === 'Transform') {
            const transformType = props.type || 'chop';
            const amount = props.amount !== undefined ? props.amount : 0.5;
            const speed = props.speed !== undefined && props.speed !== 1 ? `.speed(${props.speed})` : '';
            
            // Map transform types to Strudel methods
            const transformMap = {
                'chop': `.chop(${Math.round(amount * 16)})`,
                'stutter': `.stutter(${Math.round(amount * 16)})`,
                'density': `.density(${amount})`,
                'linger': `.linger(${amount})`,
                'rarely': `.rarely(${amount})`,
                'sometimes': `.sometimes(${amount})`,
                'often': `.often(${amount})`,
                'slow': `.slow(${Math.max(1, Math.round(amount * 4))})`,
                'fast': `.fast(${Math.max(1, Math.round(amount * 4))})`,
                'rev': `.rev()`,
                'palindrome': `.palindrome()`
            };
            
            pattern = transformMap[transformType] || `.${transformType}(${amount})`;
            if (speed) pattern += speed;
        } else if (this.propertySchema.transformNodes && this.propertySchema.transformNodes[node.type]) {
            // Handle individual transform nodes
            pattern = this.buildIndividualTransformPattern(node);
        } else if (this.isControlNode(node)) {
            // Handle control nodes
            pattern = this.buildControlNodePattern(node);
        } else if (node.type === 'note') {
            pattern = `note("${node.properties.note}")`;
        } else {
            pattern = `s("${node.instrument}")`;
        }
        
        return pattern;
    }

    buildIndividualTransformPattern(node) {
        const props = node.properties.strudelProperties || {};
        const transformType = node.type;
        const transformDef = this.propertySchema.transformNodes[transformType];
        
        if (!transformDef) {
            return '';
        }

        let pattern = '';
        
        // Map transform types to Strudel methods with proper parameters
        const transformMap = {
            'chop': () => `.chop(${props.slices || 8})`,
            'stutter': () => `.stutter(${props.repeats || 2})`,
            'trunc': () => `.trunc(${props.amount || 0.5})`,
            'speed': () => `.speed(${props.factor || 1})`,
            'note': () => `.note(${props.semitones || 0})`,
            'coarse': () => `.coarse(${props.octaves || 0})`,
            'vibrato': () => {
                let p = `.vibrato(${props.rate || 4})`;
                if (props.depth !== undefined && props.depth !== 0.02) {
                    p += `.depth(${props.depth})`;
                }
                return p;
            },
            'tremolo': () => {
                let p = `.tremolo(${props.rate || 8})`;
                if (props.depth !== undefined && props.depth !== 0.5) {
                    p += `.depth(${props.depth})`;
                }
                return p;
            },
            'lpf': () => `.lpf(${props.frequency || 800})`,
            'hpf': () => `.hpf(${props.frequency || 200})`,
            'lpq': () => `.lpq(${props.q || 0.7})`,
            'gain': () => `.gain(${props.amount || 1})`,
            'delay': () => `.delay(${props.time || 0.25})`,
            'delayfb': () => `.delayfb(${props.amount || 0.4})`,
            'reverb': () => `.reverb(${props.amount || 0.3})`,
            'room': () => `.room(${props.size || 0.5})`,
            'often': () => `.often(${props.chance || 0.75})`,
            'sometimes': () => `.sometimes(${props.chance || 0.5})`,
            'rarely': () => `.rarely(${props.chance || 0.25})`
        };
        
        const transformFunc = transformMap[transformType];
        if (transformFunc) {
            pattern = transformFunc();
        } else {
            // Fallback for unknown transform types
            pattern = `.${transformType}()`;
        }
        
        return pattern;
    }

    buildControlNodePattern(node) {
        const props = node.properties.strudelProperties || {};
        const controlType = node.type;
        const controlDef = this.getControlNodeDefinition(controlType);
        
        if (!controlDef) {
            return '';
        }

        const serialization = controlDef.serialization;
        if (!serialization) {
            return '';
        }

        let pattern = '';
        
        switch (serialization.type) {
            case 'literal':
                // Direct value replacement
                pattern = serialization.template.replace('{value}', props.value || 0);
                break;
                
            case 'function':
                // Function call with arguments
                const func = serialization.function;
                const args = serialization.args || [];
                const argValues = args.map(argName => {
                    const value = props[argName];
                    return typeof value === 'string' ? `"${value}"` : value;
                }).join(', ');
                pattern = `${func}(${argValues})`;
                break;
                
            case 'method':
                // Method call on input
                const method = serialization.function;
                const methodArgs = serialization.args || [];
                const methodArgValues = methodArgs.map(argName => {
                    const value = props[argName];
                    return typeof value === 'string' ? `"${value}"` : value;
                }).join(', ');
                pattern = `.${method}(${methodArgValues})`;
                break;
                
            default:
                // Fallback for template-based serialization
                if (serialization.template) {
                    pattern = serialization.template;
                    // Replace placeholders with actual values
                    Object.keys(props).forEach(propKey => {
                        const placeholder = `{${propKey}}`;
                        const value = props[propKey];
                        pattern = pattern.replace(placeholder, typeof value === 'string' ? `"${value}"` : value);
                    });
                }
                break;
        }
        
        return pattern;
    }

    buildEffectPattern(node) {
        const props = node.properties.strudelProperties || {};
        const effectType = props.type || node.instrument || 'lpf';
        const amount = props.amount || 0.5;
        
        let pattern = '';
        
        // Map effect types to Strudel methods
        const effectMap = {
            'lpf': `.lpf(${amount})`,
            'hpf': `.hpf(${amount})`,
            'bpf': `.bpf(${amount})`,
            'lpq': `.lpq(${amount})`,
            'delay': `.delay(${amount})`,
            'delayfb': `.delayfb(${amount})`,
            'delayt': `.delayt(${amount})`,
            'reverb': `.reverb(${amount})`,
            'room': `.room(${amount})`,
            'distort': `.distort(${amount})`,
            'crush': `.crush(${Math.round(amount * 16)})`,
            'shape': `.shape(${amount})`,
            'vibrato': `.vibrato(${amount})`,
            'tremolo': `.tremolo(${amount})`,
            'chop': `.chop(${Math.round(amount * 16)})`,
            'stutter': `.stutter(${Math.round(amount * 16)})`
        };
        
        pattern = effectMap[effectType] || `.${effectType}(${amount})`;
        
        return pattern;
    }

    async playAllNodes() {
        if (this.nodes.length === 0) {
            this.updateStatus('No nodes to play');
            return;
        }

        if (!this.audioInitialized) {
            await this.initializeAudio();
        }

        try {
            // Check if graph normalizer is available
            if (this.graphNormalizer && this.nodeSchema) {
                console.log('Using advanced graph normalization');
                const result = this.graphNormalizer.normalizeGraph(this.nodes, this.connections);
                
                if (result.success && result.code) {
                    this.currentPattern = result.code;
                    eval(`strudel(${result.code})`);
                    
                    // Show normalization metadata
                    const metadata = result.metadata;
                    const chainInfo = `Normalized ${result.chains.length} chains`;
                    const ruleInfo = `Applied ${metadata.normalization.rulesApplied.length} normalization rules`;
                    
                    this.updateStatus(`Playing canonical pattern: ${result.code} | ${chainInfo} | ${ruleInfo}`);
                    return;
                } else {
                    console.warn('Graph normalization failed:', result.error);
                    this.updateStatus(`Normalization failed: ${result.error} - Using basic pattern generation`);
                }
            } else {
                console.warn('Graph normalizer not available - using basic pattern generation');
                this.updateStatus('Graph normalizer not available - Using basic pattern generation');
            }

            // Fallback to legacy pattern generation
            console.log('Falling back to legacy pattern generation');
            const rootNodes = this.findRootNodes();

            if (rootNodes.length === 0) {
                this.updateStatus('No root nodes found - creating individual patterns');
                // Fallback to individual patterns
                const patterns = this.nodes.map(node => this.buildNodePattern(node));
                const combinedPattern = patterns.join(' ');
                this.currentPattern = combinedPattern;
                eval(`strudel(${combinedPattern})`);
                this.updateStatus(`Playing all nodes: ${combinedPattern}`);
                return;
            }

            // Generate patterns from connected networks
            const patterns = rootNodes.map(node => this.generatePatternFromNode(node));
            const combinedPattern = patterns.join(' ');
            this.currentPattern = combinedPattern;
            
            eval(`strudel(${combinedPattern})`);
            this.updateStatus(`Playing connected networks: ${combinedPattern}`);
            
        } catch (error) {
            console.error('Error playing all nodes:', error);
            this.updateStatus(`Error playing all nodes: ${error.message}`);
        }
    }

    stopAllNodes() {
        try {
            if (typeof strudel !== 'undefined') {
                strudel.stop();
                this.updateStatus('Stopped all playback');
            }
        } catch (error) {
            console.error('Error stopping playback:', error);
        }
    }

    clearAllNodes() {
        this.nodes = [];
        this.selectedNode = null;
        this.connections = [];
        const canvas = document.getElementById('canvas-content');
        if (canvas) {
            canvas.innerHTML = '';
        }
        
        // Hide side panel and update delete button state
        this.hideSidePanel();
        this.updateDeleteButtonState();
        
        this.updateStatus('Cleared all nodes and connections');
    }



    updateNodeDisplay(node) {
        const nodeElement = document.getElementById(node.id);
        if (!nodeElement) return;
        
        const subtitle = nodeElement.querySelector('.node-subtitle');
        const noteDiv = nodeElement.querySelector('.node-note');
        
        if (subtitle) {
            subtitle.textContent = node.instrument;
        }
        
        if (noteDiv) {
            noteDiv.remove();
        }
        
        // Remove existing effects display from this node only
        const existingEffects = nodeElement.querySelectorAll('.property-value');
        existingEffects.forEach(effect => effect.remove());
        
        if (node.properties.note) {
            const newNoteDiv = document.createElement('div');
            newNoteDiv.className = 'node-note';
            newNoteDiv.textContent = `Note: ${node.properties.note}`;
            nodeElement.querySelector('.node-content').insertBefore(newNoteDiv, nodeElement.querySelector('.node-play-btn'));
        }
        
        // Re-render effects display
        const effectsHTML = this.renderNodeEffects(node);
        
        if (effectsHTML) {
            // Create a temporary container to parse the HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = effectsHTML;
            
            // Insert each effect element individually
            const contentDiv = nodeElement.querySelector('.node-content');
            const playBtn = nodeElement.querySelector('.node-play-btn');
            
            while (tempDiv.firstChild) {
                const effectElement = tempDiv.firstChild;
                contentDiv.insertBefore(effectElement, playBtn);
            }
        }
    }



    hideSidePanel() {
        const sidePanel = document.getElementById('side-panel');
        if (sidePanel) {
            sidePanel.style.right = '-400px';
        }
    }

    updateStatus(message) {
        const statusElement = document.getElementById('status-message');
        if (statusElement) {
            statusElement.textContent = message;
        }
        console.log('Status:', message);
    }

    showConnectionHelp() {
        const helpText = `
            Node Connection Guide:
            • Drag from output port (right) to input port (left) to create connections
            • Pattern nodes (Repeater, Chance) connect to Instruments
            • Effects can chain together and connect to Instruments
            • Press Delete key to remove selected node
            • Shift+Click on connection line to delete connection
            • Click "Clear Connections" to remove all connections
        `;
        this.updateStatus(helpText);
    }

    normalizeGraph() {
        // Check if graph normalizer is available
        if (this.graphNormalizer && this.nodeSchema) {
            try {
                const result = this.graphNormalizer.normalizeGraph(this.nodes, this.connections);
                
                if (result.success) {
                    console.log('Graph normalization successful:', {
                        chains: result.chains.length,
                        codeLength: result.code.length,
                        metadata: result.metadata
                    });
                    return result.chains;
                } else {
                    console.error('Graph normalization failed:', result.error);
                    this.updateStatus(`Normalization failed: ${result.error}`);
                    return [];
                }
            } catch (error) {
                console.error('Graph normalization error:', error);
                this.updateStatus(`Normalization error: ${error.message}`);
                return [];
            }
        } else {
            console.warn('Graph normalizer not available, using basic normalization');
            this.updateStatus('Graph normalizer not available - Using basic normalization');
            return this.basicNormalizeGraph();
        }
    }

    basicNormalizeGraph() {
        // Fallback to basic normalization for backward compatibility
        const rootNodes = this.findRootNodes();
        const normalizedChains = [];

        rootNodes.forEach(rootNode => {
            const chain = this.buildExecutionChain(rootNode);
            if (chain.length > 0) {
                normalizedChains.push(chain);
            }
        });

        return normalizedChains;
    }

    findRootNodes() {
        // Find nodes with no input connections (sources)
        return this.nodes.filter(node => {
            return !this.connections.some(conn => 
                conn.targetNodeId === node.id && conn.targetPort === 'input'
            );
        });
    }

    buildExecutionChain(node, visited = new Set()) {
        if (visited.has(node.id)) {
            return []; // Prevent cycles
        }

        visited.add(node.id);
        const nodeDef = this.nodeSchema.nodes[node.type];
        
        if (!nodeDef) {
            return [node];
        }

        // Sort connected nodes by execution priority
        const connectedNodes = this.getConnectedNodes(node);
        const sortedNodes = connectedNodes
            .map(item => item.node)
            .filter(n => n && !visited.has(n.id))
            .sort((a, b) => {
                const aDef = this.nodeSchema.nodes[a.type];
                const bDef = this.nodeSchema.nodes[b.type];
                return (aDef?.execution?.priority || 0) - (bDef?.execution?.priority || 0);
            });

        // Build chain recursively
        const chain = [node];
        sortedNodes.forEach(connectedNode => {
            const subChain = this.buildExecutionChain(connectedNode, new Set(visited));
            chain.push(...subChain);
        });

        return chain;
    }

    generateCanonicalCode() {
        // Check if graph normalizer is available
        if (this.graphNormalizer && this.nodeSchema) {
            try {
                const result = this.graphNormalizer.normalizeGraph(this.nodes, this.connections);
                
                if (result.success) {
                    console.log('Canonical code generated:', {
                        code: result.code,
                        chains: result.chains.length,
                        normalizationMetadata: result.metadata
                    });
                    return result.code;
                } else {
                    console.error('Canonical code generation failed:', result.error);
                    this.updateStatus(`Code generation failed: ${result.error}`);
                    return '';
                }
            } catch (error) {
                console.error('Canonical code generation error:', error);
                this.updateStatus(`Code generation error: ${error.message}`);
                return '';
            }
        } else {
            console.warn('Graph normalizer not available, using basic code generation');
            this.updateStatus('Graph normalizer not available - Using basic code generation');
            return this.basicGenerateCanonicalCode();
        }
    }

    basicGenerateCanonicalCode() {
        // Fallback to basic canonical code generation
        const normalizedChains = this.normalizeGraph();
        const patterns = [];

        normalizedChains.forEach(chain => {
            const pattern = this.buildChainPattern(chain);
            if (pattern) {
                patterns.push(pattern);
            }
        });

        return patterns.join(' ');
    }

    buildChainPattern(chain) {
        if (chain.length === 0) return '';
        
        // Start with the source node
        let pattern = this.buildNodePattern(chain[0]);
        
        // Apply nodes in execution order (excluding the source)
        for (let i = 1; i < chain.length; i++) {
            const node = chain[i];
            const nodeDef = this.nodeSchema.nodes[node.type];
            
            if (nodeDef?.execution?.wraps) {
                // Wrapper nodes enclose the entire pattern
                pattern = this.buildWrapperPattern(node, pattern);
            } else {
                // Regular nodes chain with the pattern
                const nodePattern = this.buildNodePattern(node);
                pattern = `${nodePattern}(${pattern})`;
            }
        }
        
        return pattern;
    }

    buildWrapperPattern(wrapperNode, innerPattern) {
        const props = wrapperNode.properties.strudelProperties || {};
        const wrapperDef = this.nodeSchema.nodes[wrapperNode.type];
        
        // Map wrapper types to Strudel functions
        const wrapperMap = {
            'Often': `often(${props.probability || 0.7})`,
            'Sometimes': `sometimes(${props.probability || 0.5})`,
            'Rarely': `rarely(${props.probability || 0.3})`,
            'Chance': (() => {
                const probType = props.type || 'sometimes';
                const probability = props.probability || 0.5;
                const interval = props.interval || 4;
                
                const chanceMap = {
                    'often': `often(${probability})`,
                    'sometimes': `sometimes(${probability})`,
                    'rarely': `rarely(${probability})`,
                    'chance': `when(${probability})`,
                    'every': `every(${interval})`
                };
                
                return chanceMap[probType] || `sometimes(${probability})`;
            })()
        };
        
        const wrapperFunc = wrapperMap[wrapperNode.type] || wrapperNode.type.toLowerCase();
        return `${wrapperFunc}(${innerPattern})`;
    }

    getExecutionStages() {
        if (!this.nodeSchema) return {};
        return this.nodeSchema.executionStages;
    }

    showNormalizationInfo() {
        if (this.graphNormalizer && this.nodeSchema) {
            try {
                const result = this.graphNormalizer.normalizeGraph(this.nodes, this.connections);
                
                if (result.success) {
                    const info = `
                        🔌 Strudel Graph Normalization Results:
                        
                        📊 Pipeline Steps Applied:
                        1. ✅ Prune & Validate (${this.nodes.length} nodes processed)
                        2. ✅ Linearize Chains (${result.chains.length} execution paths)
                        3. ✅ Resolve Structural Merges (handled multi-input nodes)
                        4. ✅ Sort Effects by Stage (execution priority applied)
                        5. ✅ Lift Wrapper Nodes (outermost wrappers preserved)
                        6. ✅ Collapse Redundancies (optimized effect chain)
                        7. ✅ Emit Canonical Code (deterministic output)
                        
                        🎵 Generated Pattern:
                        ${result.code}
                        
                        🧾 Normalization Metadata:
                        • Rules Applied: ${result.metadata.normalization.rulesApplied.join(', ')}
                        • Chains: ${result.metadata.normalization.inputChains}
                        • Timestamp: ${result.metadata.normalization.timestamp}
                        
                        ✅ Graph is valid and ready for playback!
                    `;
                    this.updateStatus(info);
                } else {
                    this.updateStatus(`❌ Normalization Failed: ${result.error}`);
                }
            } catch (error) {
                this.updateStatus(`❌ Normalization Error: ${error.message}`);
            }
        } else {
            this.updateStatus('⚠️ Graph Normalizer Not Available - Using basic normalization');
        }
    }

    // Debug function to test connections manually
    testConnection() {
        if (this.nodes.length < 2) {
            this.updateStatus('Need at least 2 nodes to test connection');
            return;
        }
        
        const node1 = this.nodes[0];
        const node2 = this.nodes[1];
        
        console.log('Testing connection between:', node1.type, '->', node2.type);
        
        if (this.canConnect(node1, 'output', node2, 'input')) {
            this.createConnection(node1, 'output', node2, 'input');
            this.updateStatus(`Test connection created: ${node1.type} -> ${node2.type}`);
        } else {
            this.updateStatus(`Test connection failed: ${node1.type} -> ${node2.type}`);
        }
    }

    // Integration with existing menu system
    createNodeFromInstrument(nodeType, instrument, x = 100, y = 100) {
        return this.createNode(nodeType || 'instrument', instrument, x, y);
    }

    // Generate example nodes demonstrating the normalization pipeline
    generateExampleNodes() {
        // Clear existing nodes first
        this.clearAllNodes();
        
        // Create a complex graph that demonstrates all normalization features
        
        // Source nodes (Sound generators)
        const bdNode = this.createNode('DrumSymbol', 'bd', 100, 100);
        const sdNode = this.createNode('DrumSymbol', 'sd', 100, 300);
        const pianoNode = this.createNode('Instrument', 'piano', 100, 500);
        
        // Structural nodes (Pattern combinators) - demonstrates merge resolution
        const stackNode = this.createNode('Stack', 'parallel_drums', 300, 200);
        
        // Rhythmic nodes (Time slicing) - will be sorted by stage
        const chopNode = this.createNode('Chop', 'granular', 500, 100);
        const stutterNode = this.createNode('Stutter', 'repeats', 500, 300);
        const transformNode = this.createNode('Transform', 'chop', 500, 500);
        
        // Effect nodes (Chainable transforms) - will be sorted by stage priority
        const lpfNode = this.createNode('LPF', 'lowpass', 700, 100);
        const hpfNode = this.createNode('HPF', 'highpass', 700, 200);
        const delayNode = this.createNode('Delay', 'echo', 700, 300);
        const reverbNode = this.createNode('Reverb', 'space', 700, 400);
        
        // Wrapper nodes (Higher-order transforms) - demonstrates wrapper lifting
        const oftenNode = this.createNode('Often', 'high_prob', 900, 200);
        const sometimesNode = this.createNode('Sometimes', 'medium_prob', 900, 400);
        
        // Control nodes (Modulators) - demonstrates pruning
        const lfoNode = this.createNode('LFO', 'vibrato', 500, 600);
        const randomNode = this.createNode('Random', 'random_val', 700, 600);
        
        // Set up properties that will demonstrate redundancy collapse
        if (bdNode.properties.strudelProperties) {
            bdNode.properties.strudelProperties.bank = 'RolandTR808';
            bdNode.properties.strudelProperties.dec = 0.4;
            bdNode.properties.strudelProperties.gain = 1.0; // Neutral value (will be collapsed)
        }
        
        if (sdNode.properties.strudelProperties) {
            sdNode.properties.strudelProperties.bank = 'RolandTR808';
            sdNode.properties.strudelProperties.dec = 0.3;
            sdNode.properties.strudelProperties.gain = 0.8;
        }
        
        if (pianoNode.properties.strudelProperties) {
            pianoNode.properties.strudelProperties.sound = 'piano';
            pianoNode.properties.strudelProperties.gain = 0.8;
            pianoNode.properties.strudelProperties.pan = -0.2;
            pianoNode.properties.strudelProperties.attack = 0.01;
        }
        
        // Set up effect properties for stage sorting demonstration
        if (chopNode.properties.strudelProperties) {
            chopNode.properties.strudelProperties.amount = 8;
        }
        
        if (stutterNode.properties.strudelProperties) {
            stutterNode.properties.strudelProperties.amount = 4;
        }
        
        if (transformNode.properties.strudelProperties) {
            transformNode.properties.strudelProperties.type = 'density';
            transformNode.properties.strudelProperties.amount = 0.7;
            transformNode.properties.strudelProperties.speed = 1.1;
        }
        
        if (lpfNode.properties.strudelProperties) {
            lpfNode.properties.strudelProperties.frequency = 800; // Will be sorted before delay
        }
        
        if (hpfNode.properties.strudelProperties) {
            hpfNode.properties.strudelProperties.frequency = 200;
        }
        
        if (delayNode.properties.strudelProperties) {
            delayNode.properties.strudelProperties.time = 0.25; // Will be sorted after spectral effects
            delayNode.properties.strudelProperties.feedback = 0.4;
        }
        
        if (reverbNode.properties.strudelProperties) {
            reverbNode.properties.strudelProperties.room = 0.3;
        }
        
        if (oftenNode.properties.strudelProperties) {
            oftenNode.properties.strudelProperties.probability = 0.7;
        }
        
        if (sometimesNode.properties.strudelProperties) {
            sometimesNode.properties.strudelProperties.probability = 0.5;
        }
        
        if (lfoNode.properties.strudelProperties) {
            lfoNode.properties.strudelProperties.rate = 1.5;
            lfoNode.properties.strudelProperties.depth = 0.3;
        }
        
        if (randomNode.properties.strudelProperties) {
            randomNode.properties.strudelProperties.min = 0;
            randomNode.properties.strudelProperties.max = 8;
        }
        
        // Create complex connections demonstrating all normalization features
        // Chain 1: bd -> chop -> lpf -> delay -> often (will demonstrate stage sorting + wrapper lifting)
        this.createConnection(bdNode, 'output', chopNode, 'input');
        this.createConnection(chopNode, 'output', lpfNode, 'input');
        this.createConnection(lpfNode, 'output', delayNode, 'input');
        this.createConnection(delayNode, 'output', oftenNode, 'input');
        
        // Chain 2: sd -> stutter -> hpf -> reverb -> sometimes (will demonstrate stage sorting)
        this.createConnection(sdNode, 'output', stutterNode, 'input');
        this.createConnection(stutterNode, 'output', hpfNode, 'input');
        this.createConnection(hpfNode, 'output', reverbNode, 'input');
        this.createConnection(reverbNode, 'output', sometimesNode, 'input');
        
        // Chain 3: piano (direct connection to wrapper)
        this.createConnection(pianoNode, 'output', sometimesNode, 'input');
        
        // Chain 4: transform demo - bd -> transform -> often
        this.createConnection(bdNode, 'output', transformNode, 'input');
        this.createConnection(transformNode, 'output', oftenNode, 'input');
        
        // Structural merge: stack combines bd and sd
        this.createConnection(bdNode, 'output', stackNode, 'input');
        this.createConnection(sdNode, 'output', stackNode, 'input');
        
        // Orphan control nodes (will be pruned)
        // lfoNode and randomNode have no connections - will be removed in normalization
        
        // Update visual displays
        [bdNode, sdNode, pianoNode, stackNode, chopNode, stutterNode, transformNode,
         lpfNode, hpfNode, delayNode, reverbNode, oftenNode, sometimesNode,
         lfoNode, randomNode].forEach(node => {
            this.updateNodeDisplay(node);
        });
        
        this.updateStatus('Generated complex example demonstrating all normalization features: pruning, chain linearization, stage sorting, wrapper lifting, and redundancy collapse');
    }

    /* ============================
       CANVAS PAN & ZOOM CONTROLS
    ============================ */

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

        // Canvas panning with mouse - simplified
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

        // Update pan tool button state
        this.updatePanToolButton();
    }

    zoomIn() {
        this.zoom(0.1);
    }

    zoomOut() {
        this.zoom(-0.1);
    }

    zoom(delta, centerX = null, centerY = null) {
        const newScale = Math.max(0.1, Math.min(3, this.canvasScale + delta));
        
        if (centerX !== null && centerY !== null) {
            // Zoom towards cursor position
            const canvas = document.getElementById('canvas-content');
            const rect = canvas.getBoundingClientRect();
            const canvasX = centerX - rect.left;
            const canvasY = centerY - rect.top;
            
            // Adjust offset to zoom towards cursor
            this.canvasOffsetX = canvasX - (canvasX - this.canvasOffsetX) * (newScale / this.canvasScale);
            this.canvasOffsetY = canvasY - (canvasY - this.canvasOffsetY) * (newScale / this.canvasScale);
        }
        
        this.canvasScale = newScale;
        this.updateCanvasTransform();
    }

    resetZoom() {
        this.canvasScale = 1;
        this.canvasOffsetX = 0;
        this.canvasOffsetY = 0;
        this.updateCanvasTransform();
    }

    togglePanTool() {
        this.panToolActive = !this.panToolActive;
        this.updatePanToolButton();
        this.updateStatus(this.panToolActive ? 'Pan tool active - Click and drag to move canvas' : 'Pan tool inactive - Select nodes to interact');
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
        
        this.canvasOffsetX += deltaX;
        this.canvasOffsetY += deltaY;
        
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
            const transform = `translate(${this.canvasOffsetX}px, ${this.canvasOffsetY}px) scale(${this.canvasScale})`;
            canvas.style.transform = transform;
            
            // Add zoomed class when not at 100%
            if (this.canvasScale !== 1) {
                canvas.classList.add('zoomed');
            } else {
                canvas.classList.remove('zoomed');
            }
            
            // Update zoom level display
            const zoomLevel = document.getElementById('zoom-level');
            if (zoomLevel) {
                zoomLevel.textContent = `${Math.round(this.canvasScale * 100)}%`;
            }
            
            // Update all connection positions when zoomed/panned
            this.updateAllConnections();
        }
    }

    updateAllConnections() {
        // Update all connection lines when canvas is transformed
        const connections = document.querySelectorAll('.connection-line');
        connections.forEach(line => {
            const connectionId = line.dataset.connectionId;
            const connection = this.connections.find(c => c.id === connectionId);
            if (connection) {
                this.updateConnectionPosition(connection);
            }
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.nodeManager = new NodeManager();
    
    // Add buttons for the enhanced system
    setTimeout(() => {
        const playControls = document.querySelector('.play-controls');
        if (playControls) {
            const exampleBtn = document.createElement('button');
            exampleBtn.className = 'btn btn-secondary';
            exampleBtn.innerHTML = '<i class="fas fa-magic"></i> Generate Examples';
            exampleBtn.onclick = () => window.nodeManager.generateExampleNodes();
            playControls.appendChild(exampleBtn);
            
            const testConnBtn = document.createElement('button');
            testConnBtn.className = 'btn btn-secondary';
            testConnBtn.innerHTML = '<i class="fas fa-plug"></i> Test Connection';
            testConnBtn.onclick = () => window.nodeManager.testConnection();
            playControls.appendChild(testConnBtn);
            
            const normalizeBtn = document.createElement('button');
            normalizeBtn.className = 'btn btn-secondary';
            normalizeBtn.innerHTML = '<i class="fas fa-project-diagram"></i> Show Normalization';
            normalizeBtn.onclick = () => window.nodeManager.showNormalizationInfo();
            playControls.appendChild(normalizeBtn);
            
            const clearConnBtn = document.createElement('button');
            clearConnBtn.className = 'btn btn-secondary';
            clearConnBtn.innerHTML = '<i class="fas fa-cut"></i> Clear Connections';
            clearConnBtn.onclick = () => window.nodeManager.clearAllConnections();
            playControls.appendChild(clearConnBtn);
        }
    }, 1000);
});