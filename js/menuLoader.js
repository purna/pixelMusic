// Dynamic Menu Loader for Instruments
class MenuLoader {
    constructor() {
        this.menuData = null;
        this.currentCategory = null;
    }

    async loadMenuData() {
        try {
            const response = await fetch('nodes/strudel-node-instruments.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.menuData = await response.json();
            return this.menuData;
        } catch (error) {
            console.error('Failed to load strudel-node-instruments.json:', error);
            console.warn('Using fallback menu data');
            this.menuData = this.getFallbackMenuData();
            return this.menuData;
        }
    }

    getFallbackMenuData() {
        return {
            menus: [
                {
                    id: 'instruments',
                    label: 'Instruments',
                    groups: [
                        {
                            id: 'drums',
                            label: 'Drum Kit',
                            nodeType: 'DrumSymbol',
                            color: '#00d9ff',
                            items: [
                                { id: 'bd', label: 'Bass Drum', value: 'bd' },
                                { id: 'sd', label: 'Snare Drum', value: 'sd' },
                                { id: 'hh', label: 'Hi-Hat', value: 'hh' },
                                { id: 'oh', label: 'Open Hat', value: 'oh' },
                                { id: 'rim', label: 'Rimshot', value: 'rim' }
                            ]
                        },
                        {
                            id: 'percussion',
                            label: 'Percussion',
                            nodeType: 'Instrument',
                            color: '#00d9ff',
                            items: [
                                'clap', 'conga', 'bongo', 'cowbell', 'shaker_large', 'shaker_small'
                            ]
                        }
                    ]
                },
                {
                    id: 'patternFunctions',
                    label: 'Pattern Functions',
                    groups: [
                        {
                            id: 'soundFunctions',
                            label: 'Sound Functions',
                            nodeType: 's',
                            color: '#8b5cf6',
                            items: [
                                { id: 'bd', label: 'Bass Drum', value: 'bd' },
                                { id: 'sd', label: 'Snare Drum', value: 'sd' },
                                { id: 'hh', label: 'Hi-Hat', value: 'hh' },
                                { id: 'oh', label: 'Open Hat', value: 'oh' },
                                { id: 'rim', label: 'Rimshot', value: 'rim' },
                                { id: 'custom', label: 'Custom Sound', value: 'custom' }
                            ]
                        },
                        {
                            id: 'noteFunctions',
                            label: 'Note Functions',
                            nodeType: 'note',
                            color: '#00ff41',
                            items: [
                                { id: 'c4', label: 'C4', value: 'c4' },
                                { id: 'd4', label: 'D4', value: 'd4' },
                                { id: 'e4', label: 'E4', value: 'e4' },
                                { id: 'f4', label: 'F4', value: 'f4' },
                                { id: 'g4', label: 'G4', value: 'g4' },
                                { id: 'a4', label: 'A4', value: 'a4' },
                                { id: 'b4', label: 'B4', value: 'b4' },
                                { id: 'custom_note', label: 'Custom Note', value: 'custom' }
                            ]
                        },
                        {
                            id: 'bankFunctions',
                            label: 'Bank Selection',
                            nodeType: 'bank',
                            color: '#ff006e',
                            items: [
                                { id: 'tr909', label: 'Roland TR-909', value: 'tr909' },
                                { id: 'tr808', label: 'Roland TR-808', value: 'tr808' },
                                { id: 'tr707', label: 'Roland TR-707', value: 'tr707' },
                                { id: 'linn', label: 'Akai Linn', value: 'linn' }
                            ]
                        }
                    ]
                },
                {
                    id: 'combinators',
                    label: 'Combinators',
                    groups: [
                        {
                            id: 'structural',
                            label: 'Structural Combinators',
                            nodeType: 'stack',
                            color: '#8b5cf6',
                            items: [
                                { id: 'stack', label: 'Stack (Parallel)', value: 'stack' },
                                { id: 'cat', label: 'Cat (Sequence)', value: 'cat' },
                                { id: 'group', label: 'Group', value: 'group' }
                            ]
                        },
                        {
                            id: 'rhythmic',
                            label: 'Rhythmic Combinators',
                            nodeType: 'struct',
                            color: '#ff006e',
                            items: [
                                { id: 'struct', label: 'Structure', value: 'struct' }
                            ]
                        },
                        {
                            id: 'temporal',
                            label: 'Temporal Combinators',
                            nodeType: 'slow',
                            color: '#00d9ff',
                            items: [
                                { id: 'slow', label: 'Slow Down', value: 'slow' },
                                { id: 'fast', label: 'Speed Up', value: 'fast' },
                                { id: 'off', label: 'Offset', value: 'off' }
                            ]
                        },
                        {
                            id: 'pitch',
                            label: 'Pitch Combinators',
                            nodeType: 'add',
                            color: '#9400d3',
                            items: [
                                { id: 'add', label: 'Add Value', value: 'add' },
                                { id: 'scale', label: 'Musical Scale', value: 'scale' }
                            ]
                        },
                        {
                            id: 'conditional',
                            label: 'Conditional Combinators',
                            nodeType: 'every',
                            color: '#00ff41',
                            items: [
                                { id: 'every', label: 'Every N Cycles', value: 'every' },
                                { id: 'whenmod', label: 'When Modulo', value: 'whenmod' }
                            ]
                        }
                    ]
                }
            ]
        };
    }

    async initialize() {
        const menuData = await this.loadMenuData();
        if (!menuData) return;

        // Don't create horizontal tabs anymore - using sidebar instead
        this.loadCategoryContent('instruments'); // Default category
        this.setupEventListeners();
    }



    loadCategoryContent(categoryId) {
        const contentContainer = document.getElementById('instrument-content');
        if (!contentContainer || !this.menuData) return;

        // Find the menu by ID
        const menu = this.menuData.menus.find(m => m.id === categoryId);
        if (!menu) return;

        // Clear existing content
        contentContainer.innerHTML = '';

        // Create content for each group in the menu
        menu.groups.forEach(group => {
            const groupElement = this.createGroupElement(group);
            contentContainer.appendChild(groupElement);
        });

        this.currentCategory = categoryId;
    }

    createGroupElement(group) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'instrument-group';
        groupDiv.dataset.groupId = group.id;
        groupDiv.dataset.nodeType = group.nodeType;
        groupDiv.dataset.color = group.color || '#00d9ff';

        // Create group header with minimize/maximize toggle
        const header = document.createElement('div');
        header.className = 'instrument-group-header';
        header.innerHTML = `
            <i class="fas ${this.getGroupIcon(group.nodeType)} instrument-icon" style="color: ${group.color || '#00d9ff'}"></i>
            <span style="color: ${group.color || '#00d9ff'}">${group.label}</span>
            <div class="group-toggle">
                <i class="fas fa-minus minimize-icon"></i>
                <i class="fas fa-plus maximize-icon" style="display: none;"></i>
            </div>
        `;

        // Create instruments container
        const instrumentsContainer = document.createElement('div');
        instrumentsContainer.className = 'group-instruments';

        // Add instruments
        group.items.forEach(item => {
            const instrumentElement = this.createInstrumentElement(item, group.nodeType);
            instrumentsContainer.appendChild(instrumentElement);
        });

        groupDiv.appendChild(header);
        groupDiv.appendChild(instrumentsContainer);

        // Expand by default
        groupDiv.classList.add('expanded');
        
        // Set initial icon state (expanded = show minus icon)
        const minimizeIcon = header.querySelector('.minimize-icon');
        const maximizeIcon = header.querySelector('.maximize-icon');
        minimizeIcon.style.display = 'inline';
        maximizeIcon.style.display = 'none';

        return groupDiv;
    }

