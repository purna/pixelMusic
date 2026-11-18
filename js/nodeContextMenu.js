/**
 * nodeContextMenu.js
 * Node-specific actions for the shared canvas context menu.
 *
 * The menu itself (markup, positioning, add-node actions) is owned by
 * NodeSearch; this module only performs the actions on the right-clicked node,
 * so right-clicking a node keeps every canvas option and adds the node ones.
 */

(() => {
    function findNode(nodeId) {
        if (!nodeId) return null;
        return window.nodeManager?.factory?.nodes?.find(node => node.id === nodeId) || null;
    }

    function deleteNode(nodeId) {
        const node = findNode(nodeId);
        const manager = window.nodeManager;
        if (!node || !manager) return;

        const connections = manager.connections?.connections || [];
        const wired = connections.filter(conn => conn.sourceNodeId === node.id || conn.targetNodeId === node.id);
        const children = Array.isArray(node.children) ? node.children.length : 0;

        if (children && !window.confirm(`Delete the ${node.type} node and its ${children} child node(s)?`)) {
            return;
        }
        if (!children && wired.length && !window.confirm(`Delete the ${node.type} node and its ${wired.length} connection(s)?`)) {
            return;
        }

        manager.factory.deleteNode(node.id);
        manager.factory.hideSidePanel?.();
    }

    function disconnectNode(nodeId) {
        const node = findNode(nodeId);
        const manager = window.nodeManager;
        if (!node || !manager?.connections) return;

        const keep = [];
        manager.connections.connections.forEach(conn => {
            if (conn.sourceNodeId === node.id || conn.targetNodeId === node.id) {
                manager.connections.removeConnection?.(conn.id);
                document.querySelector(`[data-connection-id="${conn.id}"]`)?.remove();
            } else {
                keep.push(conn);
            }
        });
        manager.connections.connections = keep;
        manager.updateStrudelOutput?.();
        manager.updateStatus?.(`Disconnected ${node.type} node`);
    }

    function editChildren(nodeId) {
        const node = findNode(nodeId);
        const factory = window.nodeManager?.factory;
        if (!node || !factory) return;
        factory.enterNodeLevel?.(node);
    }

    window.nodeContextActions = { deleteNode, disconnectNode, editChildren };
})();
