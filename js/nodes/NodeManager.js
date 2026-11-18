/**
 * NodeManager.js
 * Main controller that orchestrates Canvas, Connections, Factory, and Audio.
 */
class NodeManager {
    constructor() {
        this.canvas = new NodeCanvas(this);
        this.connections = new ConnectionManager(this);
        this.factory = new NodeFactory(this);
        this.audio = new NodeAudio(this);

        this.propertySchema = null;
        this.nodeSchema = null;
        this.controlNodesSchema = null;
        this.patternCombinatorsSchema = null;
        this.patternFunctionsSchema = null;
        this.miniNotationSchema = null;
        this.instrumentList = [];

        // Initialize Strudel Pattern Generator
        this.patternGenerator = new StrudelPatternGenerator(this);

        this.init();
    }

    init() {
        console.log('Node Manager initializing...');
        this.schemasReady = this.loadSchemas();
        this.bindEvents();
        this.canvas.init();

        // Initialize hierarchical navigation state
        this.currentLevel = { level: 0, parentNode: null, nodes: [] };
        this.previousLevel = null;

        this.updateStatus('Node Editor Ready - Double-click nodes to edit children');
        this.factory.updateDeleteButtonState();
        this.updateBackButtonState();
        this.updateStrudelOutput();

        document.getElementById('initAudioBtn')?.addEventListener('click', async () => {
            await this.audio.initializeAudio();
        });
    }

    async loadSchemas() {
        try {
            const [propRes, nodeRes, controlRes, combinatorsRes, functionsRes, miniRes] = await Promise.all([
                fetch('nodes/strudel-node-properties.json'),
                fetch('nodes/strudel-node-schema.json'),
                fetch('nodes/strudel-control-nodes.json'),
                fetch('nodes/strudel-pattern-combinators.json'),
                fetch('nodes/strudel-pattern-functions.json'),
                fetch('nodes/strudel-mini-notation.json')
            ]);

            // Load each schema independently: one broken file must not take the
            // whole editor down (it used to silently disable every node type).
            this.propertySchema = await this.readSchema(propRes, 'strudel-node-properties.json');
            this.nodeSchema = this.foldNodeDefinitions(await this.readSchema(nodeRes, 'strudel-node-schema.json'));
            this.controlNodesSchema = await this.readSchema(controlRes, 'strudel-control-nodes.json');
            this.patternCombinatorsSchema = await this.readSchema(combinatorsRes, 'strudel-pattern-combinators.json');
            this.patternFunctionsSchema = await this.readSchema(functionsRes, 'strudel-pattern-functions.json');
            this.miniNotationSchema = await this.readSchema(miniRes, 'strudel-mini-notation.json');

            // Load instrument list
            const menuRes = await fetch('nodes/strudel-node-instruments.json');
            const menuData = await this.readSchema(menuRes, 'strudel-node-instruments.json');
            if (menuData) {
                this.menuData = menuData;
                this.extractInstrumentList(menuData);
            }

            // Initialize pattern generator with schemas
            this.patternGenerator.initSchemas({
                miniNotationSchema: this.miniNotationSchema,
                patternCombinatorsSchema: this.patternCombinatorsSchema,
                patternFunctionsSchema: this.patternFunctionsSchema,
                propertySchema: this.propertySchema,
                controlNodesSchema: this.controlNodesSchema,
                nodeSchema: this.nodeSchema
            });

            // Initialize the pattern generator (sets up input event listeners)
            this.patternGenerator.init();

            // Fail loudly when a schema entry cannot be turned into code.
            this.validateSchemas();
        } catch (error) {
            console.warn('Schema loading failed:', error);
        }
    }

    /** Node types the instrument palette can create. */
    collectPaletteNodeTypes() {
        const types = new Set();
        const groups = this.menuData?.menus || [];
        groups.forEach(menu => {
            (menu.groups || []).forEach(group => {
                if (group.nodeType) types.add(group.nodeType);
                (group.items || []).forEach(item => {
                    if (item && typeof item === 'object' && item.nodeType) types.add(item.nodeType);
                });
            });
        });
        return [...types];
    }

