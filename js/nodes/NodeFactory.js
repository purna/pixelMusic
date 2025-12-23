/**
 * NodeFactory.js
 * Handles creation of node DOM elements and UI updates.
 */
class NodeFactory {
    constructor(manager) {
        this.manager = manager;
        this.nodes = [];
        this.selectedNode = null;
        this.sidePanelListenersAdded = false;
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

        // Add event listeners for the side panel controls if not already added
        if (!this.sidePanelListenersAdded) {
            this.addSidePanelListeners();
            this.sidePanelListenersAdded = true;
        }

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

        // Update instrument selection with category-based options
        this.updateInstrumentSelector(node);

        // Update note field
        const noteInput = document.getElementById('node-note');
        if (noteInput) {
            noteInput.value = node.properties.note || '';
        }

        // Render schema-based properties
        this.renderSchemaProperties(node);

        // Update effects panel
        this.updateEffectsPanel(node);
    }

    updateInstrumentSelector(node) {
        const instrumentSelect = document.getElementById('node-instrument');
        if (!instrumentSelect) return;

        // Clear existing options
        instrumentSelect.innerHTML = '';

        // Get the node category
        const category = this.getNodeCategory(node);

        const menuData = this.manager.menuData || (window.menuLoader && window.menuLoader.menuData);

        // Check if menu data is available, if not, use defaults
        if (!menuData) {
            console.log('Menu data not available, using defaults');
            this.addInstrumentsWithGroupsFallback(instrumentSelect, category, node.instrument);
            return;
        }

        // Try to find the menu ID dynamically based on node type
        let menuId = null;

        // Search through menus to find one containing a group for this node type
        for (const menu of menuData.menus) {
            const hasGroup = menu.groups.some(group => group.nodeType === node.type);
            if (hasGroup) {
                menuId = menu.id;
                break;
            }
        }

        if (menuId) {
            this.addInstrumentsWithGroups(instrumentSelect, menuId, node.instrument, node.type);
        } else {
            // Fallback mappings if exact node type match not found in groups
            if (category === 'source') {
                this.addInstrumentsWithGroups(instrumentSelect, 'instruments', node.instrument, node.type);
            } else if (category === 'effect') {
                this.addInstrumentsWithGroups(instrumentSelect, 'effects', node.instrument, node.type);
            } else if (category === 'structural') {
                this.addInstrumentsWithGroups(instrumentSelect, 'combinators', node.instrument, node.type);
            } else if (category === 'utility') {
                this.addInstrumentsWithGroups(instrumentSelect, 'utility', node.instrument, node.type);
            } else if (category === 'pattern') {
                this.addInstrumentsWithGroups(instrumentSelect, 'pattern', node.instrument, node.type);
            } else {
                this.addInstrumentsWithGroupsFallback(instrumentSelect, category, node.instrument);
            }
        }
    }

    addSidePanelListeners() {
        const instrumentSelect = document.getElementById('node-instrument');
        if (instrumentSelect) {
            instrumentSelect.addEventListener('change', (e) => {
                if (!this.selectedNode) return;

                const newInstrument = e.target.value;
                this.selectedNode.instrument = newInstrument;

                // Also update the specific property used for pattern generation
                const category = this.getNodeCategory(this.selectedNode);
                if (this.selectedNode.type === 'DrumSymbol') {
                    this.selectedNode.properties.strudelProperties.symbol = newInstrument;
                } else if (this.selectedNode.type === 'Instrument') {
                    this.selectedNode.properties.strudelProperties.sound = newInstrument;
                } else if (category === 'effect') {
                    this.selectedNode.properties.strudelProperties.type = newInstrument;
                }
                // For other node types, `node.instrument` is used as a fallback by the pattern generator.

                // Update the node's visual display and the main Strudel output
                this.updateNodeDisplay(this.selectedNode);
                this.manager.updateStrudelOutput();
            });
        }

        // Listeners for other static side-panel controls can be added here.
    }

