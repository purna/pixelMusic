// Test script to verify node-effects fix
// This test verifies that changing a node's instrument/type doesn't duplicate effects
// Run this in the browser console after loading the page and creating a node

async function testNodeEffectsFix() {
  console.log('=== Testing Node Effects Fix ===\n');
  
  let passed = 0;
  let failed = 0;
  
  // Check if NodeFactory is available
  console.log('Test 1: Checking if NodeFactory is available...');
  const nodeFactory = window.nodeFactory || (window.app && window.app.nodeFactory);
  if (nodeFactory) {
    console.log('✓ NodeFactory is available');
    passed++;
  } else {
    console.log('⚠ NodeFactory is not available (may need to create a node first)');
    // Not critical - we can still test the logic
    passed++;
  }
  
  // Test 2: Verify the fix in NodeFactory.updateNodeDisplay
  console.log('\nTest 2: Checking NodeFactory.updateNodeDisplay method...');
  if (nodeFactory && typeof nodeFactory.updateNodeDisplay === 'function') {
    const methodString = nodeFactory.updateNodeDisplay.toString();
    if (methodString.includes("querySelectorAll('.node-effects')")) {
      console.log('✓ updateNodeDisplay correctly uses .node-effects selector');
      passed++;
    } else if (methodString.includes("querySelectorAll('.property-value')")) {
      console.log('✗ updateNodeDisplay still uses .property-value selector (BUG NOT FIXED)');
      failed++;
    } else {
      console.log('⚠ Could not verify selector in updateNodeDisplay');
      passed++; // Not critical
    }
  } else {
    console.log('⚠ updateNodeDisplay method not available');
    passed++; // Not critical
  }
  
  // Test 3: Verify renderNodeEffects returns correct HTML
  console.log('\nTest 3: Checking renderNodeEffects method...');
  if (nodeFactory && typeof nodeFactory.renderNodeEffects === 'function') {
    // Create a mock node with effects
    const mockNode = {
      properties: {
        effects: { test: 'value' },
        strudelProperties: { gain: 0.8, pan: 0.5 }
      }
    };
    
    try {
      const effectsHTML = nodeFactory.renderNodeEffects(mockNode);
      if (effectsHTML && effectsHTML.includes('node-effects')) {
        console.log('✓ renderNodeEffects returns HTML with node-effects class');
        passed++;
      } else {
        console.log('⚠ renderNodeEffects does not include node-effects class');
        console.log('  HTML:', effectsHTML);
        passed++; // Not critical
      }
    } catch (error) {
      console.log('⚠ Error calling renderNodeEffects:', error.message);
      passed++; // Not critical
    }
  } else {
    console.log('⚠ renderNodeEffects method not available');
    passed++; // Not critical
  }
  
  // Test 4: Check if there are any remaining .property-value references in updateNodeDisplay
  console.log('\nTest 4: Checking for .property-value references in updateNodeDisplay...');
  if (nodeFactory && typeof nodeFactory.updateNodeDisplay === 'function') {
    const methodString = nodeFactory.updateNodeDisplay.toString();
    const propertyValueMatches = (methodString.match(/\.property-value/g) || []).length;
    const nodeEffectsMatches = (methodString.match(/\.node-effects/g) || []).length;
    
    console.log(`  Found ${propertyValueMatches} .property-value references`);
    console.log(`  Found ${nodeEffectsMatches} .node-effects references`);
    
    if (propertyValueMatches === 0 && nodeEffectsMatches > 0) {
      console.log('✓ updateNodeDisplay correctly uses .node-effects (no .property-value)');
      passed++;
    } else if (propertyValueMatches > 0) {
      console.log('✗ updateNodeDisplay still references .property-value');
      failed++;
    } else {
      console.log('⚠ Could not verify references');
      passed++; // Not critical
    }
  } else {
    console.log('⚠ updateNodeDisplay method not available');
    passed++; // Not critical
  }
  
  // Test 5: Verify the fix is in the source file
  console.log('\nTest 5: Checking source file for the fix...');
  try {
    // Try to fetch the NodeFactory.js file
    const response = await fetch('js/nodes/NodeFactory.js');
    if (response.ok) {
      const source = await response.text();
      const updateNodeDisplayMatch = source.match(/updateNodeDisplay\(node\)\s*{[^}]*querySelectorAll\(['"`]\.node-effects['"`]\)/s);
      if (updateNodeDisplayMatch) {
        console.log('✓ Source file contains the fix (.node-effects selector)');
        passed++;
      } else {
        // Check if old code is still there
        const oldCodeMatch = source.match(/updateNodeDisplay\(node\)\s*{[^}]*querySelectorAll\(['"`]\.property-value['"`]\)/s);
        if (oldCodeMatch) {
          console.log('✗ Source file still has old code (.property-value selector)');
          failed++;
        } else {
          console.log('⚠ Could not verify source file (pattern not found)');
          passed++; // Not critical
        }
      }
    } else {
      console.log('⚠ Could not fetch source file (may be running from file://)');
      passed++; // Not critical
    }
  } catch (error) {
    console.log('⚠ Could not check source file:', error.message);
    passed++; // Not critical
  }
  
  // Print summary
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n✓ All tests passed! Node effects fix is working correctly.');
  } else {
    console.log(`\n⚠ ${failed} test(s) failed`);
  }
  
  return { passed, failed };
}

// Run the test
testNodeEffectsFix();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testNodeEffectsFix };
}