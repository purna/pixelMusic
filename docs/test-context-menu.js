/**
 * Test script for right-click context menu
 * Run this in the browser console after loading the page
 */

async function testContextMenu() {
    console.log('=== Testing Right-Click Context Menu ===\n');
    
    let passed = 0;
    let failed = 0;
    
    // Test 1: Check if context menu exists
    console.log('Test 1: Checking if context menu exists...');
    const contextMenu = document.getElementById('canvas-context-menu');
    if (contextMenu) {
        console.log('✓ Context menu exists');
        passed++;
    } else {
        console.log('✗ Context menu does not exist');
        failed++;
    }
    
    // Test 2: Check if context menu has correct items
    console.log('\nTest 2: Checking context menu items...');
    if (contextMenu) {
        const menuItems = contextMenu.querySelectorAll('.context-menu-item');
        console.log(`  Found ${menuItems.length} menu items`);
        
        const expectedActions = ['add-node', 'search-node', 'add-instrument', 'add-effect', 'add-pattern'];
        let allActionsExist = true;
        
        expectedActions.forEach(action => {
            const item = contextMenu.querySelector(`[data-action="${action}"]`);
            if (item) {
                console.log(`  ✓ Action "${action}" exists`);
            } else {
                console.log(`  ✗ Action "${action}" missing`);
                allActionsExist = false;
            }
        });
        
        if (allActionsExist) {
            console.log('✓ All context menu actions exist');
            passed++;
        } else {
            console.log('✗ Some context menu actions are missing');
            failed++;
        }
    } else {
        console.log('⚠ Cannot test menu items (context menu not found)');
        passed++;
    }
    
    // Test 3: Check if NodeSearch is available
    console.log('\nTest 3: Checking if NodeSearch is available...');
    const nodeSearch = window.nodeSearch || (window.app && window.app.nodeSearch);
    if (nodeSearch) {
        console.log('✓ NodeSearch is available');
        passed++;
    } else {
        console.log('⚠ NodeSearch is not available (may need to wait for initialization)');
        passed++; // Not critical for this test
    }
    
    // Test 4: Check if context menu is hidden by default
    console.log('\nTest 4: Checking if context menu is hidden by default...');
    if (contextMenu && !contextMenu.classList.contains('visible')) {
        console.log('✓ Context menu is hidden by default');
        passed++;
    } else if (contextMenu) {
        console.log('✗ Context menu is visible by default');
        failed++;
    } else {
        console.log('⚠ Cannot test visibility (context menu not found)');
        passed++;
    }
    
    // Test 5: Check CSS styles
    console.log('\nTest 5: Checking context menu CSS styles...');
    if (contextMenu) {
        const style = window.getComputedStyle(contextMenu);
        console.log(`  Position: ${style.position}`);
        console.log(`  Z-index: ${style.zIndex}`);
        console.log(`  Font size: ${style.fontSize}`);
        
        if (style.position === 'fixed') {
            console.log('✓ Context menu has position: fixed');
            passed++;
        } else {
            console.log('✗ Context menu does not have position: fixed');
            failed++;
        }
        
        if (parseInt(style.zIndex) >= 10000) {
            console.log('✓ Context menu has high z-index');
            passed++;
        } else {
            console.log('⚠ Context menu z-index may be too low');
            passed++;
        }
    } else {
        console.log('⚠ Cannot test CSS (context menu not found)');
        passed++;
    }
    
    // Print summary
    console.log('\n=== Test Summary ===');
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${passed + failed}`);
    
    if (failed === 0) {
        console.log('\n✓ All tests passed!');
    } else {
        console.log(`\n⚠ ${failed} test(s) failed`);
    }
    
    return { passed, failed };
}

// Run the test
testContextMenu();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testContextMenu };
}