    createInstrumentElement(item, nodeType) {
        const instrumentDiv = document.createElement('div');
        instrumentDiv.className = 'instrument-item';
        instrumentDiv.draggable = true;

        // Handle different item formats
        let instrumentId, label, strudelValue;
        
        if (typeof item === 'string') {
            // Simple string item
            instrumentId = item;
            label = this.formatLabel(item);
            strudelValue = item;
        } else if (typeof item === 'object' && item.id) {
            // Object with id and label
            instrumentId = item.id;
            label = item.label;
            strudelValue = item.value || item.id;
        } else {
            // Skip invalid items
            return document.createDocumentFragment();
        }

        instrumentDiv.dataset.instrument = instrumentId;
        instrumentDiv.dataset.strudel = strudelValue;
        instrumentDiv.dataset.nodeType = nodeType;

        // Get color for this node type
        const groupElement = instrumentDiv.closest('.instrument-group');
        const nodeTypeColor = groupElement?.dataset.color || '#00d9ff';
        
        instrumentDiv.innerHTML = `
            <i class="fas ${this.getInstrumentIcon(instrumentId)} instrument-icon" style="color: ${nodeTypeColor}"></i>
            <span style="color: ${nodeTypeColor}">${label}</span>
        `;

        return instrumentDiv;
    }