    addInstrumentsWithGroups(selectElement, menuType, currentInstrument, nodeType = null) {
        const menuData = this.manager.menuData || (window.menuLoader && window.menuLoader.menuData);

        // Try to get instruments from the menu loader's data
        if (menuData) {
            // Find the menu that corresponds to this panel type
            const menu = menuData.menus.find(m => m.id === menuType);
            if (menu) {
                console.log('Found menu:', menu);
                let foundCurrent = false;

                // Filter groups by nodeType if specified
                const filteredGroups = nodeType ? menu.groups.filter(group => group.nodeType === nodeType) : menu.groups;

                // Create optgroups for each filtered group in the menu
                filteredGroups.forEach(group => {
                    const optgroup = document.createElement('optgroup');
                    optgroup.label = group.label;
                    optgroup.dataset.groupId = group.id;
                    optgroup.dataset.nodeType = group.nodeType;

                    // Add items to this optgroup
                    group.items.forEach(item => {
                        const option = document.createElement('option');

                        if (typeof item === 'string') {
                            option.value = item;
                            option.textContent = this.formatInstrumentLabel(item);
                        } else if (typeof item === 'object' && item.id) {
                            option.value = item.id;
                            option.textContent = item.label || this.formatInstrumentLabel(item.id);
                        }

                        // Check if this is the current instrument
                        if (currentInstrument && option.value.toLowerCase() === currentInstrument.toLowerCase()) {
                            option.selected = true;
                            foundCurrent = true;
                        }

                        optgroup.appendChild(option);
                    });

                    // Only add optgroup if it has options
                    if (optgroup.children.length > 0) {
                        selectElement.appendChild(optgroup);
                    }
                });

                // If current instrument not found in groups, add as custom option
                if (currentInstrument && !foundCurrent) {
                    const customOption = document.createElement('option');
                    customOption.value = currentInstrument;
                    customOption.textContent = currentInstrument;
                    customOption.selected = true;
                    selectElement.appendChild(customOption);
                }

                console.log('Successfully populated dropdown with optgroups');
                return;
            } else {
                console.log('Menu not found for type:', menuType);
            }
        }

        // If menu data is not available, try to load it first
        if (window.menuLoader && !window.menuLoader.menuData) {
            console.log('Menu data not loaded yet, attempting to load...');
            window.menuLoader.loadMenuData().then(() => {
                // Retry after loading
                this.addInstrumentsWithGroups(selectElement, menuType, currentInstrument);
            }).catch(error => {
                console.error('Failed to load menu data:', error);
                this.addInstrumentsWithGroupsFallback(selectElement, menuType, currentInstrument);
            });
            return;
        }

        // Debug: Log if menu data is not available
        console.log('Menu data not available or menu not found for type:', menuType);
        console.log('window.menuLoader:', window.menuLoader);
        console.log('window.menuLoader.menuData:', window.menuLoader?.menuData);

        // Fallback to DOM extraction
        this.addInstrumentsWithGroupsFallback(selectElement, menuType, currentInstrument);
    }

    addInstrumentsWithGroupsFallback(selectElement, menuType, currentInstrument) {

        // Fallback: extract from DOM if menu data not available
        const instrumentPanel = document.querySelector('.instrument-panel');
        if (instrumentPanel) {
            // Group instruments by their group headers
            const groups = instrumentPanel.querySelectorAll('.instrument-group');
            let foundCurrent = false;

            groups.forEach(group => {
                const groupHeader = group.querySelector('.instrument-group-header');
                const groupName = groupHeader ? groupHeader.textContent.trim() : 'Instruments';

                const optgroup = document.createElement('optgroup');
                optgroup.label = groupName;

                const instruments = group.querySelectorAll('.instrument-item');
                instruments.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.getAttribute('data-instrument') || item.getAttribute('data-strudel') || item.textContent.trim();
                    option.textContent = item.textContent.trim();

                    // Check if this is the current instrument
                    if (currentInstrument && option.value.toLowerCase() === currentInstrument.toLowerCase()) {
                        option.selected = true;
                        foundCurrent = true;
                    }

                    optgroup.appendChild(option);
                });

                // Only add optgroup if it has options
                if (optgroup.children.length > 0) {
                    selectElement.appendChild(optgroup);
                }
            });

