/**
 * nodeProperties.js
 * Single place that answers "which properties does this node type have?".
 *
 * Node definitions are spread across several schema files (node schema, property
 * schema, control nodes, combinators, pattern functions). The UI and the code
 * generator both read them through this module so a node type is described once,
 * in data, and cannot drift between the panel and the generated code.
 */

const NodeProperties = (() => {
    const SCHEMA_SOURCES = [
        { key: 'nodeSchema', section: 'nodes' },
        { key: 'propertySchema', section: 'nodes' },
        { key: 'propertySchema', section: 'transformNodes' },
        { key: 'controlNodesSchema', section: 'controlNodes' },
        { key: 'patternCombinatorsSchema', section: 'combinators' },
        { key: 'patternFunctionsSchema', section: 'constructors' }
    ];

    /** All property definitions declared for one schema entry. */
    function fromDefinition(definition) {
        const properties = {};
        if (!definition) return properties;

        const absorb = (list) => {
            if (!list || typeof list !== 'object') return;
            Object.entries(list).forEach(([name, def]) => {
                properties[name] = { ...(properties[name] || {}), ...(def || {}) };
            });
        };

        absorb(definition.properties);
        (definition.sections || []).forEach(section => absorb(section.properties));
        return properties;
    }

    /** Every definition registered for a node type, across all schema files. */
    function definitionsFor(schemas, nodeType) {
        const found = [];
        SCHEMA_SOURCES.forEach(({ key, section }) => {
            const definition = schemas?.[key]?.[section]?.[nodeType];
            if (definition) found.push(definition);
        });
        return found;
    }

    /**
     * Merged property definitions for a node type, optionally extended with the
     * definitions of a resolved method name (an "Effect" node storing `.lpf`
     * borrows the lpf property definitions).
     */
    function collect(schemas, nodeType, methodName) {
        const properties = {};
        const add = (type) => {
            if (!type) return;
            definitionsFor(schemas, type).forEach(definition => {
                Object.assign(properties, fromDefinition(definition));
            });
        };

        add(nodeType);
        if (methodName && methodName !== nodeType) add(methodName);
        return properties;
    }

    /** First definition that declares a category, used by the code generator. */
    function definitionFor(schemas, nodeType) {
        const definitions = definitionsFor(schemas, nodeType);
        return definitions.find(definition => definition.category) || definitions[0] || null;
    }

    return { collect, definitionsFor, definitionFor, fromDefinition };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NodeProperties };
}

if (typeof window !== 'undefined') {
    window.NodeProperties = NodeProperties;
}