    formatLabel(instrumentId) {
        // Convert instrument IDs to readable labels
        return instrumentId
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    getGroupIcon(nodeType) {
        const iconMap = {
            'DrumSymbol': 'fa-drum',
            'Instrument': 'fa-music',
            'Repeater': 'fa-redo',
            'Group': 'fa-layer-group',
            'Chance': 'fa-dice',
            'Effect': 'fa-sliders-h',
            'Generator': 'fa-magic',
            'Transform': 'fa-exchange-alt',
            'Output': 'fa-volume-up',
            's': 'fa-wave-square',
            'note': 'fa-music',
            'bank': 'fa-database',
            'dec': 'fa-hourglass-half',
            'stack': 'fa-layer-group',
            'struct': 'fa-th',
            'slow': 'fa-turtle',
            'fast': 'fa-bolt',
            'every': 'fa-calendar',
            'whenmod': 'fa-calculator',
            'group': 'fa-object-group',
            'scale': 'fa-music',
            'off': 'fa-clock',
            'add': 'fa-plus'
        };
        return iconMap[nodeType] || 'fa-music';
    }

    getInstrumentIcon(instrumentId) {
        // Map instrument IDs to appropriate icons
        const iconMap = {
            // Drums
            'bd': 'fa-drum',
            'sd': 'fa-drum-steelpan',
            'rim': 'fa-drum-steelpan',
            'hh': 'fa-hat-cowboy',
            'oh': 'fa-hat-cowboy',
            'lt': 'fa-drum',
            'mt': 'fa-drum',
            'ht': 'fa-drum',
            'rd': 'fa-gong',
            'cr': 'fa-gong',
            
            // Percussion
            'agogo': 'fa-drum',
            'anvil': 'fa-hammer',
            'bongo': 'fa-drum-steelpan',
            'cabasa': 'fa-shaker',
            'cajon': 'fa-drum',
            'clave': 'fa-drum',
            'clap': 'fa-hand-paper',
            'conga': 'fa-drum',
            'cowbell': 'fa-bell',
            'darbuka': 'fa-drum',
            'flexatone': 'fa-drum',
            'guiro': 'fa-drum',
            'ratchet': 'fa-cog',
            'shaker_large': 'fa-shaker',
            'shaker_small': 'fa-shaker',
            'slapstick': 'fa-hand-rock',
            'tambourine': 'fa-music',
            'tambourine2': 'fa-music',
            'timpani': 'fa-drum',
            'timpani_roll': 'fa-drum',
            'vibraslap': 'fa-hand-paper',
            'woodblock': 'fa-drum',
            
            // Mallet & Tuned
            'balafon': 'fa-xylophone',
            'balafon_hard': 'fa-xylophone',
            'balafon_soft': 'fa-xylophone',
            'glockenspiel': 'fa-music',
            'kalimba': 'fa-music',
            'kalimba2': 'fa-music',
            'kalimba3': 'fa-music',
            'kalimba4': 'fa-music',
            'kalimba5': 'fa-music',
            'marimba': 'fa-music',
            'vibraphone': 'fa-music',
            'vibraphone_soft': 'fa-music',
            'vibraphone_bowed': 'fa-music',
            'xylophone_hard_ff': 'fa-xylophone',
            'xylophone_hard_pp': 'fa-xylophone',
            'xylophone_medium_ff': 'fa-xylophone',
            'xylophone_medium_pp': 'fa-xylophone',
            'xylophone_soft_ff': 'fa-xylophone',
            'xylophone_soft_pp': 'fa-xylophone',
            
            // Strings
            'folkharp': 'fa-music',
            'harp': 'fa-music',
            'psaltery_pluck': 'fa-music',
            'psaltery_bow': 'fa-music',
            'psaltery_spiccato': 'fa-music',
            'strumstick': 'fa-music',
            'wineglass': 'fa-wine-glass',
            'wineglass_slow': 'fa-wine-glass',
            
            // Winds
            'harmonica': 'fa-music',
            'harmonica_soft': 'fa-music',
            'harmonica_vib': 'fa-music',
            'ocarina': 'fa-music',
            'ocarina_small': 'fa-music',
            'ocarina_small_stacc': 'fa-music',
            'ocarina_vib': 'fa-music',
            'recorder_soprano': 'fa-music',
            'recorder_alto': 'fa-music',
            'recorder_tenor': 'fa-music',
            'recorder_bass': 'fa-music',
            'sax': 'fa-music',
            'sax_stacc': 'fa-music',
            'sax_vib': 'fa-music',
            'saxello': 'fa-music',
            'saxello_stacc': 'fa-music',
            'saxello_vib': 'fa-music',
            'trainwhistle': 'fa-music',
            
            // Keyboards
            'piano': 'fa-piano',
            'piano1': 'fa-piano',
            'steinway': 'fa-piano',
            'fmpiano': 'fa-piano',
            'kawai': 'fa-piano',
            'organ_4inch': 'fa-music',
            'organ_8inch': 'fa-music',
            'organ_full': 'fa-music',
            'pipeorgan_loud': 'fa-music',
            'pipeorgan_quiet': 'fa-music',
            'pipeorgan_loud_pedal': 'fa-music',
            'pipeorgan_quiet_pedal': 'fa-music',
            'super64': 'fa-piano',
            'super64_acc': 'fa-piano',
            'super64_vib': 'fa-piano',
            
            // Textures
            'casio': 'fa-wave-square',
            'clavisynth': 'fa-wave-square',
            'didgeridoo': 'fa-music',
            'east': 'fa-globe',
            'insect': 'fa-bug',
            'jazz': 'fa-music',
            'oceandrum': 'fa-water',
            'space': 'fa-rocket',
            'wind': 'fa-wind',
            'siren': 'fa-siren',
            'crow': 'fa-crow',
            
            // Synths
            'sine': 'fa-wave-sine',
            'square': 'fa-square',
            'sawtooth': 'fa-wave-square',
            'triangle': 'fa-play',
            'brown': 'fa-wave-square',
            'bytebeat': 'fa-wave-sine',
            'crackle': 'fa-bolt',
            
            // Effects
            'lpf': 'fa-filter',
            'hpf': 'fa-filter',
            'bpf': 'fa-filter',
            'lpq': 'fa-filter',
            'pan': 'fa-arrows-alt-h',
            'reverb': 'fa-mountain',
            'room': 'fa-cube',
            'delay': 'fa-clock',
            'delayfb': 'fa-redo',
            'delayt': 'fa-music',
            'distort': 'fa-fire',
            'crush': 'fa-compress',
            'shape': 'fa-wave-square',
            'vibrato': 'fa-wave-sine',
            'vibdepth': 'fa-arrows-alt-v',
            'tremolo': 'fa-wave-square',
            'tremdepth': 'fa-arrows-alt-v',
            'chop': 'fa-cut',
            'stutter': 'fa-redo',
            'slice': 'fa-scissors',
            
            // Utility
            'irand': 'fa-dice',
            'rand': 'fa-dice',
            'range': 'fa-arrows-alt-h',
            'rev': 'fa-undo',
            'palindrome': 'fa-refresh',
            'shuffle': 'fa-random',
            'jux': 'fa-columns',
            'gain': 'fa-volume-up',
            'mute': 'fa-volume-mute',
            'solo': 'fa-microphone'
        };

        return iconMap[instrumentId] || 'fa-music';
    }

    setupEventListeners() {
        // Category tab switching (horizontal tabs in panel)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-tab')) {
                const categoryId = e.target.dataset.category;
                this.switchCategory(categoryId);
            }
            
            // Sidebar category tab switching
            if (e.target.classList.contains('category-sidebar-tab') || e.target.closest('.category-sidebar-tab')) {
                const sidebarTab = e.target.classList.contains('category-sidebar-tab') ? e.target : e.target.closest('.category-sidebar-tab');
                const categoryId = sidebarTab.dataset.category;
                this.switchCategory(categoryId);
            }
            
            // Group expansion/collapse
            if (e.target.closest('.instrument-group-header')) {
                const groupHeader = e.target.closest('.instrument-group-header');
                const group = groupHeader.parentElement;
                const minimizeIcon = groupHeader.querySelector('.minimize-icon');
                const maximizeIcon = groupHeader.querySelector('.maximize-icon');
                
                group.classList.toggle('expanded');
                
                // Toggle icons
                if (group.classList.contains('expanded')) {
                    minimizeIcon.style.display = 'inline';
                    maximizeIcon.style.display = 'none';
                } else {
                    minimizeIcon.style.display = 'none';
                    maximizeIcon.style.display = 'inline';
                }
            }
            
            // Instrument click to create node
            if (e.target.classList.contains('instrument-item') || e.target.closest('.instrument-item')) {
                const instrumentItem = e.target.classList.contains('instrument-item') ? e.target : e.target.closest('.instrument-item');
                this.createNodeFromInstrument(instrumentItem);
            }
        });

        // Drag and drop handlers
        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('instrument-item')) {
                const instrument = e.target.dataset.instrument;
                const strudel = e.target.dataset.strudel;
                const nodeType = e.target.dataset.nodeType;
                
                e.dataTransfer.setData('application/json', JSON.stringify({
                    instrument: instrument,
                    strudel: strudel,
                    nodeType: nodeType
                }));
            }
        });
        
        // Handle drag over and drop on canvas
        const canvas = document.getElementById('canvas-content');
        if (canvas) {
            canvas.addEventListener('dragover', (e) => {
                e.preventDefault();
            });
            
            canvas.addEventListener('drop', (e) => {
                e.preventDefault();
                const data = e.dataTransfer.getData('application/json');
                if (data) {
                    const instrumentData = JSON.parse(data);
                    const rect = canvas.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    
                    if (window.nodeManager) {
                        window.nodeManager.createNode(
                            instrumentData.nodeType || 'instrument',
                            instrumentData.instrument,
                            x,
                            y
                        );
                    }
                }
            });
        }
    }
    
    createNodeFromInstrument(instrumentItem) {
        if (!window.nodeManager) {
            console.warn('NodeManager not available');
            return;
        }
        
        const instrument = instrumentItem.dataset.instrument;
        const nodeType = instrumentItem.dataset.nodeType || 'instrument';
        const strudel = instrumentItem.dataset.strudel || instrument;
        
        // Create node at random position
        const x = 100 + Math.random() * 400;
        const y = 100 + Math.random() * 300;
        
        const node = window.nodeManager.createNode(nodeType, strudel, x, y);
        
        // Show status message
        if (window.nodeManager.updateStatus) {
            window.nodeManager.updateStatus(`Created ${nodeType} node: ${instrument}`);
        }
        
        // Auto-select the new node
        setTimeout(() => {
            if (window.nodeManager.selectNode) {
                window.nodeManager.selectNode(node);
            }
        }, 100);
    }

    switchCategory(categoryId) {
        // Update active horizontal tab
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        const horizontalTab = document.querySelector(`[data-category="${categoryId}"]`);
        if (horizontalTab) {
            horizontalTab.classList.add('active');
        }

        // Update active sidebar tab
        document.querySelectorAll('.category-sidebar-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        const sidebarTab = document.querySelector(`.category-sidebar-tab[data-category="${categoryId}"]`);
        if (sidebarTab) {
            sidebarTab.classList.add('active');
        }

        // Update tools header
        const toolsHeader = document.querySelector('.tools-header');
        if (toolsHeader && this.menuData) {
            const menu = this.menuData.menus.find(m => m.id === categoryId);
            if (menu) {
                toolsHeader.textContent = menu.label;
            }
        }

        // Load new content
        this.loadCategoryContent(categoryId);
    }
}

// Initialize menu loader when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const menuLoader = new MenuLoader();
    await menuLoader.initialize();
});