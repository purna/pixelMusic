# Fix Summary: Node Effects Display Issue

## Issue Description
When changing the 'node-instrument' (node type selector) in the side panel, the application was adding a new 'node-effects' div to the node rather than updating the existing one. This caused effects to accumulate visually on the node instead of being properly updated.

## Root Cause
In `js/nodes/NodeFactory.js`, the `updateNodeDisplay` method (line 288) was attempting to remove existing effects by selecting elements with the class `.property-value`:

```javascript
const existingEffects = nodeElement.querySelectorAll('.property-value');
```

However, the `renderNodeEffects` method generates HTML with a `<div class="node-effects">` container, not `.property-value` elements. The `.property-value` class is used elsewhere in the application (in the side panel for schema properties), but not for the node effects display.

This mismatch meant:
1. Old `.node-effects` divs were never removed
2. New `.node-effects` divs were added each time the node was updated
3. Effects accumulated visually on the node

## Solution
Changed line 288 in `js/nodes/NodeFactory.js` from:
```javascript
const existingEffects = nodeElement.querySelectorAll('.property-value');
```

to:
```javascript
const existingEffects = nodeElement.querySelectorAll('.node-effects');
```

This ensures that the old effects container is properly removed before adding the new one.

## Files Modified
- `js/nodes/NodeFactory.js` (line 288)

## Code Flow

### Before Fix:
1. User changes node instrument/type in side panel
2. `addSidePanelListeners` → instrument change handler calls `updateNodeDisplay`
3. `updateNodeDisplay` tries to remove `.property-value` elements (none exist)
4. `renderNodeEffects` generates new HTML with `.node-effects` div
5. New `.node-effects` div is added to node
6. **Result**: Old and new effects both visible (duplication)

### After Fix:
1. User changes node instrument/type in side panel
2. `addSidePanelListeners` → instrument change handler calls `updateNodeDisplay`
3. `updateNodeDisplay` removes `.node-effects` elements (old effects removed)
4. `renderNodeEffects` generates new HTML with `.node-effects` div
5. New `.node-effects` div is added to node
6. **Result**: Only new effects visible (correct behavior)

## Testing
The fix can be verified by:
1. Creating a node with effects (e.g., an instrument with gain/pan settings)
2. Changing the node's instrument/type via the side panel
3. Observing that the effects display updates correctly without duplication

## Additional Notes
- The `nodeManager.js` file has a separate `renderNodeEffects` implementation that correctly uses `.property-value` classes for its effects display - this is not affected by this fix
- The `.node-effects` and `.effect-tag` CSS classes currently have no specific styling, which is acceptable for this fix
- This fix only affects the hierarchical node system (NodeFactory), not the flat node system (NodeManager)
- A note input listener was already present in the working directory (lines 483-496) - this is a separate enhancement that complements the fix
