    // Initialize Node Search after DOM is ready
    let nodeSearch = null;
    setTimeout(() => {
        // Try to get NodeManager from window or app
        const nodeManager = window.nodeManager || (window.app && window.app.nodeManager);
        const menuData = window.menuData || (window.menuLoader && window.menuLoader.menuData);
        
        if (nodeManager) {
            nodeSearch = new NodeSearch(nodeManager, menuData);
            console.log('NodeSearch initialized');
        } else {
            console.log('NodeManager not available yet, NodeSearch will be initialized later');
        }
    }, 1000);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts when typing in input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        // Ctrl/Cmd + F to toggle search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            if (nodeSearch) {
                nodeSearch.toggleSearchToolbar();
            } else {
                // Try to initialize NodeSearch if not already done
                const nodeManager = window.nodeManager || (window.app && window.app.nodeManager);
                if (nodeManager) {
                    nodeSearch = new NodeSearch(nodeManager);
                    nodeSearch.toggleSearchToolbar();
                }
            }
        }
        
        // Escape to close search or context menu
        if (e.key === 'Escape') {
            if (nodeSearch) {
                const searchToolbar = document.querySelector('.canvas-search-toolbar');
                const contextMenu = document.getElementById('canvas-context-menu');
                
                if (searchToolbar && searchToolbar.classList.contains('active')) {
                    nodeSearch.hideSearchToolbar();
                }
                if (contextMenu && contextMenu.classList.contains('visible')) {
                    nodeSearch.hideContextMenu();
                }
            }
        }
    });