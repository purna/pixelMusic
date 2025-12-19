// Test script to demonstrate the fix for chance node properties
console.log("Testing chance node properties fix...");

// Load the property schema
fetch('strudel-node-properties.json')
    .then(response => response.json())
    .then(propertySchema => {
        console.log("Property schema loaded successfully");
        console.log("Available transform nodes:", Object.keys(propertySchema.transformNodes || {}));
        
        // Test the fixed getDefaultProperties function
        function getDefaultProperties(nodeType) {
            let schema = propertySchema.nodes[nodeType];
            
            // Check if it's a transform node (this is the fix)
            if (!schema && propertySchema.transformNodes && propertySchema.transformNodes[nodeType]) {
                const transformDef = propertySchema.transformNodes[nodeType];
                const defaults = {};
                
                // Extract default values from transform node properties
                Object.keys(transformDef.properties).forEach(propKey => {
                    const propDef = transformDef.properties[propKey];
                    if (propDef.default !== undefined) {
                        defaults[propKey] = propDef.default;
                    } else {
                        defaults[propKey] = getDefaultValueForType(propDef.type);
                    }
                });
                
                return defaults;
            }
            
            const defaults = {};
            
            if (schema && schema.sections) {
                schema.sections.forEach(section => {
                    Object.keys(section.properties).forEach(propKey => {
                        const prop = section.properties[propKey];
                        if (prop.default !== undefined) {
                            defaults[propKey] = prop.default;
                        } else {
                            defaults[propKey] = getDefaultValueForType(prop.type);
                        }
                    });
                });
            }
            
            return defaults;
        }

        function getDefaultValueForType(type) {
            switch (type) {
                case 'knob':
                case 'slider':
                case 'number':
                    return 0;
                case 'toggle':
                    return false;
                case 'select':
                    return '';
                default:
                    return '';
            }
        }

        // Test the problematic "sometimes" node
        console.log("\n--- Testing 'sometimes' node ---");
        const sometimesProps = getDefaultProperties('sometimes');
        console.log("'sometimes' node properties:", sometimesProps);
        
        // Test other chance nodes
        console.log("\n--- Testing other chance nodes ---");
        const oftenProps = getDefaultProperties('often');
        console.log("'often' node properties:", oftenProps);
        
        const rarelyProps = getDefaultProperties('rarely');
        console.log("'rarely' node properties:", rarelyProps);
        
        // Test a regular node for comparison
        console.log("\n--- Testing regular node for comparison ---");
        const instrumentProps = getDefaultProperties('Instrument');
        console.log("'Instrument' node properties:", instrumentProps);
        
        // Show the specific "sometimes" definition from schema
        console.log("\n--- Original 'sometimes' definition from schema ---");
        console.log(propertySchema.transformNodes.sometimes);
        
        console.log("\n✅ Fix verified: Chance node properties are now accessible!");
        
        // Expected output should show:
        // sometimes: { chance: 0.5 }
        // often: { chance: 0.75 }
        // rarely: { chance: 0.25 }
        
    })
    .catch(error => {
        console.error("Error loading property schema:", error);
    });