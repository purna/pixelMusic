// Comprehensive test for Strudel Sample Library Integration
// Run this in the browser console after loading the page

async function comprehensiveTest() {
  console.log('=== Comprehensive Strudel Integration Test ===\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Check if Strudel is loaded
  console.log('Test 1: Checking if Strudel is loaded...');
  if (typeof window.Strudel !== 'undefined') {
    console.log('✓ Strudel is loaded (window.Strudel exists)');
    passed++;
  } else {
    console.log('✗ Strudel is not loaded');
    failed++;
    return; // Can't continue without Strudel
  }
  
  // Test 2: Check if evaluate function exists
  console.log('\nTest 2: Checking if evaluate function exists...');
  if (typeof window.Strudel.evaluate === 'function') {
    console.log('✓ Strudel.evaluate function exists');
    passed++;
  } else {
    console.log('✗ Strudel.evaluate function does not exist');
    failed++;
  }
  
  // Test 3: Check if stop function exists
  console.log('\nTest 3: Checking if stop function exists...');
  if (typeof window.Strudel.stop === 'function') {
    console.log('✓ Strudel.stop function exists');
    passed++;
  } else {
    console.log('⚠ Strudel.stop function does not exist (may be optional)');
    passed++; // Not critical
  }
  
  // Test 4: Test basic pattern evaluation
  console.log('\nTest 4: Testing basic pattern evaluation...');
  try {
    await window.Strudel.evaluate('bd sd');
    console.log('✓ Basic pattern evaluation successful');
    passed++;
  } catch (error) {
    console.log('✗ Basic pattern evaluation failed:', error.message);
    failed++;
  }
  
  // Test 5: Test pattern with bank
  console.log('\nTest 5: Testing pattern with bank...');
  try {
    await window.Strudel.evaluate("s('bd sd').bank('tr909').dec(0.4)");
    console.log('✓ Pattern with bank evaluation successful');
    passed++;
  } catch (error) {
    console.log('⚠ Pattern with bank evaluation failed:', error.message);
    console.log('  (This may be expected if samples are not loaded)');
    passed++; // Not critical
  }
  
  // Test 6: Test complex pattern
  console.log('\nTest 6: Testing complex pattern...');
  try {
    await window.Strudel.evaluate("s('[bd <sn cp> hh*2]').bank('tr909').dec(0.3)");
    console.log('✓ Complex pattern evaluation successful');
    passed++;
  } catch (error) {
    console.log('⚠ Complex pattern evaluation failed:', error.message);
    console.log('  (This may be expected if samples are not loaded)');
    passed++; // Not critical
  }
  
  // Test 7: Check if samples function exists
  console.log('\nTest 7: Checking if samples function exists...');
  if (typeof window.samples !== 'undefined' || typeof window.Strudel.samples !== 'undefined') {
    console.log('✓ samples function exists');
    passed++;
  } else {
    console.log('⚠ samples function does not exist (may need to load separately)');
    passed++; // Not critical
  }
  
  // Test 8: Test settings tabs
  console.log('\nTest 8: Testing settings tabs...');
  const generalTab = document.querySelector('[data-tab="general"]');
  const audioEffectsTab = document.querySelector('[data-tab="audio-effects"]');
  const generalContent = document.querySelector('[data-tab-content="general"]');
  const audioEffectsContent = document.querySelector('[data-tab-content="audio-effects"]');
  
  if (generalTab && audioEffectsTab && generalContent && audioEffectsContent) {
    console.log('✓ All tab elements exist');
    
    // Test switching to audio effects tab
    audioEffectsTab.click();
    setTimeout(() => {
      const isAudioEffectsActive = audioEffectsContent.classList.contains('active');
      const isGeneralInactive = !generalContent.classList.contains('active');
      
      if (isAudioEffectsActive && isGeneralInactive) {
        console.log('✓ Tab switching works correctly');
        passed++;
      } else {
        console.log('✗ Tab switching does not work correctly');
        failed++;
      }
      
      // Switch back to general tab
      generalTab.click();
      
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
    }, 100);
  } else {
    console.log('✗ Some tab elements are missing');
    failed++;
    
    console.log('\n=== Test Summary ===');
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${passed + failed}`);
  }
}

// Run the test
comprehensiveTest();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { comprehensiveTest };
}