    /**
     * Reports schema problems once at boot instead of letting a half-described
     * node type fail silently when it is first used.
     */
    validateSchemas() {
        const codegen = this.patternGenerator?.codegen;
        if (!codegen) {
            console.error('Schema validation skipped: no code generator');
            return [];
        }

        this.schemaIssues = codegen.validate(this.collectPaletteNodeTypes());
        if (this.schemaIssues.length) {
            console.warn(`Schema validation found ${this.schemaIssues.length} issue(s):`);
            this.schemaIssues.forEach(issue => console.warn(`  - ${issue}`));
        } else {
            console.log(`Schemas validated: ${Object.keys(this.nodeSchema?.nodes || {}).length} node types, ${this.instrumentList.length} instruments`);
        }
        return this.schemaIssues;
    }

    /** Fetch + parse one schema file, reporting problems instead of throwing. */
    async readSchema(response, name) {
        if (!response || !response.ok) {
            console.error(`Schema ${name} could not be loaded (HTTP ${response && response.status})`);
            return null;
        }
        try {
            return await response.json();
        } catch (error) {
            console.error(`Schema ${name} is not valid JSON: ${error.message}`);
            return null;
        }
    }

    /**
     * strudel-node-schema.json has accumulated node definitions at the top level
     * next to the "nodes" map. Fold any definition-shaped entry into nodes so a
     * single misplaced brace cannot hide half the node library.
     */
    foldNodeDefinitions(schema) {
        return NodeCodegen.foldNodeDefinitions(schema);
    }

    /** Kept so older callers keep working; the rule lives in NodeCodegen. */
    legacyFoldNodeDefinitions(schema) {
        if (!schema || typeof schema !== 'object') return schema;

        const reserved = new Set([
            'schemaVersion', 'description', 'socketTypes', 'executionStages',
            'nodes', 'codegen', 'socketCompatibilityMatrix', 'validationRules'
        ]);
        schema.nodes = schema.nodes && typeof schema.nodes === 'object' ? schema.nodes : {};

        let folded = 0;
        Object.keys(schema).forEach(key => {
            if (reserved.has(key)) return;
            const value = schema[key];
            if (!value || typeof value !== 'object') return;
            if (!value.sockets && !value.properties && !value.label) return;
            if (!schema.nodes[key]) schema.nodes[key] = value;
            delete schema[key];
            folded += 1;
        });

        if (folded) {
            console.warn(`strudel-node-schema.json: recovered ${folded} node definition(s) from the top level`);
        }
        return schema;
    }

    extractInstrumentList(menuData) {
        const instruments = [];
        const signatureMap = new Map();
        menuData.menus.forEach(menu => {
            menu.groups.forEach(group => {
                // Build signature map if group defines signature and property
                if (group.signature && group.property) {
                    group.items.forEach(item => {
                        const itemName = typeof item === 'string' ? item : (item.value !== undefined ? item.value : item.id);
                        signatureMap.set(itemName, {
                            signature: group.signature,
                            property: group.property
                        });
                    });
                }
                // Collect instrument names for instrumentList
                group.items.forEach(item => {
                    const name = typeof item === 'string' ? item : (item.value !== undefined ? item.value : item.id);
                    instruments.push(name);
                });
            });
        });
        this.instrumentList = [...new Set(instruments)].sort();
        this.instrumentSignatureMap = signatureMap;
    }

