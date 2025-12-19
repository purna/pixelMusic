# Chance Node Properties Fix Summary

## Problem
The properties weren't appearing for chance nodes (like "sometimes", "often", "rarely") in the properties panel because these nodes are defined as transform nodes in the `transformNodes` section of the property schema, but the code was only looking in the `nodes` section.

## Root Cause
In `js/nodeManager.js`, the `getDefaultProperties()` and `updateNodeProperty()` methods only checked:
```javascript
const schema = this.propertySchema.nodes[nodeType];
```

But chance nodes like "sometimes" are defined in:
```javascript
this.propertySchema.transformNodes["sometimes"]
```

## Solution
Enhanced the property handling methods to check both locations:

### 1. Fixed `getDefaultProperties()` method
- Added fallback to check `transformNodes` when `nodes` lookup fails
- Extracts default values from transform node properties correctly
- Maintains backward compatibility with regular nodes

### 2. Fixed `updateNodeProperty()` method  
- Added transform node schema lookup for property type conversion
- Ensures proper handling of transform node properties during updates

### 3. Enhanced UI control mapping
- Probability properties (chance, probability) now use slider controls instead of number inputs
- More intuitive user experience for adjusting probability values

## Changes Made

### File: `js/nodeManager.js`

#### Method: `getDefaultProperties(nodeType)`
```javascript
// Before: Only checked this.propertySchema.nodes[nodeType]
// After: Added transform node fallback

let schema = this.propertySchema.nodes[nodeType];

// Check if it's a transform node (this is the fix)
if (!schema && this.propertySchema.transformNodes && this.propertySchema.transformNodes[nodeType]) {
    const transformDef = this.propertySchema.transformNodes[nodeType];
    const defaults = {};
    
    // Extract default values from transform node properties
    Object.keys(transformDef.properties).forEach(propKey => {
        const propDef = transformDef.properties[propKey];
        if (propDef.default !== undefined) {
            defaults[propKey] = propDef.default;
        } else {
            defaults[propKey] = this.getDefaultValueForType(propDef.type);
        }
    });
    
    return defaults;
}
```

#### Method: `updateNodeProperty(node, propKey, value, isCheckbox)`
```javascript
// Before: Only checked regular nodes
// After: Added transform node handling

let schema = this.propertySchema.nodes[targetNode.type];
let propSchema = null;

// Check if it's a transform node
if (!schema && this.propertySchema.transformNodes && this.propertySchema.transformNodes[targetNode.type]) {
    const transformDef = this.propertySchema.transformNodes[targetNode.type];
    propSchema = transformDef.properties[propKey];
} else if (schema && schema.sections) {
    schema.sections.forEach(section => {
        if (section.properties[propKey]) {
            propSchema = section.properties[propKey];
        }
    });
}
```

#### Method: `createTransformNodeSchema(transformType)`
```javascript
// Enhanced UI control mapping for better UX
if (propDef.type === 'number') {
    if (propKey === 'factor' || propKey === 'frequency' || propKey === 'rate') {
        uiType = 'knob';
    } else if (propKey === 'chance' || propKey === 'probability') {
        uiType = 'slider'; // Use slider for probability values
    }
}
```

## Expected Behavior After Fix
1. **"Sometimes" nodes** will show probability property as slider (0-1, step 0.01, default 0.5)
2. **"Often" nodes** will show probability property as slider (0-1, step 0.01, default 0.75)  
3. **"Rarely" nodes** will show probability property as slider (0-1, step 0.01, default 0.25)
4. All probability values are properly saved and loaded
5. Properties panel displays correctly for all transform nodes

## Schema Reference
The chance nodes are defined in `strudel-node-properties.json`:
```json
"sometimes": {
  "label": "Sometimes",
  "category": "probability", 
  "stage": "wrapper",
  "wraps": true,
  "properties": {
    "chance": {
      "type": "number",
      "label": "Probability",
      "min": 0,
      "max": 1, 
      "step": 0.01,
      "default": 0.5
    }
  }
}
```

## Testing
To verify the fix works:
1. Open the node editor
2. Create a "sometimes" node
3. Click on the node to select it
4. The properties panel should show:
   - Title: "Sometimes"
   - A slider control for "Probability" (0-1, default 0.5)
5. Adjusting the slider should update the node's probability value

## Backward Compatibility
The fix maintains full backward compatibility:
- Regular nodes (Instrument, DrumSymbol, etc.) continue to work unchanged
- All existing property schemas are preserved
- No breaking changes to the API or node creation process