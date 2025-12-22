/**
 * NodeFactory.js
 * Handles creation of node DOM elements and UI updates.
 */
class NodeFactory {
    constructor(manager) {
        this.manager = manager;
        this.nodes = [];
        this.selectedNode = null;
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
        this.initializeNodeProperties(node);

        // Set initial instrument/sound properties based on type
        if (type === 'DrumSymbol') {
            node.properties.strudelProperties.symbol = instrument;
        } else if (type === 'Instrument') {
            node.properties.strudelProperties.sound = instrument;
        }

        this.nodes.push(node);
        this.renderNode(node);
        this.manager.updateStatus(`Created ${type} node: ${instrument}`);
        
        // Update strudel output
        this.manager.updateStrudelOutput();
        this.manager.updateBackButtonState();

        return node;
    }

    initializeNodeProperties(node) {
        const type = node.type;

        if (this.manager.propertySchema) {
            if (this.manager.propertySchema.nodes && this.manager.propertySchema.nodes[type]) {
                node.properties.strudelProperties = this.getDefaultProperties(type);
            } else if (this.manager.propertySchema.transformNodes && this.manager.propertySchema.transformNodes[type]) {
                node.properties.strudelProperties = this.getDefaultProperties(type);
            }
        }

        if (this.manager.controlNodesSchema?.controlNodes?.[type]) {
            node.properties.strudelProperties = this.getDefaultControlNodeProperties(type);
        }

        if (this.manager.patternCombinatorsSchema?.combinators?.[type]) {
            node.properties.strudelProperties = this.getDefaultCombinatorProperties(type);
        }

        if (this.manager.patternFunctionsSchema?.constructors?.[type]) {
            node.properties.strudelProperties = this.getDefaultPatternFunctionProperties(type);
        }

        if (this.manager.nodeSchema?.nodes?.[type]) {
            const nodeDef = this.manager.nodeSchema.nodes[type];
            if (nodeDef.properties) {
                node.properties.strudelProperties = this.getDefaultNodeSchemaProperties(type);
            }
        }
    }

