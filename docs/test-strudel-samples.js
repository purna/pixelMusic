// Test script to verify Strudel sample library integration
// This script can be run in the browser console to test the sample loading

async function testStrudelSamples() {
  console.log('Testing Strudel Sample Library Integration...\n');
  
  // Test 1: Check if Strudel is available
  console.log('Test 1: Checking if Strudel is available...');
  if (typeof strudel !== 'undefined') {
    console.log('✓ Strudel is available');
  } else {
    console.log('✗ Strudel is not available');
    return;
  }
  
  // Test 2: Check if samples function is available
  console.log('\nTest 2: Checking if samples function is available...');
  if (typeof samples !== 'undefined') {
    console.log('✓ samples function is available');
  } else if (strudel && typeof strudel.samples !== 'undefined') {
    console.log('✓ strudel.samples function is available');
  } else {
    console.log('✗ samples function is not available');
    return;
  }
  
  // Test 3: Load Dirt Samples
  console.log('\nTest 3: Loading Dirt Samples...');
  try {
    const samplesFunc = samples || strudel.samples;
    await samplesFunc('github:tidalcycles/dirt-samples');
    console.log('✓ Dirt Samples loaded successfully');
  } catch (error) {
    console.log('✗ Failed to load Dirt Samples:', error.message);
  }
  
  // Test 4: Test playing a simple pattern
  console.log('\nTest 4: Testing pattern playback...');
  try {
    if (typeof strudel === 'function') {
      strudel('bd sd');
      console.log('✓ Pattern played successfully');
    } else {
      console.log('✗ strudel is not a function');
    }
  } catch (error) {
    console.log('✗ Failed to play pattern:', error.message);
  }
  
  // Test 5: Test with drum bank
  console.log('\nTest 5: Testing with drum bank...');
  try {
    if (typeof strudel === 'function') {
      strudel('bd sd').bank('tr909').dec(0.4);
      console.log('✓ Pattern with bank played successfully');
    } else {
      console.log('✗ strudel is not a function');
    }
  } catch (error) {
    console.log('✗ Failed to play pattern with bank:', error.message);
  }
  
  console.log('\n=== Test Complete ===');
}

// Run the test
testStrudelSamples();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testStrudelSamples };
}