    bindEvents() {
        // Global buttons
        document.getElementById('play-all-nodes')?.addEventListener('click', () => this.audio.playAllNodes());
        document.getElementById('stop-all-nodes')?.addEventListener('click', () => this.audio.stopAllNodes());
        document.getElementById('clear-nodes')?.addEventListener('click', () => this.clearAllNodes());
        document.getElementById('delete-selected-node')?.addEventListener('click', () => this.factory.deleteSelectedNode());
        document.getElementById('side-panel-close')?.addEventListener('click', () => this.factory.hideSidePanel());
        document.getElementById('back-to-parent')?.addEventListener('click', () => this.factory.exitNodeLevel());

        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && this.factory.selectedNode) {
                this.factory.deleteNode(this.factory.selectedNode.id);
            }
            if (e.key === 'Escape' && this.currentLevel.level > 0) {
                this.factory.exitNodeLevel();
            }
            if (e.key === ' ' && !e.repeat && this.canvas.panToolActive) {
                document.body.style.cursor = 'grab';
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === ' ') document.body.style.cursor = '';
        });

        // Connection deletion
        document.addEventListener('click', (e) => {
            if (e.target.closest('.connection-line') && e.shiftKey) {
                const connectionId = e.target.closest('.connection-line').dataset.connectionId;
                this.connections.removeConnection(connectionId);
            }
        });
    }

    updateStatus(message) {
        const statusElement = document.getElementById('status-message');
        if (statusElement) statusElement.textContent = message;
        console.log('Status:', message);
    }

    // Update the strudel-example-input with the pattern for the whole graph.
    updateStrudelOutput() {
        const strudelInput = document.getElementById('strudel-example-input');
        if (!strudelInput) return;

        if (this.factory.nodes.length === 0) {
            strudelInput.value = '';
            return;
        }

        try {
            strudelInput.value = this.buildPlayablePattern();
        } catch (error) {
            console.warn('Error updating Strudel output:', error);
            strudelInput.value = 'Error generating pattern';
        }
    }

    /**
     * Nodes that are not feeding another node. Playing starts from these
     * (an effect node is the end of a chain, its input is the instrument).
     */
    getTerminalNodes() {
        const connections = this.connections.connections || [];
        const feedsAnotherNode = new Set(
            connections
                .filter(conn => String(conn.targetPort || '').startsWith('input'))
                .map(conn => conn.sourceNodeId)
        );

        const terminals = this.factory.nodes.filter(node => !feedsAnotherNode.has(node.id));
        return terminals.length ? terminals : this.factory.nodes;
    }

    /**
     * Single source of truth for the Strudel code of the whole graph.
     * Several independent chains are played together with stack(...).
     */
    buildPlayablePattern() {
        const nodes = this.factory.nodes;
        if (!nodes.length || !this.patternGenerator) return '';

        const parts = [];
        const seen = new Set();

        this.getTerminalNodes().forEach(node => {
            let code = '';
            try {
                code = this.patternGenerator.generatePatternFromNode(node);
            } catch (error) {
                console.warn('Error generating pattern for node:', node, error);
                return;
            }
            const trimmed = (code || '').trim();
            if (!trimmed || seen.has(trimmed)) return;
            seen.add(trimmed);
            parts.push(trimmed);
        });

        if (!parts.length) return '';
        return parts.length === 1 ? parts[0] : `stack(${parts.join(', ')})`;
    }

    // Update back button state based on current level
    updateBackButtonState() {
        const backBtn = document.getElementById('back-to-parent');
        if (!backBtn) return;

        // Check if we're in a child level (level > 0)
        if (this.currentLevel && this.currentLevel.level > 0) {
            backBtn.disabled = false;
            backBtn.style.opacity = '1';
            backBtn.style.cursor = 'pointer';
            backBtn.title = `Back to Parent Level (Level ${this.currentLevel.level - 1}) - Press ESC`;
        } else {
            backBtn.disabled = true;
            backBtn.style.opacity = '0.5';
            backBtn.style.cursor = 'not-allowed';
            backBtn.title = 'Back to Parent Level (ESC) - Only available in child editing mode';
        }
    }

    // API Methods for external access
    createNode(type, instrument, x, y) {
        return this.factory.createNode(type, instrument, x, y);
    }

    playNode(id) {
        this.audio.playNode(id);
    }

    updateNodeDisplay(node) {
        this.factory.updateNodeDisplay(node);
    }

    createConnection(s, sp, t, tp) {
        this.connections.createConnection(s, sp, t, tp);
    }

    clearAllNodes() {
        this.factory.clearAllNodes();
        this.connections.clearAllConnections();
    }

    selectNode(node) {
        this.factory.selectNode(node);
    }


    addChildNode(parentNodeId, childType, childInstrument) {
        return this.factory.addChildNode(parentNodeId, childType, childInstrument);
    }

    // Getters for backward compatibility
    get nodes() { return this.factory.nodes; }
    get selectedNode() { return this.factory.selectedNode; }
    getInstrumentSignatureInfo(instrumentName) {
        return this.instrumentSignatureMap ? this.instrumentSignatureMap.get(instrumentName) : null;
    }

}

// Initialize global instance
if (!window.nodeManager) {
    window.nodeManager = new NodeManager();
}
