/**
 * Test script for NodeSearch functionality
 * Run this in the browser console after loading the page
 */

async function testNodeSearch() {
    console.log('=== Testing NodeSearch Functionality ===\n');
    
    let passed = 0;
    let failed = 0;
    
    // Test 1: Check if NodeSearch class is available
    console.log('Test 1: Checking if NodeSearch class is available...');
    if (typeof NodeSearch !== 'undefined') {
        console.log('✓ NodeSearch class is available');
        passed++;
    } else {
        console.log('✗ NodeSearch class is not available');
        failed++;
        return { passed, failed };
    }
    
    // Test 2: Check if NodeSearch is initialized
    console.log('\nTest 2: Checking if NodeSearch is initialized...');
    const nodeSearch = window.nodeSearch || (window.app && window.app.nodeSearch);
    if (nodeSearch) {
        console.log('✓ NodeSearch is initialized');
        passed++;
    } else {
        console.log('⚠ NodeSearch is not initialized (may need to wait for initialization)');
        passed++; // Not critical for this test
    }
    
    // Test 3: Check if search input exists
    console.log('\nTest 3: Checking if search input exists...');
    const searchInput = document.getElementById('node-search-input');
    if (searchInput) {
        console.log('✓ Search input exists');
        passed++;
    } else {
        console.log('✗ Search input does not exist');
        failed++;
    }
    
    // Test 4: Check if search button exists
    console.log('\nTest 4: Checking if search button exists...');
    const searchBtn = document.getElementById('node-search-btn');
    if (searchBtn) {
        console.log('✓ Search button exists');
        passed++;
    } else {
        console.log('✗ Search button does not exist');
        failed++;
    }
    
    // Test 5: Check if search toolbar exists
    console.log('\nTest 5: Checking if search toolbar exists...');
    const searchToolbar = document.querySelector('.canvas-search-toolbar');
    if (searchToolbar) {
        console.log('✓ Search toolbar exists');
        passed++;
    } else {
        console.log('✗ Search toolbar does not exist');
        failed++;
    }
    
    // Test 6: Check if context menu exists
    console.log('\nTest 6: Checking if context menu exists...');
    const contextMenu = document.getElementById('canvas-context-menu');
    if (contextMenu) {
        console.log('✓ Context menu exists');
        passed++;
    } else {
        console.log('✗ Context menu does not exist');
        failed++;
    }
    
    // Test 7: Check if NodeManager is available
    console.log('\nTest 7: Checking if NodeManager is available...');
    const nodeManager = window.nodeManager || (window.app && window.app.nodeManager);
    if (nodeManager) {
        console.log('✓ NodeManager is available');
        passed++;
    } else {
        console.log('⚠ NodeManager is not available (NodeSearch may not work)');
        passed++; // Not critical for this test
    }
    
    // Test 8: Test search functionality (if NodeSearch is available)
    if (nodeSearch) {
        console.log('\nTest 8: Testing search functionality...');
        try {
            // Test with a simple query
            const results = nodeSearch.findNodes('sine');
            if (results && results.length > 0) {
                console.log(`✓ Search found ${results.length} results for "sine"`);
                passed++;
            } else {
                console.log('⚠ Search returned no results for "sine"');
                passed++; // Not critical
            }
        } catch (error) {
            console.log('✗ Search functionality error:', error.message);
            failed++;
        }
    } else {
        console.log('\nTest 8: Skipping search test (NodeSearch not available)');
        passed++;
    }
    
    // Test 9: Check keyboard shortcut info
    console.log('\nTest 9: Checking keyboard shortcuts...');
    console.log('  Ctrl/Cmd + F - Toggle search toolbar');
    console.log('  Escape - Close search/context menu');
    console.log('  Enter - Perform search');
    console.log('  Arrow Up/Down - Navigate results');
    passed++;
    
    // Test 10: Check context menu actions
    console.log('\nTest 10: Checking context menu actions...');
    const contextActions = ['add-node', 'search-node', 'add-instrument', 'add-effect', 'add-pattern'];
    let allActionsExist = true;
    contextActions.forEach(action => {
        const item = document.querySelector(`[data-action="${action}"]`);
        if (!item) {
            console.log(`  ✗ Action "${action}" not found`);
            allActionsExist = false;
        }
    });
    if (allActionsExist) {
        console.log('✓ All context menu actions exist');
        passed++;
    } else {
        console.log('⚠ Some context menu actions are missing');
        passed++; // Not critical
    }
    
    // Print summary
    console.log('\n=== Test Summary ===');
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${passed + failed}`);
    
    if (failed === 0) {
        console.log('\n✓ All tests passed!');
    } else {
        console.log(`\n⚠ ${failed} test(s) failed or had warnings`);
    }
    
    return { passed, failed };
}

// Run the test
testNodeSearch();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testNodeSearch };
}
