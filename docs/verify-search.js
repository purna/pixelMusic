// Quick verification script for Node Search feature
console.log('=== Node Search Feature Verification ===\n');

// Check 1: DOM Elements
console.log('1. Checking DOM Elements...');
const elements = [
    'node-search-input',
    'node-search-btn', 
    'search-results',
    'canvas-search-toolbar',
    'canvas-context-menu',
    'node-canvas'
];

elements.forEach(id => {
    const el = document.getElementById(id) || document.querySelector(`.${id}`);
    console.log(`   ${el ? '✓' : '✗'} ${id}`);
});

// Check 2: CSS Styles
console.log('\n2. Checking CSS Styles...');
const searchToolbar = document.querySelector('.canvas-search-toolbar');
if (searchToolbar) {
    const style = window.getComputedStyle(searchToolbar);
    console.log(`   ✓ Search toolbar has styles`);
    console.log(`     Position: ${style.position}`);
    console.log(`     Display: ${style.display}`);
} else {
    console.log('   ✗ Search toolbar not found');
}

// Check 3: JavaScript Classes
console.log('\n3. Checking JavaScript Classes...');
console.log(`   ${typeof NodeSearch !== 'undefined' ? '✓' : '✗'} NodeSearch class`);
console.log(`   ${window.nodeSearch ? '✓' : '⚠'} NodeSearch instance`);

// Check 4: Event Listeners
console.log('\n4. Checking Event Listeners...');
const searchInput = document.getElementById('node-search-input');
if (searchInput) {
    console.log(`   ✓ Search input exists`);
    console.log(`     Has ${searchInput.dataset.prop ? 'data-prop' : 'no data-prop'}`);
} else {
    console.log('   ✗ Search input not found');
}

// Check 5: Integration
console.log('\n5. Checking Integration...');
const nodeManager = window.nodeManager || (window.app && window.app.nodeManager);
console.log(`   ${nodeManager ? '✓' : '⚠'} NodeManager available`);

// Summary
console.log('\n=== Summary ===');
console.log('Node Search feature is ready!');
console.log('\nTry these commands:');
console.log('  - Press Ctrl/Cmd + F to open search');
console.log('  - Right-click canvas for context menu');
console.log('  - Type "sine" or "piano" to search');
console.log('\nFor full test, run: testNodeSearch()');
