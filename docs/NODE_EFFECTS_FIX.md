# Node Effects Fix - Technical Documentation

## Problem Description

When changing a node's instrument/type in the Pixel Music application, the `updateNodeDisplay` method in `NodeFactory.js` was not properly removing the old effects display before adding the new one. This caused effects to accumulate on the node instead of being updated.

## Root Cause

In `NodeFactory.js`, the `updateNodeDisplay` method (line 288) was using:
```javascript
const existingEffects = nodeElement.querySelectorAll('.property-value');
```

However, the `renderNodeEffects` method returns HTML with a `<div class="node-effects">` container, not `.property-value` elements. The `.property-value` class is used elsewhere in the application (in the side panel for schema properties), but not for node effects display.

This mismatch meant that:
1. Old `.node-effects` divs were never removed
2. New `.node-effects` divs were added each time the node was updated
3. Effects accumulated visually on the node

## Solution

Changed line 288 in `NodeFactory.js` from:
```javascript
const existingEffects = nodeElement.querySelectorAll('.property-value');
```

to:
```javascript
const existingEffects = nodeElement.querySelectorAll('.node-effects');
```

This ensures that the old effects container is properly removed before adding the new one.

## Code Flow

1. **Node Creation** (`renderNode` method, line 109):
   - Calls `${this.renderNodeEffects(node)}`
   - Returns HTML: `<div class="node-effects">...</div>`

2. **Node Update** (`updateNodeDisplay` method, lines 287-301):
   - **Before fix**: Removed `.property-value` elements (none existed)
   - **After fix**: Removes `.node-effects` elements (correctly removes old effects)
   - Calls `renderNodeEffects(node)` to generate new effects HTML
   - Inserts new effects before the child port

## Files Modified

- `js/nodes/NodeFactory.js` (line 288)

## Testing

The fix can be tested by:
1. Creating a node with effects (e.g., an instrument with gain/pan settings)
2. Changing the node's instrument/type via the side panel
3. Verifying that the effects display updates correctly (no duplication)

## Related Code

- `NodeFactory.renderNodeEffects()` (lines 1158-1193): Generates effects HTML with `.node-effects` class
- `NodeFactory.updateNodeDisplay()` (lines 280-302): Updates node display, now correctly removes `.node-effects`
- `NodeFactory.addSidePanelListeners()` (lines 457-496): Handles instrument/type changes, calls `updateNodeDisplay`

## Notes

- The `nodeManager.js` file has a separate `renderNodeEffects` implementation that uses `.property-value` classes, which is correct for its use case
- The `.node-effects` and `.effect-tag` CSS classes currently have no specific styling, which is acceptable for this fix
- This fix only affects the hierarchical node system (NodeFactory), not the flat node system (NodeManager)