    renderNode(node) {
        const canvas = document.getElementById('canvas-content');
        if (!canvas) return;

        const nodeElement = document.createElement('div');
        const category = this.getNodeCategory(node);
        const stage = this.getNodeExecutionStage(node);

        nodeElement.className = `node node-${node.type} node-category-${category}`;
        nodeElement.id = node.id;
        nodeElement.style.left = node.x + 'px';
        nodeElement.style.top = node.y + 'px';

        const categoryIcon = this.getCategoryIcon(category);
        const stageInfo = stage ? `<div class="node-stage">${stage.toUpperCase()}</div>` : '';

        // Build connection ports
        let portsHTML = this.buildPortsHTML(node);

        nodeElement.innerHTML = `
            <div class="node-header">
                <div class="node-title">${categoryIcon} ${this.getNodeTitle(node)}</div>
                ${stageInfo}
            </div>
            <div class="node-content">
                <div class="node-subtitle">${this.getNodeSubtitle(node)}</div>
                ${node.properties.note ? `<div class="node-note">Note: ${node.properties.note}</div>` : ''}
                ${this.renderNodeEffects(node)}
                ${this.renderChildPort(node)}
                <div class="double-click-hint">Double-click to edit children</div>
            </div>
            ${portsHTML}
        `;

        this.makeNodeDraggable(nodeElement, node);
        this.makeNodeDoubleClickable(nodeElement, node);

        nodeElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectNode(node);
            
            // Ensure back button state is updated when in child mode
            if (this.manager.currentLevel.level > 0) {
                this.manager.updateBackButtonState();
            }
        });

        this.manager.connections.addConnectionPortListeners(nodeElement, node);
        canvas.appendChild(nodeElement);
    }

    buildPortsHTML(node) {
        let portsHTML = '';
        const nodeDef = this.manager.nodeSchema?.nodes?.[node.type];

        if (this.isControlNode(node)) {
            const controlNodeDef = this.manager.controlNodesSchema?.controlNodes?.[node.type];
            if (controlNodeDef?.inputs?.includes('controlIn')) {
                portsHTML += `<div class="node-input connection-port control-port" data-port="input" title="Control Input"></div>`;
            }
            if (controlNodeDef?.outputs?.includes('controlOut')) {
                portsHTML += `<div class="node-output connection-port control-port" data-port="output" title="Control Output"></div>`;
            }
        } else if (nodeDef && nodeDef.multiInput) {
            for (let i = 0; i < (nodeDef.sockets.in.length || 4); i++) {
                portsHTML += `<div class="node-input connection-port" data-port="input${i}" title="Input ${i + 1}"></div>`;
            }
            portsHTML += `<div class="node-output connection-port" data-port="output" title="Output"></div>`;
        } else if (nodeDef && nodeDef.multiOutput) {
            portsHTML = `<div class="node-input connection-port" data-port="input" title="Input"></div>`;
            for (let i = 0; i < (nodeDef.sockets.out.length || 2); i++) {
                portsHTML += `<div class="node-output connection-port" data-port="output${i}" title="Output ${i + 1}"></div>`;
            }
        } else {
            portsHTML = `
                <div class="node-input connection-port" data-port="input" title="Input"></div>
                <div class="node-output connection-port" data-port="output" title="Output"></div>
            `;
        }
        return portsHTML;
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
                const scale = this.manager.canvas.scale;
                const deltaX = (e.clientX - startX) / scale;
                const deltaY = (e.clientY - startY) / scale;

                node.x = initialX + deltaX;
                node.y = initialY + deltaY;

                element.style.left = node.x + 'px';
                element.style.top = node.y + 'px';

                this.manager.connections.updateAllConnections();
            }
        };

        const stopDrag = () => {
            if (isDragging) {
                isDragging = false;
                element.classList.remove('dragging');
                document.removeEventListener('mousemove', drag);
                document.removeEventListener('mouseup', stopDrag);
                this.manager.connections.updateAllConnections();
            }
        };
    }

    selectNode(node) {
        // Deselect all nodes
        document.querySelectorAll('.node.selected').forEach(el => el.classList.remove('selected'));
        this.selectedNode = node;
        
        // Select the node visually
        const nodeElement = document.getElementById(node.id);
        if (nodeElement) {
            nodeElement.classList.add('selected');
            
            // Scroll the node into view if needed
            nodeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Show and update side panel
        this.showSidePanel();
        this.updateSidePanel(node);
        this.updateDeleteButtonState();
    }

    deleteNode(nodeId) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) return;

        // Remove connections
        this.manager.connections.connections = this.manager.connections.connections.filter(conn => {
            if (conn.sourceNodeId === nodeId || conn.targetNodeId === nodeId) {
                const svg = document.querySelector(`[data-connection-id="${conn.id}"]`);
                if (svg) svg.remove();
                return false;
            }
            return true;
        });

        this.nodes = this.nodes.filter(n => n.id !== nodeId);
        const nodeElement = document.getElementById(nodeId);
        if (nodeElement) nodeElement.remove();

        if (this.selectedNode && this.selectedNode.id === nodeId) {
            this.selectedNode = null;
        }

        this.updateDeleteButtonState();
        this.manager.updateStatus(`Deleted ${node.type} node`);
        
        // Update strudel output and back button state
        this.manager.updateStrudelOutput();
        this.manager.updateBackButtonState();
    }

    deleteSelectedNode() {
        if (this.selectedNode) {
            this.deleteNode(this.selectedNode.id);
            this.hideSidePanel();
        }
    }

    clearAllNodes() {
        this.nodes = [];
        this.selectedNode = null;
        const canvas = document.getElementById('canvas-content');
        if (canvas) canvas.innerHTML = '';
        this.hideSidePanel();
        this.updateDeleteButtonState();
        
        // Update strudel output and back button state
        this.manager.updateStrudelOutput();
        this.manager.updateBackButtonState();
    }

    updateNodeDisplay(node) {
        const nodeElement = document.getElementById(node.id);
        if (!nodeElement) return;

        const subtitle = nodeElement.querySelector('.node-subtitle');
        if (subtitle) subtitle.textContent = this.getNodeSubtitle(node);

        // Update effects display
        const existingEffects = nodeElement.querySelectorAll('.property-value');
        existingEffects.forEach(effect => effect.remove());

        const effectsHTML = this.renderNodeEffects(node);
        if (effectsHTML) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = effectsHTML;
            const contentDiv = nodeElement.querySelector('.node-content');
            const childPort = nodeElement.querySelector('.child-port');

            while (tempDiv.firstChild) {
                contentDiv.insertBefore(tempDiv.firstChild, childPort);
            }
        }
    }

    // ... (Helper methods for properties, schemas, and UI rendering would go here)
    // For brevity, I'm including the essential ones.

    getNodeTitle(node) {
        if (this.manager.nodeSchema?.nodes?.[node.type]) {
            return this.manager.nodeSchema.nodes[node.type].title || node.type;
        }
        return node.type;
    }

    getNodeCategory(node) {
        return this.manager.nodeSchema?.nodes?.[node.type]?.category || 'unknown';
    }

    getNodeExecutionStage(node) {
        return this.manager.nodeSchema?.nodes?.[node.type]?.execution?.stage || null;
    }

    getCategoryIcon(category) {
        const icons = {
            'source': '🎵', 'structural': '🔗', 'rhythmic': '🥁', 'effect': '🎛️',
            'wrapper': '📦', 'control': '🎮', 'modulation': '🎚️', 'pitch': '🎼',
            'spectral': '🌈', 'space': '🌌', 'value': '🔢', 'lfo': '🌊',
            'random': '🎲', 'pattern': '📝', 'utility': '🔧'
        };
        return icons[category] || '⚙️';
    }

    isControlNode(node) {
        return !!this.manager.controlNodesSchema?.controlNodes?.[node.type];
    }

    getControlNodeDefinition(nodeType) {
        return this.manager.controlNodesSchema?.controlNodes?.[nodeType];
    }

    showSidePanel() {
        const sidePanel = document.getElementById('side-panel');
        if (sidePanel) {
            sidePanel.classList.add('open');
            sidePanel.style.right = '0';
        }
    }

    hideSidePanel() {
        const sidePanel = document.getElementById('side-panel');
        if (sidePanel) sidePanel.style.right = '-400px';
    }

    updateDeleteButtonState() {
        const deleteBtn = document.getElementById('delete-selected-node');
        if (deleteBtn) {
            deleteBtn.disabled = !this.selectedNode;
            if (this.selectedNode) {
                deleteBtn.classList.remove('btn-disabled');
            } else {
                deleteBtn.classList.add('btn-disabled');
            }
        }
    }

    // Placeholder for property generation methods to keep file size manageable
    updateSidePanel(node) {
        if (!node) return;
        
        // Update the side panel title
        const titleElement = document.getElementById('side-panel-title');
        if (titleElement) {
            titleElement.textContent = `${node.type} Properties`;
        }
        
        // Update node ID display
        const nodeInfo = document.querySelector('.node-info');
        if (nodeInfo) {
            const nodeIdElement = nodeInfo.querySelector('.node-id');
            if (nodeIdElement) {
                nodeIdElement.textContent = `ID: ${node.id}`;
            }
        }
        
        // Update instrument selection
        const instrumentSelect = document.getElementById('node-instrument');
        if (instrumentSelect) {
            // Set the current instrument
            const options = Array.from(instrumentSelect.options);
            const currentOption = options.find(option => 
                option.value.toLowerCase() === node.instrument.toLowerCase()
            );
            if (currentOption) {
                instrumentSelect.value = currentOption.value;
            } else {
                // If instrument not found, add it as a custom option
                const customOption = document.createElement('option');
                customOption.value = node.instrument;
                customOption.textContent = node.instrument;
                instrumentSelect.appendChild(customOption);
                instrumentSelect.value = node.instrument;
            }
        }
        
        // Update note field
        const noteInput = document.getElementById('node-note');
        if (noteInput) {
            noteInput.value = node.properties.note || '';
        }
        
        // Update duration slider
        const durationSlider = document.getElementById('node-duration');
        const durationValue = document.getElementById('node-duration-val');
        if (durationSlider && durationValue) {
            durationSlider.value = node.properties.duration || 500;
            durationValue.textContent = node.properties.duration || 500;
        }
        
        // Update volume slider
        const volumeSlider = document.getElementById('node-volume');
        const volumeValue = document.getElementById('node-volume-val');
        if (volumeSlider && volumeValue) {
            volumeSlider.value = node.properties.volume || 80;
            volumeValue.textContent = node.properties.volume || 80;
        }
        
        // Update effects based on node properties
        this.updateEffectsPanel(node);
    }

    updateEffectsPanel(node) {
        const effects = node.properties.effects || {};
        const strudelProps = node.properties.strudelProperties || {};
        
        // Update effect checkboxes and sliders based on node properties
        const effectControls = [
            { checkbox: 'effect-lpf', slider: 'effect-lpf-value', value: 'lpf' },
            { checkbox: 'effect-hpf', slider: 'effect-hpf-value', value: 'hpf' },
            { checkbox: 'effect-bpf', slider: 'effect-bpf-value', value: 'bpf' },
            { checkbox: 'effect-delay', slider: 'effect-delay-value', value: 'delay' },
            { checkbox: 'effect-reverb', slider: 'effect-reverb-value', value: 'reverb' },
            { checkbox: 'effect-distort', slider: 'effect-distort-value', value: 'distort' },
            { checkbox: 'effect-speed', slider: 'effect-speed-value', value: 'speed' },
            { checkbox: 'effect-pan', slider: 'effect-pan-value', value: 'pan' }
        ];
        
        effectControls.forEach(control => {
            const checkbox = document.getElementById(control.checkbox);
            const slider = document.getElementById(control.slider);
            const valueDisplay = document.getElementById(control.checkbox.replace('effect-', 'effect-') + '-val');
            
            if (checkbox && slider && valueDisplay) {
                const isActive = effects[control.value] !== undefined || strudelProps[control.value] !== undefined;
                checkbox.checked = isActive;
                
                const value = effects[control.value] || strudelProps[control.value] || this.getDefaultEffectValue(control.value);
                slider.disabled = !isActive;
                slider.value = value;
                
                // Update value display
                if (control.value === 'lpf' || control.value === 'hpf' || control.value === 'bpf') {
                    valueDisplay.textContent = `${Math.round(value)} Hz`;
                } else if (control.value === 'pan') {
                    valueDisplay.textContent = value.toFixed(2);
                } else {
                    valueDisplay.textContent = value.toFixed(2);
                }
            }
        });
    }

    getDefaultEffectValue(effectType) {
        const defaults = {
            'lpf': 800,
            'hpf': 200,
            'bpf': 1200,
            'delay': 0.25,
            'reverb': 0.3,
            'distort': 0.3,
            'speed': 1.0,
            'pan': 0
        };
        return defaults[effectType] || 0.5;
    }

    renderNodeEffects(node) {
        // Implementation from original nodeManager.js
        return '';
    }

    // Hierarchical Node System Methods
    renderChildPort(node) {
        const childCount = node.children ? node.children.length : 0;
        return `
            <div class="child-port" data-node-id="${node.id}" title="Add child nodes">
                <i class="fas fa-plus"></i>
                ${childCount > 0 ? `<span class="child-count">${childCount}</span>` : ''}
            </div>
        `;
    }

    getNodeSubtitle(node) {
        const baseSubtitle = node.instrument;
        const childCount = node.children ? node.children.length : 0;
        
        if (childCount > 0) {
            // Show mini-notation representation of child nodes
            const childNotation = this.generateChildNotation(node);
            return `${baseSubtitle} | ${childNotation}`;
        }
        return baseSubtitle;
    }

    generateChildNotation(node) {
        if (!node.children || node.children.length === 0) return '';
        
        // Group children by their container type (brackets)
        const groups = [];
        let currentGroup = [];
        
        node.children.forEach(child => {
            if (child.containerType) {
                if (currentGroup.length > 0) {
                    groups.push({ type: 'sequence', items: currentGroup });
                    currentGroup = [];
                }
                groups.push({ type: child.containerType, items: [child] });
            } else {
                currentGroup.push(child);
            }
        });
        
        if (currentGroup.length > 0) {
            groups.push({ type: 'sequence', items: currentGroup });
        }
        
        // Generate notation string
        return groups.map(group => {
            if (group.type === 'sequence') {
                return group.items.map(item => this.getChildDisplayText(item)).join(' ');
            } else {
                const container = group.type === 'parallel' ? '[ ]' : '< >';
                const content = group.items.map(item => this.getChildDisplayText(item)).join(' ');
                return container.replace(' ', content);
            }
        }).join(' ');
    }

    getChildDisplayText(child) {
        if (child.type === 'note') {
            return child.properties.note || '0';
        } else if (child.type === 'sound') {
            return child.instrument || child.properties.sound || 's';
        } else if (child.type === 'rest') {
            return '~';
        }
        return child.instrument || child.type;
    }

    makeNodeDoubleClickable(element, node) {
        element.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.enterNodeLevel(node);
        });
    }

    enterNodeLevel(node) {
        // Store current level information
        if (!this.manager.currentLevel) {
            this.manager.currentLevel = { level: 0, parentNode: null, nodes: [...this.nodes] };
        }
        
        // Store previous state
        this.manager.previousLevel = {
            nodes: [...this.nodes],
            selectedNode: this.selectedNode,
            canvasOffset: { ...this.manager.canvas }
        };
        
        // Initialize child nodes if not exists
        if (!node.children) {
            node.children = [];
        }
        
        // Switch to child node editing mode
        this.manager.currentLevel = {
            level: this.manager.currentLevel.level + 1,
            parentNode: node,
            nodes: node.children
        };
        
        this.nodes = node.children;
        this.selectedNode = null;
        
        // Clear canvas and re-render child nodes
        this.clearCanvasForChildLevel();
        this.renderChildNodes(node.children);
        
        this.manager.updateStatus(`Editing children of ${node.type} node (Level ${this.manager.currentLevel.level})`);
        this.updateDeleteButtonState();
        
        // Update strudel output and back button state
        this.manager.updateStrudelOutput();
        this.manager.updateBackButtonState();
        
        // Ensure the side panel is updated for the parent node
        this.updateSidePanel(node);
    }

    exitNodeLevel() {
        if (!this.manager.previousLevel) return;
        
        // Restore previous state
        this.nodes = [...this.manager.previousLevel.nodes];
        this.selectedNode = this.manager.previousLevel.selectedNode;
        
        // Clear current canvas but preserve the main nodes
        this.clearCanvasForExitLevel();
        
        // Re-render all nodes
        this.nodes.forEach(node => {
            this.renderNode(node);
        });
        
        // Restore level info
        this.manager.currentLevel = this.manager.previousLevel;
        this.manager.previousLevel = null;
        
        this.manager.updateStatus('Returned to main level');
        this.updateDeleteButtonState();
        
        // Update strudel output and back button state
        this.manager.updateStrudelOutput();
        this.manager.updateBackButtonState();
    }

    clearCanvasForExitLevel() {
        const canvas = document.getElementById('canvas-content');
        if (canvas) {
            // Remove all existing nodes
            canvas.querySelectorAll('.node').forEach(nodeEl => {
                nodeEl.remove();
            });
            
            // Remove dimmed class from any remaining elements
            canvas.querySelectorAll('.dimmed').forEach(el => {
                el.classList.remove('dimmed');
            });
        }
    }

    clearCanvasForChildLevel() {
        const canvas = document.getElementById('canvas-content');
        if (canvas) {
            // Keep existing nodes but mark them as dimmed
            canvas.querySelectorAll('.node').forEach(nodeEl => {
                nodeEl.classList.add('dimmed');
            });
        }
    }

    renderChildNodes(childNodes) {
        // Position child nodes in a grid within the parent node
        const parentNodeEl = document.getElementById(this.manager.currentLevel.parentNode.id);
        if (!parentNodeEl) return;
        
        const parentRect = parentNodeEl.getBoundingClientRect();
        const canvasRect = document.getElementById('canvas-content').getBoundingClientRect();
        
        const startX = parentRect.left - canvasRect.left + 20;
        const startY = parentRect.bottom - canvasRect.top + 20;
        
        childNodes.forEach((childNode, index) => {
            // Calculate position in a 2x2 grid around the parent
            const col = index % 2;
            const row = Math.floor(index / 2);
            
            childNode.x = startX + (col * 120);
            childNode.y = startY + (row * 80);
            
            this.renderNode(childNode);
        });
    }

    addChildNode(parentNodeId, childType, childInstrument) {
        const parentNode = this.nodes.find(n => n.id === parentNodeId);
        if (!parentNode) return;
        
        if (!parentNode.children) {
            parentNode.children = [];
        }
        
        const childNode = {
            id: 'child-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            type: childType,
            instrument: childInstrument,
            x: 0,
            y: 0,
            properties: {
                note: '',
                duration: 500,
                volume: 80,
                effects: {},
                strudelProperties: {}
            },
            containerType: null // Will be set based on how it's added
        };
        
        parentNode.children.push(childNode);
        
        // Update parent node display
        this.updateNodeDisplay(parentNode);
        
        // If we're currently editing this parent, re-render
        if (this.manager.currentLevel?.parentNode?.id === parentNodeId) {
            this.renderChildNodes(parentNode.children);
        }
        
        // Update strudel output
        this.manager.updateStrudelOutput();
        this.manager.updateBackButtonState();
        
        return childNode;
    }

    removeChildNode(parentNodeId, childNodeId) {
        const parentNode = this.nodes.find(n => n.id === parentNodeId);
        if (!parentNode || !parentNode.children) return;
        
        parentNode.children = parentNode.children.filter(child => child.id !== childNodeId);
        
        // Update parent node display
        this.updateNodeDisplay(parentNode);
        
        // If we're currently editing this parent, re-render
        if (this.manager.currentLevel?.parentNode?.id === parentNodeId) {
            this.renderChildNodes(parentNode.children);
        }
        
        // Update strudel output
        this.manager.updateStrudelOutput();
        this.manager.updateBackButtonState();
    }

    getDefaultProperties(type) { return {}; }
    getDefaultControlNodeProperties(type) { return {}; }
    getDefaultCombinatorProperties(type) { return {}; }
    getDefaultPatternFunctionProperties(type) { return {}; }
    getDefaultNodeSchemaProperties(type) { return {}; }
}
