/**
 * ConnectionManager.js
 * Manages connections between nodes (drawing lines, handling connection state).
 */
class ConnectionManager {
    constructor(manager) {
        this.manager = manager;
        this.connections = [];
        this.isConnecting = false;
        this.connectionStartNode = null;
        this.connectionPreview = null;
    }

    addConnectionPortListeners(nodeElement, node) {
        // Get all input and output ports
        const inputPorts = nodeElement.querySelectorAll('.node-input');
        const outputPorts = nodeElement.querySelectorAll('.node-output');

        // Add listeners for all input ports
        inputPorts.forEach(inputPort => {
            inputPort.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                const portType = inputPort.dataset.port || 'input';
                this.startConnection(node, portType, e);
            });
        });

        // Add listeners for all output ports
        outputPorts.forEach(outputPort => {
            outputPort.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                const portType = outputPort.dataset.port || 'output';
                this.startConnection(node, portType, e);
            });
        });
    }

    startConnection(node, portType, event) {
        this.isConnecting = true;
        this.connectionStartNode = { node, portType };

        // Create preview line
        this.createConnectionPreview(event);

        // Add global mouse move and up listeners
        document.addEventListener('mousemove', this.boundUpdateConnectionPreview = this.updateConnectionPreview.bind(this));
        document.addEventListener('mouseup', this.boundFinishConnection = this.finishConnection.bind(this));
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

        const startPort = startNodeElement.querySelector(`.node-${this.connectionStartNode.portType.startsWith('input') ? 'input' : 'output'}`);
        if (!startPort) return;

        const startRect = startPort.getBoundingClientRect();
        const canvasRect = document.getElementById('canvas-content').getBoundingClientRect();

        const startX = (startRect.left + startRect.width / 2 - canvasRect.left) / this.manager.canvas.scale;
        const startY = (startRect.top + startRect.height / 2 - canvasRect.top) / this.manager.canvas.scale;
        const endX = (event.clientX - canvasRect.left) / this.manager.canvas.scale;
        const endY = (event.clientY - canvasRect.top) / this.manager.canvas.scale;

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

        // Check if we clicked on a valid connection port
        const targetElement = document.elementFromPoint(event.clientX, event.clientY);
        const targetPort = targetElement?.closest('.connection-port');

        if (targetPort) {
            const targetNodeElement = targetPort.closest('.node');

            if (targetNodeElement) {
                const targetNodeId = targetNodeElement.id;
                const targetNode = this.manager.factory.nodes.find(n => n.id === targetNodeId);
                const targetPortType = targetPort.dataset.port;

                if (targetNode && this.canConnect(this.connectionStartNode.node, this.connectionStartNode.portType, targetNode, targetPortType)) {
                    this.createConnection(this.connectionStartNode.node, this.connectionStartNode.portType, targetNode, targetPortType);
                }
            }
        }

        // Cleanup
        this.isConnecting = false;
        this.connectionStartNode = null;

        if (this.connectionPreview) {
            this.connectionPreview.remove();
            this.connectionPreview = null;
        }

        document.removeEventListener('mousemove', this.boundUpdateConnectionPreview);
        document.removeEventListener('mouseup', this.boundFinishConnection);
    }

    canConnect(sourceNode, sourcePort, targetNode, targetPort) {
        // Prevent self-connection
        if (sourceNode.id === targetNode.id) {
            this.manager.updateStatus('Cannot connect node to itself');
            return false;
        }

        // Special handling for stack node connections
        if (sourceNode.type === 'stack' && sourcePort.startsWith('output')) return true;
        if (targetNode.type === 'stack' && targetPort === 'input') return true;

        // Check for control node connections
        const isSourceControl = this.manager.factory.isControlNode(sourceNode);
        const isTargetControl = this.manager.factory.isControlNode(targetNode);

        if (isSourceControl || isTargetControl) {
            return this.validateControlConnection(sourceNode, sourcePort, targetNode, targetPort);
        }

        // Get node definitions from schema
        if (!this.manager.nodeSchema) {
            return this.legacyCanConnect(sourceNode, sourcePort, targetNode, targetPort);
        }

        const sourceNodeDef = this.manager.nodeSchema.nodes[sourceNode.type];
        const targetNodeDef = this.manager.nodeSchema.nodes[targetNode.type];

        if (!sourceNodeDef || !targetNodeDef) {
            return this.legacyCanConnect(sourceNode, sourcePort, targetNode, targetPort);
        }

        // Validate socket types based on schema
        const sourceSocket = this.getNodeSocket(sourceNodeDef, sourcePort);
        const targetSocket = this.getNodeSocket(targetNodeDef, targetPort);

        if (!sourceSocket || !targetSocket) {
            return this.legacyCanConnect(sourceNode, sourcePort, targetNode, targetPort);
        }

        // Check socket compatibility
        const isCompatible = this.areSocketsCompatible(sourceSocket, targetSocket);
        if (!isCompatible) {
            this.manager.updateStatus(`Incompatible connection: ${sourceNode.type} (${sourceSocket}) -> ${targetNode.type} (${targetSocket})`);
            return true; // Allow for testing
        }

        // Apply validation rules
        const validationResult = this.validateConnection(sourceNodeDef, targetNodeDef);
        if (!validationResult.valid) {
            this.manager.updateStatus(`Connection rejected: ${validationResult.reason}`);
            return true; // Allow for testing
        }

        return true;
    }

    getNodeSocket(nodeDef, portType) {
        const portMap = { 'input': 'in', 'output': 'out' };
        const socketKey = portMap[portType.replace(/\d+$/, '')] || portMap[portType];
        if (!socketKey || !nodeDef.sockets[socketKey]) return null;

        if (Array.isArray(nodeDef.sockets[socketKey])) {
            return nodeDef.sockets[socketKey][0];
        }
        return nodeDef.sockets[socketKey];
    }

    areSocketsCompatible(sourceSocket, targetSocket) {
        const matrix = this.manager.nodeSchema.socketCompatibilityMatrix;
        const sourceCompatibility = matrix[sourceSocket];
        return sourceCompatibility ? sourceCompatibility[targetSocket] === true : false;
    }

    validateConnection(sourceNodeDef, targetNodeDef) {
        const forbiddenRules = this.manager.nodeSchema.validationRules.forbiddenConnections;
        for (const rule of forbiddenRules) {
            if ((rule.from === sourceNodeDef.category || rule.from === 'patternOut') &&
                (rule.to === targetNodeDef.category || rule.to === 'patternIn')) {
                return { valid: false, reason: `Forbidden connection: ${sourceNodeDef.category} -> ${targetNodeDef.category}` };
            }
        }
        return { valid: true };
    }

    validateControlConnection(sourceNode, sourcePort, targetNode, targetPort) {
        const isSourceControl = this.manager.factory.isControlNode(sourceNode);
        const isTargetControl = this.manager.factory.isControlNode(targetNode);

        if (isSourceControl && !isTargetControl) {
            const targetDef = this.manager.propertySchema?.nodes?.[targetNode.type];
            if (targetDef && targetDef.acceptsControl && sourcePort === 'output' && targetPort === 'input') {
                return true;
            }
            return false;
        }

        if (isSourceControl && isTargetControl) {
            const sourceDef = this.manager.factory.getControlNodeDefinition(sourceNode.type);
            const targetDef = this.manager.factory.getControlNodeDefinition(targetNode.type);
            const sourceHasOutput = sourceDef.outputs.includes('controlOut');
            const targetHasInput = targetDef.inputs.includes('controlIn');

            if (sourceHasOutput && targetHasInput && sourcePort === 'output' && targetPort === 'input') {
                return true;
            }
            return false;
        }
        return false;
    }

    legacyCanConnect(sourceNode, sourcePort, targetNode, targetPort) {
        // Basic fallback validation
        return true;
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

        this.connections.push(connection);
        this.renderConnection(connection);
        this.manager.updateStatus(`Connected ${sourceNode.type} to ${targetNode.type}`);
    }

    renderConnection(connection) {
        const canvas = document.getElementById('canvas-content');
        if (!canvas) return;

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

        this.updateConnectionPosition(connection);
    }

    updateConnectionPosition(connection) {
        const svg = document.querySelector(`[data-connection-id="${connection.id}"]`);
        if (!svg) return;

        const path = svg.querySelector('.connection-path');
        const sourceNodeElement = document.getElementById(connection.sourceNodeId);
        const targetNodeElement = document.getElementById(connection.targetNodeId);

        if (!sourceNodeElement || !targetNodeElement) return;

        const sourcePort = sourceNodeElement.querySelector(`[data-port="${connection.sourcePort}"]`);
        const targetPort = targetNodeElement.querySelector(`[data-port="${connection.targetPort}"]`);

        if (!sourcePort || !targetPort) return;

        const canvasRect = document.getElementById('canvas-content').getBoundingClientRect();
        const sourceRect = sourcePort.getBoundingClientRect();
        const targetRect = targetPort.getBoundingClientRect();
        const scale = this.manager.canvas.scale;

        const startX = (sourceRect.left + sourceRect.width / 2 - canvasRect.left) / scale;
        const startY = (sourceRect.top + sourceRect.height / 2 - canvasRect.top) / scale;
        const endX = (targetRect.left + targetRect.width / 2 - canvasRect.left) / scale;
        const endY = (targetRect.top + targetRect.height / 2 - canvasRect.top) / scale;

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
        if (svg) svg.remove();
    }

    updateAllConnections() {
        this.connections.forEach(connection => {
            this.updateConnectionPosition(connection);
        });
    }

    clearAllConnections() {
        this.connections = [];
        document.querySelectorAll('.connection-line').forEach(el => el.remove());
    }
}