            // If current instrument not found in groups, add as custom option
            if (currentInstrument && !foundCurrent) {
                const customOption = document.createElement('option');
                customOption.value = currentInstrument;
                customOption.textContent = currentInstrument;
                customOption.selected = true;
                selectElement.appendChild(customOption);
            }

            return;
        }

        // Final fallback: use defaults without groups
        const defaultOptions = ['sine', 'square', 'sawtooth', 'triangle', 'piano', 'violin'];
        defaultOptions.forEach(optionText => {
            const option = document.createElement('option');
            option.value = optionText;
            option.textContent = optionText;
            if (currentInstrument && option.value.toLowerCase() === currentInstrument.toLowerCase()) {
                option.selected = true;
            }
            selectElement.appendChild(option);
        });

        // If current instrument not found, add as custom option
        if (currentInstrument && !selectElement.querySelector(`option[value="${currentInstrument}"]`)) {
            const customOption = document.createElement('option');
            customOption.value = currentInstrument;
            customOption.textContent = currentInstrument;
            customOption.selected = true;
            selectElement.appendChild(customOption);
        }
    }

    formatInstrumentLabel(instrumentId) {
        // Convert instrument IDs to readable labels (same as menuLoader.js)
        return instrumentId
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    getInstrumentsFromPanel(panelType) {
        // Get instruments from the JSON structure that builds the menus
        const instruments = [];

        // Try to get instruments from the menu loader's data
        if (window.menuLoader && window.menuLoader.menuData) {
            const menuData = window.menuLoader.menuData;

            // Find the menu that corresponds to this panel type
            const menu = menuData.menus.find(m => m.id === panelType);
            if (menu) {
                menu.groups.forEach(group => {
                    group.items.forEach(item => {
                        if (typeof item === 'string') {
                            instruments.push(item);
                        } else if (typeof item === 'object' && item.id) {
                            instruments.push(item.id);
                        }
                    });
                });
            }
        }

        // If no instruments found from menu data, try to extract from DOM
        if (instruments.length === 0) {
            const instrumentPanel = document.querySelector('.instrument-panel');
            if (instrumentPanel) {
                // Get all instrument items and extract their data-instrument attribute
                const instrumentItems = instrumentPanel.querySelectorAll('.instrument-item');
                instrumentItems.forEach(item => {
                    const instrumentId = item.getAttribute('data-instrument');
                    if (instrumentId) {
                        instruments.push(instrumentId);
                    }
                });
            }
        }

        // If still no instruments found, use defaults
        if (instruments.length === 0) {
            switch (panelType) {
                case 'instruments':
                    return ['sine', 'square', 'sawtooth', 'triangle', 'piano', 'violin', 'guitar', 'flute'];
                case 'effects':
                    return ['lpf', 'hpf', 'bpf', 'delay', 'reverb', 'distort', 'pan', 'gain'];
                case 'patterns':
                    return ['s', 'note', 'n', 'chord', 'scale'];
                case 'utility':
                    return ['stack', 'cat', 'seq', 'struct', 'mask', 'euclidean'];
                default:
                    return ['sine', 'square', 'sawtooth', 'triangle'];
            }
        }

        // Remove duplicates and return
        return [...new Set(instruments)];
    }

    getCategoryInstruments(category) {
        // Get instruments from the schema based on category
        const instruments = [];

        if (this.manager.nodeSchema?.nodes) {
            Object.entries(this.manager.nodeSchema.nodes).forEach(([nodeId, nodeDef]) => {
                if (nodeDef.category === category) {
                    instruments.push(nodeId);
                }
            });
        }

        // Add some default instruments if none found
        if (instruments.length === 0) {
            switch (category) {
                case 'instruments':
                    return ['sine', 'square', 'sawtooth', 'triangle', 'piano', 'violin', 'guitar', 'flute'];
                case 'effects':
                    return ['lpf', 'hpf', 'bpf', 'delay', 'reverb', 'distort', 'pan', 'gain'];
                case 'pattern':
                    return ['s', 'note', 'n', 'chord', 'scale'];
                case 'utility':
                    return ['stack', 'cat', 'seq', 'struct', 'mask', 'euclidean'];
                default:
                    return ['sine', 'square', 'sawtooth', 'triangle'];
            }
        }

        return instruments;
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

    // Schema-based property rendering methods
    renderSchemaProperties(node) {
        const schemaContainer = document.getElementById('schema-properties-container');
        if (!schemaContainer) return;

        // Clear existing schema properties
        schemaContainer.innerHTML = '';

        // Get properties from all schema sources
        const properties = this.getCombinedProperties(node);

        if (Object.keys(properties).length === 0) {
            // Show a message if no specific properties
            const message = document.createElement('div');
            message.className = 'no-properties-message';
            message.innerHTML = '<p>This node type has no configurable properties.</p>';
            schemaContainer.appendChild(message);
            return;
        }

        const propsSection = document.createElement('div');
        propsSection.className = 'schema-properties-section';
        propsSection.innerHTML = '<h4>Node Properties</h4>';

        Object.entries(properties).forEach(([propName, propDef]) => {
            const control = this.createPropertyControl(propName, propDef, node.properties.strudelProperties[propName]);
            if (control) {
                propsSection.appendChild(control);
            }
        });

        schemaContainer.appendChild(propsSection);
    }

    getCombinedProperties(node) {
        const properties = {};

        // Helper to extract properties from a schema definition
        const extractProps = (def) => {
            if (!def) return;
            if (def.properties) {
                Object.assign(properties, def.properties);
            }
            if (def.sections) {
                def.sections.forEach(section => {
                    if (section.properties) {
                        Object.assign(properties, section.properties);
                    }
                });
            }
        };

        // Get properties from node schema
        if (this.manager.nodeSchema?.nodes?.[node.type]) {
            extractProps(this.manager.nodeSchema.nodes[node.type]);
        }

        // Get properties from property schema
        if (this.manager.propertySchema?.nodes?.[node.type]) {
            extractProps(this.manager.propertySchema.nodes[node.type]);
        }

        // Also check transformNodes in propertySchema
        if (this.manager.propertySchema?.transformNodes?.[node.type]) {
            extractProps(this.manager.propertySchema.transformNodes[node.type]);
        }

        // Get properties from control nodes schema
        if (this.isControlNode(node) && this.manager.controlNodesSchema?.controlNodes?.[node.type]) {
            extractProps(this.manager.controlNodesSchema.controlNodes[node.type]);
        }

        // Get properties from pattern combinators schema
        if (this.manager.patternCombinatorsSchema?.combinators?.[node.type]) {
            extractProps(this.manager.patternCombinatorsSchema.combinators[node.type]);
        }

        // Get properties from pattern functions schema
        if (this.manager.patternFunctionsSchema?.constructors?.[node.type]) {
            extractProps(this.manager.patternFunctionsSchema.constructors[node.type]);
        }

        return properties;
    }

    createPropertyControl(propName, propDef, currentValue) {
        const container = document.createElement('div');
        container.className = 'property-control';

        const label = document.createElement('label');
        label.textContent = propDef.title || propName;
        label.title = propDef.description || '';

        let control;

        switch (propDef.type) {
            case 'number':
                control = this.createNumberControl(propName, propDef, currentValue);
                break;
            case 'string':
                control = this.createStringControl(propName, propDef, currentValue);
                break;
            case 'boolean':
                control = this.createBooleanControl(propName, propDef, currentValue);
                break;
            case 'enum':
                control = this.createEnumControl(propName, propDef, currentValue);
                break;
            case 'childContainer':
                control = this.createChildContainerControl(propName, propDef, currentValue);
                break;
            case 'transformFunction':
                control = this.createTransformFunctionControl(propName, propDef, currentValue);
                break;
            default:
                return null;
        }

        container.appendChild(label);
        container.appendChild(control);

        // Add description if available
        if (propDef.description) {
            const desc = document.createElement('div');
            desc.className = 'property-description';
            desc.textContent = propDef.description;
            container.appendChild(desc);
        }

        return container;
    }

    createNumberControl(propName, propDef, currentValue) {
        const input = document.createElement('input');
        input.type = 'range';
        input.min = propDef.min || 0;
        input.max = propDef.max || 100;
        input.step = propDef.step || 1;
        input.value = currentValue !== undefined ? currentValue : (propDef.default || propDef.min || 0);
        input.className = 'property-slider';

        const valueDisplay = document.createElement('span');
        valueDisplay.className = 'property-value-display';
        valueDisplay.textContent = input.value;

        input.addEventListener('input', (e) => {
            valueDisplay.textContent = e.target.value;
            // We need to get the node from context - will be handled in updateSidePanel
        });

        const wrapper = document.createElement('div');
        wrapper.className = 'number-control-wrapper';
        wrapper.appendChild(input);
        wrapper.appendChild(valueDisplay);

        return wrapper;
    }

    createStringControl(propName, propDef, currentValue) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentValue !== undefined ? currentValue : (propDef.default || '');
        input.className = 'property-text';
        input.placeholder = propDef.placeholder || '';

        input.addEventListener('input', (e) => {
            // We need to get the node from context - will be handled in updateSidePanel
        });

        return input;
    }

    createBooleanControl(propName, propDef, currentValue) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = currentValue !== undefined ? currentValue : (propDef.default || false);
        checkbox.className = 'property-checkbox';

        checkbox.addEventListener('change', (e) => {
            // We need to get the node from context - will be handled in updateSidePanel
        });

        return checkbox;
    }

    createEnumControl(propName, propDef, currentValue) {
        const select = document.createElement('select');
        select.className = 'property-select';

        propDef.options.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.label || option.value;
            if (option.value === currentValue) {
                optionEl.selected = true;
            }
            select.appendChild(optionEl);
        });

        select.addEventListener('change', (e) => {
            // We need to get the node from context - will be handled in updateSidePanel
        });

        return select;
    }

    createChildContainerControl(propName, propDef, currentValue) {
        const container = document.createElement('div');
        container.className = 'child-container-control';

        const addButton = document.createElement('button');
        addButton.className = 'add-child-btn';
        addButton.innerHTML = '<i class="fas fa-plus"></i> Add Child';

        const childList = document.createElement('div');
        childList.className = 'child-list';

        // If we have children, render them
        if (currentValue && Array.isArray(currentValue)) {
            currentValue.forEach((child, index) => {
                const childItem = this.createChildItem(child, index);
                childList.appendChild(childItem);
            });
        }

        addButton.addEventListener('click', () => {
            // We need to get the node from context - will be handled in updateSidePanel
        });

        container.appendChild(addButton);
        container.appendChild(childList);

        return container;
    }

    createTransformFunctionControl(propName, propDef, currentValue) {
        const container = document.createElement('div');
        container.className = 'transform-function-control';

        const select = document.createElement('select');
        select.className = 'transform-select';

        // Get available transform functions
        const transforms = this.getAvailableTransforms();
        transforms.forEach(transform => {
            const option = document.createElement('option');
            option.value = transform.value;
            option.textContent = transform.label;
            if (transform.value === currentValue) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        select.addEventListener('change', (e) => {
            // We need to get the node from context - will be handled in updateSidePanel
        });

        container.appendChild(select);

        return container;
    }

    getAvailableTransforms() {
        return [
            { value: 'jux', label: 'Juxtapose (Stereo Split)' },
            { value: 'rev', label: 'Reverse' },
            { value: 'palindrome', label: 'Palindrome' },
            { value: 'shuffle', label: 'Shuffle' },
            { value: 'scramble', label: 'Scramble' },
            { value: 'iter', label: 'Rotate' },
            { value: 'segment', label: 'Segment' }
        ];
    }

    createChildItem(child, index) {
        const item = document.createElement('div');
        item.className = 'child-item';

        const label = document.createElement('span');
        label.className = 'child-label';
        label.textContent = `${child.type}: ${child.instrument || child.properties?.note || 'Child'}`;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-child-btn';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';

        removeBtn.addEventListener('click', () => {
            // We need to get the node from context - will be handled in updateSidePanel
        });

        item.appendChild(label);
        item.appendChild(removeBtn);

        return item;
    }

    updateNodeProperty(nodeId, propName, value) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) return;

        if (!node.properties.strudelProperties) {
            node.properties.strudelProperties = {};
        }

        node.properties.strudelProperties[propName] = value;

        // Update the node display
        this.updateNodeDisplay(node);

        // Update strudel output
        this.manager.updateStrudelOutput();
    }

    addChildToContainer(nodeId, propName) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) return;

        if (!node.properties.strudelProperties) {
            node.properties.strudelProperties = {};
        }

        if (!node.properties.strudelProperties[propName]) {
            node.properties.strudelProperties[propName] = [];
        }

        // Create a new child node
        const childNode = this.createNode('Instrument', 'bd', node.x + 50, node.y + 50);
        node.properties.strudelProperties[propName].push(childNode);

        // Update display
        this.updateNodeDisplay(node);
        this.renderSchemaProperties(node);
        this.manager.updateStrudelOutput();
    }

    removeChildFromContainer(nodeId, propName, index) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node || !node.properties.strudelProperties?.[propName]) return;

        node.properties.strudelProperties[propName].splice(index, 1);

        // Update display
        this.updateNodeDisplay(node);
        this.renderSchemaProperties(node);
        this.manager.updateStrudelOutput();
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
        const effects = node.properties.effects || {};
        const strudelProps = node.properties.strudelProperties || {};

        if (Object.keys(effects).length === 0 && Object.keys(strudelProps).length === 0) {
            return '';
        }

        // Get property definitions to check for ranges
        const propDefs = this.getCombinedProperties(node);

        let effectsHTML = '<div class="node-effects">';

        // Show effects from the effects object
        Object.entries(effects).forEach(([effectType, value]) => {
            effectsHTML += `<span class="effect-tag">${effectType}: ${value}</span>`;
        });

        // Show effects from strudelProperties
        Object.entries(strudelProps).forEach(([propName, value]) => {
            if (typeof value === 'number' || typeof value === 'string') {
                let displayValue = value;

                // Check for range info
                const propDef = propDefs[propName];
                if (propDef && propDef.type === 'number' && propDef.min !== undefined && propDef.max !== undefined) {
                    displayValue = `${value} <span style="opacity:0.7; font-size:0.8em;">range(${propDef.min},${propDef.max})</span>`;
                }

                effectsHTML += `<span class="effect-tag">${propName}: ${displayValue}</span>`;
            }
        });

        effectsHTML += '</div>';
        return effectsHTML;
    }

    extractDefaultsFromDefinition(def) {
        const defaults = {};
        if (!def) return defaults;

        const processProperties = (properties) => {
            Object.keys(properties).forEach(propName => {
                const propDef = properties[propName];
                if (propDef.default !== undefined) {
                    defaults[propName] = propDef.default;
                } else if (propDef.type === 'number') {
                    defaults[propName] = propDef.min || 0;
                } else if (propDef.type === 'string') {
                    defaults[propName] = propDef.options?.[0] || '';
                } else if (propDef.type === 'boolean') {
                    defaults[propName] = false;
                }
            });
        };

        if (def.properties) {
            processProperties(def.properties);
        }

        if (def.sections) {
            def.sections.forEach(section => {
                if (section.properties) {
                    processProperties(section.properties);
                }
            });
        }

        return defaults;
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

    getDefaultProperties(type) {
        let def = this.manager.propertySchema?.nodes?.[type];
        if (!def) {
            def = this.manager.propertySchema?.transformNodes?.[type];
        }
        return this.extractDefaultsFromDefinition(def);
    }

    getDefaultControlNodeProperties(type) {
        const def = this.manager.controlNodesSchema?.controlNodes?.[type];
        return this.extractDefaultsFromDefinition(def);
    }

    getDefaultCombinatorProperties(type) {
        const def = this.manager.patternCombinatorsSchema?.combinators?.[type];
        return this.extractDefaultsFromDefinition(def);
    }

    getDefaultPatternFunctionProperties(type) {
        const def = this.manager.patternFunctionsSchema?.constructors?.[type];
        return this.extractDefaultsFromDefinition(def);
    }

    getDefaultNodeSchemaProperties(type) {
        const def = this.manager.nodeSchema?.nodes?.[type];
        return this.extractDefaultsFromDefinition(def);
    }
}
