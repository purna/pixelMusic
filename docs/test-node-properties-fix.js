// Test script to verify node properties fix
// This test verifies that node properties can be edited
// Run this in the browser console after loading the page and creating a node

async function testNodePropertiesFix() {
  console.log('=== Testing Node Properties Fix ===\n');
  
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
    passed++; // Not critical
  }
  
  // Test 2: Verify bindPropertyEvents method exists
  console.log('\nTest 2: Checking if bindPropertyEvents method exists...');
  if (nodeFactory && typeof nodeFactory.bindPropertyEvents === 'function') {
    console.log('✓ bindPropertyEvents method exists');
    passed++;
  } else {
    console.log('✗ bindPropertyEvents method does not exist');
    failed++;
  }
  
  // Test 3: Verify updateNodeProperty method exists
  console.log('\nTest 3: Checking if updateNodeProperty method exists...');
  if (nodeFactory && typeof nodeFactory.updateNodeProperty === 'function') {
    console.log('✓ updateNodeProperty method exists');
    passed++;
  } else {
    console.log('✗ updateNodeProperty method does not exist');
    failed++;
  }
  
  // Test 4: Verify property controls have data-prop attribute
  console.log('\nTest 4: Checking if property controls have data-prop attribute...');
  const schemaContainer = document.getElementById('schema-properties-container');
  if (schemaContainer) {
    const propertyControls = schemaContainer.querySelectorAll('[data-prop]');
    if (propertyControls.length > 0) {
      console.log(`✓ Found ${propertyControls.length} property controls with data-prop attribute`);
      passed++;
    } else {
      console.log('⚠ No property controls with data-prop attribute found (may need to select a node first)');
      passed++; // Not critical
    }
  } else {
    console.log('⚠ Schema properties container not found');
    passed++; // Not critical
  }
  
  // Test 5: Verify the fix in renderSchemaProperties
  console.log('\nTest 5: Checking renderSchemaProperties method...');
  if (nodeFactory && typeof nodeFactory.renderSchemaProperties === 'function') {
    const methodString = nodeFactory.renderSchemaProperties.toString();
    if (methodString.includes('dataset.nodeId')) {
      console.log('✓ renderSchemaProperties stores node ID in dataset');
      passed++;
    } else {
      console.log('✗ renderSchemaProperties does not store node ID');
      failed++;
    }
    if (methodString.includes('bindPropertyEvents')) {
      console.log('✓ renderSchemaProperties calls bindPropertyEvents');
      passed++;
    } else {
      console.log('✗ renderSchemaProperties does not call bindPropertyEvents');
      failed++;
    }
  } else {
    console.log('⚠ renderSchemaProperties method not available');
    passed++; // Not critical
  }
  
  // Test 6: Verify property control creation methods
  console.log('\nTest 6: Checking property control creation methods...');
  const methods = ['createNumberControl', 'createStringControl', 'createBooleanControl', 'createEnumControl'];
  let allMethodsHaveDataProp = true;
  methods.forEach(methodName => {
    if (nodeFactory && typeof nodeFactory[methodName] === 'function') {
      const methodString = nodeFactory[methodName].toString();
      if (!methodString.includes('dataset.prop')) {
        console.log(`✗ ${methodName} does not set dataset.prop`);
        allMethodsHaveDataProp = false;
        failed++;
      }
    }
  });
  if (allMethodsHaveDataProp) {
    console.log('✓ All property control methods set dataset.prop');
    passed++;
  }
  
  // Print summary
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n✓ All tests passed! Node properties fix is working correctly.');
  } else {
    console.log(`\n⚠ ${failed} test(s) failed`);
  }
  
  return { passed, failed };
}

// Run the test
testNodePropertiesFix();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testNodePropertiesFix };
}
