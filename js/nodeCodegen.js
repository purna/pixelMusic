/**
 * nodeCodegen.js
 * Turns one node into Strudel code, driven entirely by the `codegen` rules in
 * nodes/strudel-node-schema.json plus the property definitions in the other
 * schema files.
 *
 * NodeCodegen answers two questions per node:
 *   emit(node)  -> { code, kind }
 *     kind 'source'   a complete pattern such as s('bd')
 *     kind 'fragment' a chainable fragment such as .lpf(800)
 *     kind 'combinator' the node combines its children, handled by the caller
 *   resolve(node) -> the rule that was used (for validation and debugging)
 *
 * Adding a node type is a JSON change: give it a category with a rule, or add a
 * `codegen.types` entry for the unusual ones.
 */

class NodeCodegen {
    constructor(schemas = {}, options = {}) {
        this.nodeSchema = NodeCodegen.foldNodeDefinitions(schemas.nodeSchema);
        this.propertySchema = schemas.propertySchema || null;
        this.controlNodesSchema = schemas.controlNodesSchema || null;
        this.patternCombinatorsSchema = schemas.patternCombinatorsSchema || null;
        this.patternFunctionsSchema = schemas.patternFunctionsSchema || null;
        this.rules = this.nodeSchema?.codegen || { categories: {}, types: {} };
        this.properties = (typeof NodeProperties !== 'undefined') ? NodeProperties : null;
        this.signatureLookup = options.signatureLookup || (() => null);
        this.miniNotation = options.miniNotation || (value => value);
    }

    /* ------------------------------------------------------------------ *
     * Rule lookup
     * ------------------------------------------------------------------ */

    nodeDefinition(nodeType) {
        return this.nodeSchema?.nodes?.[nodeType] || null;
    }

    categoryOf(nodeType) {
        const fromNodeSchema = this.nodeDefinition(nodeType)?.category;
        if (fromNodeSchema) return fromNodeSchema;
        if (this.properties) {
            const definition = this.properties.definitionFor({
                nodeSchema: this.nodeSchema,
                propertySchema: this.propertySchema,
                controlNodesSchema: this.controlNodesSchema,
                patternCombinatorsSchema: this.patternCombinatorsSchema,
                patternFunctionsSchema: this.patternFunctionsSchema
            }, nodeType);
            if (definition?.category) return definition.category;
        }
        return null;
    }

    /** The rule that applies to a node type, or null when nothing matches. */
    ruleFor(nodeType) {
        const explicit = this.rules?.types?.[nodeType];
        if (explicit) return explicit;

        const category = this.categoryOf(nodeType);
        if (category && this.rules?.categories?.[category]) {
            return { ...this.rules.categories[category], category };
        }
        return null;
    }

    /* ------------------------------------------------------------------ *
     * Emission
     * ------------------------------------------------------------------ */

    emit(node) {
        const rule = this.ruleFor(node.type);
        if (!rule) {
            console.warn(`No codegen rule for node type "${node.type}"`);
            return { code: '', kind: 'none', rule: null };
        }

        const methodName = this.resolveMethodName(node, rule);
        const properties = this.propertyDefinitions(node, rule, methodName);

        switch (rule.kind) {
            case 'source':
                return { code: this.emitSource(node, properties), kind: 'source', rule, methodName };
            case 'method':
                return { code: this.emitMethod(node, rule, methodName, properties), kind: 'fragment', rule, methodName };
            case 'signal':
                return { code: this.emitSignal(node, rule, properties), kind: 'source', rule, methodName };
            case 'multiplier':
                return { code: this.emitMultiplier(node, rule), kind: 'fragment', rule, methodName };
            case 'probability':
                return { code: this.emitProbability(node, rule, properties), kind: 'fragment', rule, methodName };
            case 'combinator':
                return { code: '', kind: 'combinator', rule, combinator: this.resolveCombinator(node, rule) };
            default:
                console.warn(`Unknown codegen kind "${rule.kind}" for node type "${node.type}"`);
                return { code: '', kind: 'none', rule };
        }
    }

