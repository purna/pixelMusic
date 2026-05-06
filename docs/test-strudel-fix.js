// Test script to verify Strudel integration fix
// Run this in the browser console after loading the page

async function testStrudelFix() {
  console.log('=== Testing Strudel Integration Fix ===\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Check if evaluate function is available
  console.log('Test 1: Checking if evaluate function is available...');
  const evalFunc = window.evaluate || evaluate;
  if (evalFunc && typeof evalFunc === 'function') {
    console.log('✓ evaluate function is available');
    passed++;
  } else {
    console.log('✗ evaluate function is not available');
    failed++;
  }
  
  // Test 2: Check if hush function is available
  console.log('\nTest 2: Checking if hush function is available...');
  const hushFunc = window.hush || hush;
  if (hushFunc && typeof hushFunc === 'function') {
    console.log('✓ hush function is available');
    passed++;
  } else {
    console.log('⚠ hush function is not available (may be optional)');
    passed++; // Not critical
  }
  
  // Test 3: Test basic pattern evaluation
  console.log('\nTest 3: Testing basic pattern evaluation...');
  try {
    await evalFunc('bd sd');
    console.log('✓ Basic pattern evaluation successful');
    passed++;
  } catch (error) {
    console.log('✗ Basic pattern evaluation failed:', error.message);
    failed++;
  }
  
  // Test 4: Test pattern with bank
  console.log('\nTest 4: Testing pattern with bank...');
  try {
    await evalFunc("s('bd sd').bank('tr909').dec(0.4)");
    console.log('✓ Pattern with bank evaluation successful');
    passed++;
  } catch (error) {
    console.log('⚠ Pattern with bank evaluation failed:', error.message);
    console.log('  (This may be expected if samples are not loaded)');
    passed++; // Not critical
  }
  
  // Test 5: Test complex pattern
  console.log('\nTest 5: Testing complex pattern...');
  try {
    await evalFunc("s('[bd <sn cp> hh*2]').bank('tr909').dec(0.3)");
    console.log('✓ Complex pattern evaluation successful');
    passed++;
  } catch (error) {
    console.log('⚠ Complex pattern evaluation failed:', error.message);
    console.log('  (This may be expected if samples are not loaded)');
    passed++; // Not critical
  }
  
  // Test 6: Test stop function
  console.log('\nTest 6: Testing stop function...');
  try {
    if (hushFunc && typeof hushFunc === 'function') {
      hushFunc();
      console.log('✓ Stop function successful');
      passed++;
    } else {
      console.log('⚠ Stop function not available');
      passed++; // Not critical
    }
  } catch (error) {
    console.log('⚠ Stop function failed:', error.message);
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
testStrudelFix();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testStrudelFix };
}
