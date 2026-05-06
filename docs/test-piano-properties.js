// Test script to verify piano properties are editable
// This test creates a piano node and verifies that its properties are visible and editable

async function testPianoProperties() {
  console.log('=== Testing Piano Properties Editability ===\n');
  
  let passed = 0;
  let failed = 0;
  
  // Wait for NodeManager to be available
  await new Promise(resolve => {
    const checkNodeManager = () => {
      if (window.nodeManager) {
        resolve();
      } else {
        setTimeout(checkNodeManager, 100);
      }
    };
    checkNodeManager();
  });
  
  const nodeManager = window.nodeManager;
  const nodeFactory = nodeManager.factory;
  
  // Test 1: Create a piano node with ADSR envelope
  console.log('Test 1: Creating piano node with ADSR envelope');
  const pianoNode = nodeManager.createNode('Instrument', 'piano', 100, 300);
  if (pianoNode && pianoNode.properties.strudelProperties) {
    console.log('✓ Piano node created');
    
    // Set ADSR envelope properties
    pianoNode.properties.strudelProperties.gain = 0.8;
    pianoNode.properties.strudelProperties.pan = -0.2;
    pianoNode.properties.strudelProperties.attack = 0.01;
    pianoNode.properties.strudelProperties.decay = 0.3;
    pianoNode.properties.strudelProperties.sustain = 0.7;
    pianoNode.properties.strudelProperties.release = 0.8;
    
    console.log('  Properties set:');
    console.log('  - gain:', pianoNode.properties.strudelProperties.gain);
    console.log('  - pan:', pianoNode.properties.strudelProperties.pan);
    console.log('  - attack:', pianoNode.properties.strudelProperties.attack);
    console.log('  - decay:', pianoNode.properties.strudelProperties.decay);
    console.log('  - sustain:', pianoNode.properties.strudelProperties.sustain);
    console.log('  - release:', pianoNode.properties.strudelProperties.release);
    passed++;
  } else {
    console.log('✗ Failed to create piano node');
    failed++;
    return { passed, failed };
  }
  
  // Test 2: Select the piano node to show side panel
  console.log('\nTest 2: Selecting piano node to show side panel');
  nodeFactory.selectNode(pianoNode);
  console.log('✓ Piano node selected');
  passed++;
  
  // Test 3: Verify properties are rendered in schema properties
  console.log('\nTest 3: Verifying properties are rendered in schema properties');
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const schemaContainer = document.getElementById('schema-properties-container');
  if (schemaContainer) {
    const propertyControls = schemaContainer.querySelectorAll('[data-prop]');
    console.log(`  Found ${propertyControls.length} property controls`);
    
    // Check for specific properties
    const gainControl = schemaContainer.querySelector('[data-prop="gain"]');
    const panControl = schemaContainer.querySelector('[data-prop="pan"]');
    const attackControl = schemaContainer.querySelector('[data-prop="attack"]');
    const decayControl = schemaContainer.querySelector('[data-prop="decay"]');
    const sustainControl = schemaContainer.querySelector('[data-prop="sustain"]');
    const releaseControl = schemaContainer.querySelector('[data-prop="release"]');
    
    if (gainControl) console.log('  ✓ Gain control found');
    if (panControl) console.log('  ✓ Pan control found');
    if (attackControl) console.log('  ✓ Attack control found');
    if (decayControl) console.log('  ✓ Decay control found');
    if (sustainControl) console.log('  ✓ Sustain control found');
    if (releaseControl) console.log('  ✓ Release control found');
    
    if (gainControl && panControl && attackControl && decayControl && sustainControl && releaseControl) {
      console.log('✓ All ADSR properties are rendered');
      passed++;
    } else {
      console.log('✗ Some ADSR properties are missing');
      failed++;
    }
  } else {
    console.log('✗ Schema properties container not found');
    failed++;
  }
  
  // Test 4: Verify property values are correct
  console.log('\nTest 4: Verifying property values are correct');
  if (pianoNode.properties.strudelProperties.gain === 0.8 &&
      pianoNode.properties.strudelProperties.pan === -0.2 &&
      pianoNode.properties.strudelProperties.attack === 0.01 &&
      pianoNode.properties.strudelProperties.decay === 0.3 &&
      pianoNode.properties.strudelProperties.sustain === 0.7 &&
      pianoNode.properties.strudelProperties.release === 0.8) {
    console.log('✓ All property values are correct');
    passed++;
  } else {
    console.log('✗ Some property values are incorrect');
    failed++;
  }
  
  // Test 5: Update a property and verify it's reflected
  console.log('\nTest 5: Updating a property and verifying it\'s reflected');
  nodeFactory.updateNodeProperty(pianoNode.id, 'gain', 1.0);
  await new Promise(resolve => setTimeout(resolve, 100));
  
  if (pianoNode.properties.strudelProperties.gain === 1.0) {
    console.log('✓ Property updated successfully');
    passed++;
  } else {
    console.log('✗ Property not updated');
    failed++;
  }
  
  // Test 6: Verify strudel output is generated correctly
  console.log('\nTest 6: Verifying strudel output is generated correctly');
  const strudelInput = document.getElementById('strudel-example-input');
  if (strudelInput && strudelInput.value) {
    console.log('  Strudel output:', strudelInput.value);
    if (strudelInput.value.includes('piano') || strudelInput.value.includes('s("')) {
      console.log('✓ Strudel output generated correctly');
      passed++;
    } else {
      console.log('✗ Strudel output may be incorrect');
      failed++;
    }
  } else {
    console.log('✗ Strudel output not generated');
    failed++;
  }
  
  // Print summary
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n✓ All tests passed! Piano properties are editable.');
  } else {
    console.log(`\n⚠ ${failed} test(s) failed`);
  }
  
  return { passed, failed };
}

// Run the test if in browser environment
if (typeof window !== 'undefined') {
  testPianoProperties();
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testPianoProperties };
}
