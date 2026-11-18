/**
 * projectManager.js
 * Project persistence for the Strudel node editor.
 *
 * - Save the current graph to a .json file
 * - Open a saved graph back into the canvas
 * - Export the generated Strudel code
 * - Autosave to localStorage so a refresh never loses work
 *
 * The graph format is intentionally plain data:
 * { format, version, savedAt, nodes: [...], connections: [...] }
 */

class ProjectManager {
    constructor(manager, options = {}) {
        this.manager = manager;
        this.format = 'pixelmusic-project';
        this.version = 1;
        this.autosaveKey = 'pixelmusic:autosave:v1';
        this.autosaveIntervalMs = options.autosaveIntervalMs ?? 5000;
        this.lastSnapshot = '';
        this.autosaveTimer = null;
        this.dom = typeof document !== 'undefined' && !!document.getElementById;

        if (this.dom) {
            this.bindUI();
            this.startAutosave();
        }
    }

    /* ------------------------------------------------------------------ *
     * Serialization
     * ------------------------------------------------------------------ */

    /**
     * Root nodes. While editing children, factory.nodes points at the child
     * array, so keep the root array captured by NodeFactory.enterNodeLevel().
     */
    getNodes() {
        const factory = this.manager?.factory;
        if (!factory) return [];
        const level = this.manager?.currentLevel;
        const inChildLevel = !!(level && level.level > 0);
        const nodes = inChildLevel ? (factory.rootNodes || factory.nodes) : factory.nodes;
        return Array.isArray(nodes) ? nodes : [];
    }

    serialize() {
        return {
            format: this.format,
            version: this.version,
            savedAt: new Date().toISOString(),
            nodes: this.getNodes().map(node => JSON.parse(JSON.stringify(node))),
            connections: (this.manager?.connections?.connections || []).map(conn => ({ ...conn }))
        };
    }

    /** Snapshot without the timestamp, used to detect real changes for autosave. */
    contentSnapshot() {
        const project = this.serialize();
        return JSON.stringify({ nodes: project.nodes, connections: project.connections });
    }

    /* ------------------------------------------------------------------ *
     * Loading
     * ------------------------------------------------------------------ */

    validateProject(project) {
        if (!project || typeof project !== 'object') {
            throw new Error('That file is not a Pixel Music project.');
        }
        if (project.format && project.format !== this.format) {
            throw new Error(`Unsupported project format: ${project.format}`);
        }
        if (!Array.isArray(project.nodes)) {
            throw new Error('The project has no "nodes" list.');
        }

        const nodes = [];
        const ids = new Set();

        const normalize = (raw) => {
            if (!raw || typeof raw !== 'object') return null;
            if (typeof raw.id !== 'string' || !raw.id) return null;
            if (typeof raw.type !== 'string' || !raw.type) return null;
            return {
                ...raw,
                x: Number.isFinite(raw.x) ? raw.x : 100,
                y: Number.isFinite(raw.y) ? raw.y : 100,
                instrument: typeof raw.instrument === 'string' ? raw.instrument : 'sine',
                properties: {
                    note: '',
                    comment: '',
                    duration: 500,
                    volume: 80,
                    effects: {},
                    strudelProperties: {},
                    ...(raw.properties && typeof raw.properties === 'object' ? raw.properties : {})
                },
                children: Array.isArray(raw.children) ? raw.children.map(normalize).filter(Boolean) : []
            };
        };

        const collect = (list) => {
            list.forEach(raw => {
                const node = normalize(raw);
                if (!node || ids.has(node.id)) return;
                ids.add(node.id);
                nodes.push(node);
                if (node.children.length) collect(node.children);
            });
        };
        collect(project.nodes);

        if (!nodes.length) {
            throw new Error('The project does not contain any usable nodes.');
        }

        const connections = (Array.isArray(project.connections) ? project.connections : [])
            .filter(conn => conn && ids.has(conn.sourceNodeId) && ids.has(conn.targetNodeId))
            .map((conn, index) => ({
                id: typeof conn.id === 'string' && conn.id ? conn.id : `conn-restored-${index}`,
                sourceNodeId: conn.sourceNodeId,
                sourcePort: conn.sourcePort || 'output',
                targetNodeId: conn.targetNodeId,
                targetPort: conn.targetPort || 'input'
            }));

        return { nodes, connections };
    }

    /**
     * Replace the current graph with the given project.
     * Returns the number of restored nodes.
     */
    applyProject(project) {
        const data = this.validateProject(project);
        const manager = this.manager;
        const factory = manager.factory;

        // The graph is replaced wholesale, so drop any nested child-editing level.
        factory.nodes = [];
        factory.resetLevelNavigation();
        factory.selectedNode = null;

        manager.connections.clearAllConnections();
        if (this.dom) {
            const canvas = document.getElementById('canvas-content');
            if (canvas) canvas.querySelectorAll('.node').forEach(el => el.remove());
        }

        data.nodes.forEach(node => {
            factory.nodes.push(node);
            factory.renderNode(node);
        });

        data.connections.forEach(conn => {
            manager.connections.connections.push(conn);
            // Only draw connections whose endpoints are currently on the canvas.
            if (this.dom && document.getElementById(conn.sourceNodeId) && document.getElementById(conn.targetNodeId)) {
                manager.connections.renderConnection(conn);
            }
        });

        factory.hideSidePanel();
        factory.updateDeleteButtonState();
        manager.updateStrudelOutput();
        manager.updateBackButtonState();

        return data.nodes.length;
    }

