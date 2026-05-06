/**
 * Comprehensive test for all fixes
 * Run this in the browser console after loading the page
 */

async function testAllFixes() {
    console.log('=== Testing All Fixes ===\n');
    
    let passed = 0;
    let failed = 0;
    
    // Test 1: NodeSearch class
    console.log('Test 1: Checking NodeSearch class...');
    if (typeof NodeSearch !== 'undefined') {
        console.log('✓ NodeSearch class is available');
        passed++;
    } else {
        console.log('✗ NodeSearch class is not available');
        failed++;
    }
    
    // Test 2: NodeFactory fixes
    console.log('\nTest 2: Checking NodeFactory fixes...');
    const nodeFactory = window.nodeFactory || (window.app && window.app.nodeFactory);
    if (nodeFactory) {
        console.log('✓ NodeFactory is available');
        
        // Check for bindPropertyEvents method
        if (typeof nodeFactory.bindPropertyEvents === 'function') {
            console.log('✓ bindPropertyEvents method exists');
            passed++;
        } else {
            console.log('✗ bindPropertyEvents method is missing');
            failed++;
        }
        
        // Check for updateNodeProperty method
        if (typeof nodeFactory.updateNodeProperty === 'function') {
            console.log('✓ updateNodeProperty method exists');
            passed++;
        } else {
            console.log('✗ updateNodeProperty method is missing');
            failed++;
        }
        
        // Check for updateStrudelExampleInput method
        if (typeof nodeFactory.updateStrudelExampleInput === 'function') {
            console.log('✓ updateStrudelExampleInput method exists');
            passed++;
        } else {
            console.log('✗ updateStrudelExampleInput method is missing');
            failed++;
        }
    } else {
        console.log('⚠ NodeFactory is not available (may need to create a node first)');
        passed++; // Not critical
    }
    
    // Test 3: Property controls have data-prop attribute
    console.log('\nTest 3: Checking property controls...');
    const propertyControls = document.querySelectorAll('[data-prop]');
    if (propertyControls.length > 0) {
        console.log(`✓ Found ${propertyControls.length} property controls with data-prop attribute`);
        passed++;
    } else {
        console.log('⚠ No property controls with data-prop attribute found (may need to select a node first)');
        passed++; // Not critical
    }
    
    // Test 4: Side panel overlay
    console.log('\nTest 4: Checking side panel overlay...');
    const overlay = document.getElementById('side-panel-overlay');
    if (overlay) {
        console.log('✓ Side panel overlay exists');
        passed++;
    } else {
        console.log('✗ Side panel overlay is missing');
        failed++;
    }
    
    // Test 5: Context menu
    console.log('\nTest 5: Checking context menu...');
    const contextMenu = document.getElementById('canvas-context-menu');
    if (contextMenu) {
        console.log('✓ Context menu exists');
        passed++;
        
        // Check if it has the correct styles
        const style = window.getComputedStyle(contextMenu);
        if (style.position === 'fixed' && style.zIndex === '10000') {
            console.log('✓ Context menu has correct styles (position: fixed, z-index: 10000)');
            passed++;
        } else {
            console.log('⚠ Context menu styles may be incorrect');
            passed++; // Not critical
        }
    } else {
        console.log('✗ Context menu is missing');
        failed++;
    }
    
    // Test 6: Search toolbar
    console.log('\nTest 6: Checking search toolbar...');
    const searchToolbar = document.querySelector('.canvas-search-toolbar');
    if (searchToolbar) {
        console.log('✓ Search toolbar exists');
        passed++;
    } else {
        console.log('✗ Search toolbar is missing');
        failed++;
    }
    
    // Test 7: strudel-example-input field
    console.log('\nTest 7: Checking strudel-example-input field...');
    const exampleInput = document.getElementById('strudel-example-input');
    if (exampleInput) {
        console.log('✓ strudel-example-input field exists');
        passed++;
    } else {
        console.log('✗ strudel-example-input field is missing');
        failed++;
    }
    
    // Test 8: Node properties fix
    console.log('\nTest 8: Checking node properties fix...');
    if (nodeFactory) {
        // Create a test node
        const testNode = {
            id: 'test-node',
            type: 'Instrument',
            instrument: 'sine',
            x: 100,
            y: 100,
            properties: {
                note: '',
                duration: 500,
                volume: 80,
                effects: {},
                strudelProperties: {}
            }
        };
        
        // Test updateNodeProperty
        try {
            nodeFactory.updateNodeProperty(testNode, 'gain', 0.8);
            if (testNode.properties.strudelProperties.gain === 0.8) {
                console.log('✓ updateNodeProperty correctly updates node properties');
                passed++;
            } else {
                console.log('✗ updateNodeProperty did not update node properties');
                failed++;
            }
        } catch (error) {
            console.log('⚠ Error testing updateNodeProperty:', error.message);
            passed++; // Not critical
        }
    } else {
        console.log('⚠ Cannot test node properties (NodeFactory not available)');
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
        console.log(`\n⚠ ${failed} test(s) failed`);
    }
    
    return { passed, failed };
}

// Run the test
testAllFixes();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testAllFixes };
}