    /** Property definitions for this node, plus those of its resolved method. */
    propertyDefinitions(node, rule, methodName) {
        if (!this.properties) return {};
        return this.properties.collect({
            nodeSchema: this.nodeSchema,
            propertySchema: this.propertySchema,
            controlNodesSchema: this.controlNodesSchema,
            patternCombinatorsSchema: this.patternCombinatorsSchema,
            patternFunctionsSchema: this.patternFunctionsSchema
        }, node.type, methodName);
    }

    /**
     * strudel-node-schema.json has accumulated node definitions at the top level
     * next to the "nodes" map. Fold any definition-shaped entry into nodes so a
     * single misplaced brace cannot hide half the node library.
     */
    static foldNodeDefinitions(schema) {
        if (!schema || typeof schema !== 'object') return schema || null;

        const reserved = new Set([
            'schemaVersion', 'description', 'socketTypes', 'executionStages',
            'nodes', 'codegen', 'socketCompatibilityMatrix', 'validationRules'
        ]);
        schema.nodes = schema.nodes && typeof schema.nodes === 'object' ? schema.nodes : {};

        let folded = 0;
        Object.keys(schema).forEach(key => {
            if (reserved.has(key)) return;
            const value = schema[key];
            if (!value || typeof value !== 'object') return;
            if (!value.sockets && !value.properties && !value.label) return;
            if (!schema.nodes[key]) schema.nodes[key] = value;
            delete schema[key];
            folded += 1;
        });

        if (folded) {
            console.warn(`strudel-node-schema.json: recovered ${folded} node definition(s) from the top level`);
        }
        return schema;
    }

    props(node) {
        return node.properties?.strudelProperties || {};
    }

    /** Method name for a `.method(...)` node. */
    resolveMethodName(node, rule) {
        const mapped = this.methodOverride(node, rule);
        if (mapped?.method) return mapped.method;

        if (rule.method) return rule.method;
        if (rule.methodFrom === 'instrument' && node.instrument) return String(node.instrument).toLowerCase();

        const props = this.props(node);
        if (props.type) return String(props.type).toLowerCase();
        return String(node.type).toLowerCase();
    }

    methodOverride(node, rule) {
        const map = rule.methodMap;
        if (!map) return null;
        const key = String(node.instrument || this.props(node).type || node.type).toLowerCase();
        const direct = map[key];
        if (direct) return direct;
        const match = Object.keys(map).find(name => name.toLowerCase() === key);
        return match ? map[match] : null;
    }

    resolveCombinator(node, rule) {
        const map = rule.combinatorMap;
        if (rule.combinatorFrom === 'instrument' && map) {
            const key = String(node.instrument || '');
            if (map[key]) return map[key];
            const match = Object.keys(map).find(name => name.toLowerCase() === key.toLowerCase());
            if (match) return map[match];
        }
        return rule.combinator || 'stack';
    }

    /* ------------------------------------------------------------------ *
     * Emitters
     * ------------------------------------------------------------------ */

    /**
     * Sound/note source. Uses the instrument menu signature when the instrument
     * is known (s('{value}')), otherwise the node's sound/note/pattern property.
     */
    emitSource(node, properties) {
        const props = this.props(node);
        const signatureInfo = this.signatureLookup(node.instrument);

        let base = '';
        if (signatureInfo && signatureInfo.signature) {
            const value = props[signatureInfo.property] ?? node.instrument;
            base = signatureInfo.signature.replace('{value}', value);
        } else if (node.properties?.note) {
            base = `note("${this.miniNotation(node.properties.note)}")`;
        } else if (props.pattern !== undefined && props.pattern !== '') {
            const call = this.sourceCallFor(node);
            base = `${call}("${this.miniNotation(props.pattern)}")`;
        } else if (props.notes !== undefined && props.notes !== '') {
            base = `note("${this.miniNotation(props.notes)}")`;
        } else {
            const sound = props.sound || props.symbol || props.synth || node.instrument || 'bd';
            const call = this.sourceCallFor(node);
            base = `${call}("${this.miniNotation(sound)}")`;
        }

        return this.applyInstrumentProperties(base, node, properties);
    }