    /* ------------------------------------------------------------------ *
     * File actions
     * ------------------------------------------------------------------ */

    save() {
        const project = this.serialize();
        const name = `pixelmusic-${this.timestamp()}.json`;
        this.download(name, JSON.stringify(project, null, 2), 'application/json');
        this.manager.updateStatus?.(`Saved ${this.getNodes().length} node(s) to ${name}`);
        return project;
    }

    open() {
        if (!this.dom) return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.addEventListener('change', async () => {
            const file = input.files && input.files[0];
            if (!file) return;
            try {
                this.loadText(await file.text(), file.name);
            } catch (error) {
                console.error('Project load failed:', error);
                this.manager.updateStatus?.(`Load failed: ${error.message}`);
                window.alert?.(`Could not load project:\n\n${error.message}`);
            }
        });
        input.click();
    }

    loadText(text, sourceName = 'project') {
        let data;
        try {
            data = JSON.parse(text);
        } catch (error) {
            throw new Error(`${sourceName} is not valid JSON.`);
        }

        if (this.getNodes().length && !this.confirmReplace()) {
            this.manager.updateStatus?.('Load cancelled');
            return false;
        }

        const count = this.applyProject(data);
        this.manager.updateStatus?.(`Loaded ${count} node(s) from ${sourceName}`);
        return true;
    }

    confirmReplace() {
        if (!this.dom || typeof window === 'undefined' || typeof window.confirm !== 'function') return true;
        return window.confirm('Replace the current nodes with the loaded project?');
    }

    exportCode() {
        const code = this.manager.buildPlayablePattern?.() || '';
        if (!code) {
            this.manager.updateStatus?.('Nothing to export yet — add a node first');
            return '';
        }

        const body = [
            '// Pixel Music — generated Strudel pattern',
            `// ${new Date().toISOString()}`,
            '',
            code,
            ''
        ].join('\n');

        this.download(`pixelmusic-code-${this.timestamp()}.strudel`, body, 'text/plain');
        this.manager.updateStatus?.('Exported Strudel code — paste it into strudel.cc');
        return code;
    }

    /* ------------------------------------------------------------------ *
     * Autosave
     * ------------------------------------------------------------------ */

    startAutosave() {
        this.restoreAutosaveWhenReady();
        this.autosaveTimer = setInterval(() => this.autosave(), this.autosaveIntervalMs);
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => this.autosave());
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') this.autosave();
            });
        }
    }

    autosave() {
        try {
            const snapshot = this.contentSnapshot();
            if (snapshot === this.lastSnapshot) return false;
            const project = this.serialize();
            project.autosaved = true;
            localStorage.setItem(this.autosaveKey, JSON.stringify(project));
            this.lastSnapshot = snapshot;
            return true;
        } catch (error) {
            console.warn('Autosave failed:', error);
            return false;
        }
    }

    restoreAutosaveWhenReady() {
        const ready = this.manager?.schemasReady;
        Promise.resolve(ready)
            .catch(() => {})
            .then(() => this.restoreAutosave());
    }

    restoreAutosave() {
        try {
            if (this.getNodes().length) return false;
            const raw = localStorage.getItem(this.autosaveKey);
            if (!raw) return false;
            const data = JSON.parse(raw);
            if (!data || !Array.isArray(data.nodes) || !data.nodes.length) return false;

            const count = this.applyProject(data);
            this.lastSnapshot = this.contentSnapshot();
            this.manager.updateStatus?.(
                `Restored autosaved project (${count} node(s)) — use "Clear Nodes" to start fresh`
            );
            return true;
        } catch (error) {
            console.warn('Autosave restore skipped:', error);
            return false;
        }
    }

    clearAutosave() {
        try {
            localStorage.removeItem(this.autosaveKey);
        } catch (error) {
            console.warn('Could not clear autosave:', error);
        }
        this.lastSnapshot = '';
    }

    /* ------------------------------------------------------------------ *
     * Helpers
     * ------------------------------------------------------------------ */

    bindUI() {
        const saveBtn = document.getElementById('saveProject');
        if (saveBtn) saveBtn.addEventListener('click', () => this.save());

        const loadBtn = document.getElementById('loadProject');
        if (loadBtn) loadBtn.addEventListener('click', () => this.open());

        const exportBtn = document.getElementById('exportMixBtn');
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportCode());

        document.addEventListener('keydown', (event) => {
            if (!(event.metaKey || event.ctrlKey)) return;
            const key = event.key.toLowerCase();
            if (key === 's') {
                event.preventDefault();
                this.save();
            } else if (key === 'o') {
                event.preventDefault();
                this.open();
            }
        });
    }

    download(filename, text, mime) {
        if (!this.dom) return;
        const blob = new Blob([text], { type: mime || 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    timestamp() {
        const now = new Date();
        const pad = (value) => String(value).padStart(2, '0');
        return [
            now.getFullYear(),
            pad(now.getMonth() + 1),
            pad(now.getDate()),
            '-',
            pad(now.getHours()),
            pad(now.getMinutes())
        ].join('');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProjectManager };
}

// Boot the project manager against the live editor.
if (typeof window !== 'undefined' && window.nodeManager) {
    window.projectManager = new ProjectManager(window.nodeManager);
}
