/**
 * nodeContextMenu.js
 * Right-click menu for a single node (the canvas menu stays for empty space).
 */

(() => {
    const MENU_ID = 'node-context-menu';
    let currentNodeId = null;

    function menu() {
        return document.getElementById(MENU_ID);
    }

    function findNode(nodeId) {
        return window.nodeManager?.factory?.nodes?.find(node => node.id === nodeId) || null;
    }

    function close() {
        menu()?.classList.remove('visible');
        currentNodeId = null;
    }

    function open(nodeId, clientX, clientY) {
        const element = menu();
        const node = findNode(nodeId);
        if (!element || !node) return;

        currentNodeId = nodeId;

        const title = element.querySelector('.node-context-title');
        if (title) {
            title.textContent = node.instrument ? `${node.type} · ${node.instrument}` : node.type;
        }

        element.classList.add('visible');

        // Keep the menu inside the viewport.
        const rect = element.getBoundingClientRect();
        const x = Math.max(8, Math.min(clientX, window.innerWidth - rect.width - 8));
        const y = Math.max(8, Math.min(clientY, window.innerHeight - rect.height - 8));
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
    }

    function deleteNode() {
        const node = findNode(currentNodeId);
        const manager = window.nodeManager;
        if (!node || !manager) return;

        const connections = manager.connections?.connections || [];
        const wired = connections.filter(conn => conn.sourceNodeId === node.id || conn.targetNodeId === node.id);
        const hasChildren = Array.isArray(node.children) && node.children.length > 0;

        if (hasChildren && !window.confirm(`Delete the ${node.type} node and its ${node.children.length} child node(s)?`)) {
            return;
        }
        if (!hasChildren && wired.length && !window.confirm(`Delete the ${node.type} node and its ${wired.length} connection(s)?`)) {
            return;
        }

        manager.factory.deleteNode(node.id);
        manager.factory.hideSidePanel?.();
        close();
    }

    function editChildren() {
        const node = findNode(currentNodeId);
        const factory = window.nodeManager?.factory;
        if (!node || !factory) return;
        factory.enterNodeLevel?.(node);
        close();
    }

    function disconnectNode() {
        const node = findNode(currentNodeId);
        const manager = window.nodeManager;
        if (!node || !manager?.connections) return;

        const connections = manager.connections.connections;
        const keep = [];
        connections.forEach(conn => {
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
        close();
    }

    function init() {
        const element = menu();
        if (!element) return;

        element.addEventListener('click', event => {
            const item = event.target.closest('.context-menu-item');
            if (!item) return;
            const action = item.dataset.action;
            if (action === 'delete-node') deleteNode();
            else if (action === 'edit-children') editChildren();
            else if (action === 'disconnect-node') disconnectNode();
            else close();
        });

        document.addEventListener('click', event => {
            if (!element.classList.contains('visible')) return;
            if (event.target.closest(`#${MENU_ID}`)) return;
            close();
        });

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') close();
        });

        window.addEventListener('resize', close);
        window.addEventListener('blur', close);
    }

    window.nodeContextMenu = { open, close };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