    sourceCallFor(node) {
        const type = String(node.type).toLowerCase();
        if (type === 'note') return 'note';
        if (type === 's' || type === 'soundpattern' || type === 'soundsynth') return 's';
        return 's';
    }

    /** Append the .gain/.bank/ADSR/effect calls described by the properties. */
    applyInstrumentProperties(pattern, node, properties = {}) {
        const props = this.props(node);
        let result = pattern;

        const numeric = (value, method) => {
            if (value === undefined || value === null || value === '') return;
            const number = Number(value);
            if (!Number.isFinite(number)) return;
            result += `.${method}(${number})`;
        };

        numeric(props.n, 'n');
        numeric(props.gain, 'gain');
        numeric(props.pan, 'pan');
        if (props.bank) result += `.bank("${props.bank}")`;
        numeric(props.dec, 'dec');
        numeric(props.attack, 'attack');
        numeric(props.decay, 'decay');
        numeric(props.sustain, 'sustain');
        numeric(props.release, 'release');
        if (props.vowel) result += `.vowel()`;
        numeric(props.lpf, 'lpf');
        numeric(props.hpf, 'hpf');
        numeric(props.bpf, 'bpf');
        numeric(props.delay, 'delay');
        numeric(props.reverb, 'reverb');
        numeric(props.distort, 'distort');
        numeric(props.crush, 'crush');
        numeric(props.speed, 'speed');
        numeric(props.room, 'room');
        numeric(props.shape, 'shape');

        if (props.structure) result += `.struct("${props.structure}")`;
        if (props.mask) result += `.mask("${props.mask}")`;
        if (props.pulses !== undefined && props.steps !== undefined) {
            result += `.euclidean(${props.pulses}, ${props.steps})`;
        }
        numeric(props.slowFactor, 'slow');
        numeric(props.fastFactor, 'fast');

        return result;
    }

    /** `.lpf(800)` style fragment, with extra `.method(value)` calls. */
    emitMethod(node, rule, methodName, properties) {
        const override = this.methodOverride(node, rule);
        if (override?.value !== undefined) {
            return `.${override.method || methodName}(${override.value})`;
        }

        const args = this.collectArgs(node, rule, override, properties);
        const name = override?.method || methodName;
        let fragment = args.length ? `.${name}(${args.join(', ')})` : `.${name}()`;

        // Properties mapped to a leading-dot method become extra calls (.attack, .delayfb, ...).
        Object.entries({ ...properties, ...this.methodPropertyDefinitions(node, rule, name) }).forEach(([propName, def]) => {
            const mapsTo = String(def?.mapsTo || '');
            if (!mapsTo.startsWith('.')) return;
            const explicit = this.props(node)[propName];
            // Emit only values the user actually set; schema defaults would add noise.
            if (explicit === undefined || explicit === null || explicit === '') return;
            fragment += `.${mapsTo.slice(1)}(${this.formatValue(explicit, def)})`;
        });

        return fragment;
    }

    /** Argument list for a method, in `arg`, `arg1`, `arg2` order. */
    /** Properties declared by the method itself, ignoring the node's generic ones. */
    methodPropertyDefinitions(node, rule, methodName) {
        const result = this.lookupMethodDefinition(node, rule, methodName);
        return result.properties;
    }

    /**
     * A method definition, even an empty one, overrides the node's generic
     * properties: `.rev()` takes no argument even though Transform has `amount`.
     */
    lookupMethodDefinition(node, rule, methodName) {
        const empty = { found: false, properties: {}, args: [] };
        if (!this.properties || !methodName) return empty;

        const definitions = this.properties.definitionsFor({
            nodeSchema: this.nodeSchema,
            propertySchema: this.propertySchema,
            controlNodesSchema: this.controlNodesSchema,
            patternCombinatorsSchema: this.patternCombinatorsSchema,
            patternFunctionsSchema: this.patternFunctionsSchema
        }, methodName);

        if (!definitions.length) return empty;

        const properties = definitions.reduce((merged, definition) =>
            Object.assign(merged, this.properties.fromDefinition(definition)), {});

        // Definitions describe their arguments either with mapsTo or in the
        // signature template (`pattern.chop(slices)`), so read both.
        const signature = definitions.find(definition => definition.signature)?.signature || '';
        const args = this.argumentNamesFromSignature(signature);

        return { found: true, properties, args };
    }

    argumentNamesFromSignature(signature) {
        const call = String(signature || '').match(/\(([^)]*)\)/);
        if (!call) return [];
        return call[1]
            .split(',')
            .map(name => name.trim().replace(/^\{|\}$/g, ''))
            .filter(name => name && name !== 'children' && name !== 'args');
    }

    collectArgs(node, rule, override, properties) {
        const props = this.props(node);
        const declared = override?.args || rule.args;

        if (declared) {
            return declared
                .map(name => this.argValue(node, name, properties, rule))
                .filter(value => value !== null);
        }

        // A method's own definition decides which positional arguments exist, so
        // generic node properties (Transform.amount) cannot leak into `.rev()`.
        const methodName = this.resolveMethodName(node, rule);
        const method = this.lookupMethodDefinition(node, rule, methodName);
        const source = method.found ? method.properties : properties;

        const ordered = [];
        const declaredArgs = method.found && method.args.length ? method.args : null;

        if (declaredArgs) {
            declaredArgs.forEach((propName, index) => {
                const def = source[propName] || {};
                ordered.push({ order: String(index).padStart(2, '0'), propName, def });
            });
        } else {
            Object.entries(source).forEach(([propName, def]) => {
                const mapsTo = String(def?.mapsTo || '');
                if (mapsTo === 'arg' || mapsTo === 'arg1' || mapsTo === 'arg2' || mapsTo === 'arg3') {
                    ordered.push({ order: mapsTo, propName, def });
                }
            });
            ordered.sort((a, b) => a.order.localeCompare(b.order));
        }

        // Arguments declared by the method are positional: fill gaps with defaults.
        const filled = ordered.map(({ propName, def }) => {
            const value = props[propName] ?? def?.default;
            if (value === undefined || value === null || value === '') return null;
            return this.formatValue(value, def);
        });

        if (method.found) return filled;
        return filled.filter(value => value !== null);
    }

    argValue(node, propName, properties, rule) {
        const props = this.props(node);
        const def = properties[propName];
        const value = props[propName] ?? def?.default ?? rule.fallbackArg;
        if (value === undefined || value === null || value === '') return null;
        return this.formatValue(value, def);
    }

    /** Numbers stay raw, function-like strings stay raw, everything else is quoted. */
    formatValue(value, def) {
        if (typeof value === 'number') return String(value);
        if (typeof value === 'boolean') return String(value);

        const text = String(value).trim();
        if (/^-?\d+(\.\d+)?$/.test(text)) return text;
        if (text.includes('=>')) return text;
        return `"${text.replace(/"/g, '\\"')}"`;
    }

    /** Control-rate expression such as `sine` or `range(0, 1)`. */
    emitSignal(node, rule, properties) {
        const call = rule.call || (rule.callFrom === 'instrument' ? String(node.instrument || '').toLowerCase() : node.type);
        const args = (rule.args || [])
            .map(name => this.argValue(node, name, properties, rule))
            .filter(value => value !== null);

        return args.length ? `${call}(${args.join(', ')})` : String(call);
    }

    /** `*4` style repeats become `.fast(4)`, `*slow`/`*fast` map through the rule. */
    emitMultiplier(node, rule) {
        const props = this.props(node);
        const map = rule.multiplierMap || {};
        const key = String(node.instrument || props.type || '*');

        let factor = props.amount ?? map[key] ?? map['*'] ?? 4;
        const number = Number(factor);
        if (!Number.isFinite(number) || number === 0) {
            console.warn(`Invalid multiplier for ${node.type}: ${factor}`);
            return '';
        }
        return number < 1 ? `.slow(${1 / number})` : `.fast(${number})`;
    }

    /**
     * Probability wrapper. Without a transform to apply randomly, the honest
     * reading of "often/sometimes/rarely" is "keep this fraction of events", which
     * is Strudel's degradeBy(1 - p).
     */
    emitProbability(node, rule, properties) {
        const props = this.props(node);
        let probability = rule.probability;

        // The wrapper's usual chance is the fallback; an explicit value wins.
        const key = String(node.instrument || props.type || '').toLowerCase();
        if (rule.map && rule.map[key] !== undefined) probability = rule.map[key];

        if (rule.probabilityProp !== null) {
            const propName = rule.probabilityProp || 'probability';
            probability = props[propName] ?? properties[propName]?.default ?? probability;
        }

        const number = Number(probability);
        if (!Number.isFinite(number)) return '';
        const clamped = Math.min(1, Math.max(0, number));
        const drop = 1 - clamped;
        if (drop <= 0) return '';
        return `.degradeBy(${Number(drop.toFixed(3))})`;
    }

    /* ------------------------------------------------------------------ *
     * Validation
     * ------------------------------------------------------------------ */

    /**
     * Checks every node type the app can create (schema types plus the palette
     * types in the instrument menu) and reports types without a usable rule.
     */
    validate(paletteTypes = []) {
        const issues = [];
        const knownMapsTo = new Set([
            'arg', 'arg1', 'arg2', 'arg3', 'method', 'fn', 'active', 'groupMode',
            's', 'note', 'sound', '*'
        ]);

        const nodeTypes = new Set([...(this.nodeSchema?.nodes ? Object.keys(this.nodeSchema.nodes) : []), ...paletteTypes]);

        nodeTypes.forEach(type => {
            const rule = this.ruleFor(type);
            if (!rule) {
                issues.push(`node type "${type}" has no codegen rule`);
                return;
            }

            const fakeNode = { type, instrument: '', properties: { strudelProperties: {} } };
            try {
                const { kind } = this.emit(fakeNode);
                if (kind === 'none') issues.push(`node type "${type}" emitted no code`);
            } catch (error) {
                issues.push(`node type "${type}" threw while generating code: ${error.message}`);
            }
        });

        // Property definitions must use a mapsTo the generator understands.
        const collectProps = (properties, owner) => {
            Object.entries(properties || {}).forEach(([name, def]) => {
                const mapsTo = def?.mapsTo;
                if (!mapsTo) return;
                if (knownMapsTo.has(mapsTo) || mapsTo.startsWith('.')) return;
                // A bare identifier is a chained method name (e.g. "roomsize").
                if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(mapsTo)) return;
                issues.push(`${owner}.${name} uses unknown mapsTo "${mapsTo}"`);
            });
        };

        const sections = [
            ['nodeSchema.nodes', this.nodeSchema?.nodes],
            ['propertySchema.nodes', this.propertySchema?.nodes],
            ['propertySchema.transformNodes', this.propertySchema?.transformNodes],
            ['controlNodesSchema.controlNodes', this.controlNodesSchema?.controlNodes],
            ['patternCombinatorsSchema.combinators', this.patternCombinatorsSchema?.combinators],
            ['patternFunctionsSchema.constructors', this.patternFunctionsSchema?.constructors]
        ];

        sections.forEach(([label, group]) => {
            if (!group) return;
            Object.entries(group).forEach(([type, definition]) => {
                collectProps(definition?.properties, `${label}.${type}`);
                (definition?.sections || []).forEach(section => {
                    collectProps(section?.properties, `${label}.${type}.${section?.id || 'section'}`);
                });
            });
        });

        return issues;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NodeCodegen };
}

if (typeof window !== 'undefined') {
    window.NodeCodegen = NodeCodegen;
}
