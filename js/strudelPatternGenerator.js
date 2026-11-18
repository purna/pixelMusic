/**
 * strudelPatternGenerator.js
 * Turns the node graph into Strudel code.
 *
 * Responsibilities split:
 *   - NodeCodegen (js/nodeCodegen.js) decides what a *single node* emits, using
 *     the `codegen` rules in nodes/strudel-node-schema.json.
 *   - This class walks the graph (inputs, cycles, child levels), composes the
 *     fragments into a program, and turns pasted patterns back into nodes.
 *
 * There is deliberately no per-node-type branching in this file.
 */

class StrudelPatternGenerator {
    constructor(nodeManager) {
        this.nodeManager = nodeManager;
        this.miniNotationSchema = null;
        this.patternCombinatorsSchema = null;
        this.patternFunctionsSchema = null;
        this.propertySchema = null;
        this.controlNodesSchema = null;
        this.nodeSchema = null;
        this.codegen = null;
    }

    initSchemas(schemas) {
        this.miniNotationSchema = schemas.miniNotationSchema || null;
        this.patternCombinatorsSchema = schemas.patternCombinatorsSchema || null;
        this.patternFunctionsSchema = schemas.patternFunctionsSchema || null;
        this.propertySchema = schemas.propertySchema || null;
        this.controlNodesSchema = schemas.controlNodesSchema || null;
        this.nodeSchema = schemas.nodeSchema || null;

        this.codegen = new NodeCodegen(schemas, {
            signatureLookup: name => this.nodeManager?.getInstrumentSignatureInfo?.(name) || null,
            miniNotation: value => this.parseMiniNotation(value)
        });
    }

    init() {
        // The pattern field is filled from the graph (NodeManager.updateStrudelOutput)
        // and only turned into nodes by an explicit action ("Build Nodes"), so typing
        // in it never destroys the current graph.
        console.log('Strudel Pattern Generator ready');
    }

    /* ------------------------------------------------------------------ *
     * Graph traversal
     * ------------------------------------------------------------------ */

    /** Nodes wired into this node's input port(s). */
    getConnectedNodes(node) {
        const connections = this.nodeManager?.connections?.connections || [];
        const nodes = this.nodeManager?.nodes || [];

        return connections
            .filter(conn => conn.targetNodeId === node.id && String(conn.targetPort || '').startsWith('input'))
            .map(conn => {
                const sourceNode = nodes.find(candidate => candidate.id === conn.sourceNodeId);
                return { node: sourceNode, connection: conn };
            })
            .filter(item => item.node);
    }

    /**
     * Build the pattern for a node and everything feeding into it.
     * `chain` guards against cycles.
     */
    generatePatternFromNode(node, chain = []) {
        if (!node || !this.codegen) return '';

        if (chain.includes(node.id)) {
            console.warn('Cycle detected in node graph at', node.id);
            return '';
        }
        const path = [...chain, node.id];

        const generated = this.codegen.emit(node);
        const kind = generated.kind;

        if (kind === 'combinator') {
            return this.buildCombinatorExpression(node, generated.combinator);
        }
        if (kind === 'none' || !generated.code) {
            return this.buildPatternFunctionExpression(node);
        }

        const upstream = this.getConnectedNodes(node)
            .map(connected => this.generatePatternFromNode(connected.node, path))
            .filter(code => code && code.trim());

        if (!upstream.length) {
            // A bare fragment (disconnected effect/transform) is not valid
            // Strudel on its own; leave it out rather than emitting `.lpf(500)`.
            if (kind === 'fragment') {
                console.warn(`${node.type} has no input to transform; skipping`);
                return '';
            }
            return generated.code;
        }

        const base = upstream.length === 1 ? upstream[0] : `stack(${upstream.join(', ')})`;

        if (kind === 'fragment') {
            if (generated.code.startsWith('.')) return `${base}${generated.code}`;
            // Function-style fragments take the upstream pattern as last argument.
            return `${generated.code.replace(/\)$/, `, ${base})`)}`;
        }

        // A source already defines its own sound, so layering an incoming pattern
        // on top of it would double-trigger events.
        console.warn(`${node.type} defines its own pattern; its input connection is ignored`);
        return generated.code;
    }

    /** The pattern for one node only (children included), without its inputs. */
    buildNodePattern(node) {
        if (!node) return '';

        if (node.children && node.children.length) {
            return this.buildHierarchicalPattern(node);
        }
        if (!this.codegen) return '';

        const generated = this.codegen.emit(node);
        if (generated.kind === 'combinator') {
            return this.buildCombinatorExpression(node, generated.combinator);
        }
        if (generated.code) return generated.code;

        return this.buildPatternFunctionExpression(node);
    }

    /* ------------------------------------------------------------------ *
     * Combinators and pattern functions (templates from their own schemas)
     * ------------------------------------------------------------------ */

    /** `stack(children)`, `cat(children)` … driven by the codegen rule. */
    buildCombinatorExpression(node, combinatorName) {
        const children = this.getConnectedNodes(node)
            .map(connected => this.generatePatternFromNode(connected.node))
            .filter(code => code && code.trim());

        if (!children.length) {
            console.warn(`${node.type} has no connected inputs; nothing to combine`);
            return '';
        }

        const name = ({ seq: 'cat', sequence: 'cat', slowcat: 'cat' })[combinatorName] || combinatorName || 'stack';
        const combined = `${name}(${children.join(', ')})`;
        return this.codegen.applyInstrumentProperties(combined, node);
    }

    /** Fallback for constructors that only exist in the pattern-functions schema. */
    buildPatternFunctionExpression(node) {
        if (!this.patternFunctionsSchema?.constructors?.[node.type]) return '';
        return this.buildPatternFunctionPattern(node);
    }

    buildCombinatorPatternWithChildren(combinatorNode, connectedNodes = []) {
        return this.buildCombinatorExpression(combinatorNode, this.codegen.resolveCombinator(
            combinatorNode,
            this.codegen.ruleFor(combinatorNode.type) || {}
        ));
    }

    /** Template-driven rendering from nodes/strudel-pattern-combinators.json. */
    buildCombinatorPattern(node) {
        const definition = this.patternCombinatorsSchema?.combinators?.[node.type];
        if (!definition?.serialization) return '';

        const props = node.properties?.strudelProperties || {};
        const { template = '' } = definition.serialization;

        return template
            .replace('{args}', '{children}')
            .replace(/\{(\w+)\}/g, (match, key) => {
                if (key === 'children') return match;
                if (!(key in props)) return match;
                return this.formatTemplateValue(props[key]);
            });
    }

    /** Template-driven rendering from nodes/strudel-pattern-functions.json. */
    buildPatternFunctionPattern(node) {
        const definition = this.patternFunctionsSchema?.constructors?.[node.type];
        if (!definition?.serialization) return '';

        const props = node.properties?.strudelProperties || {};
        const { template = '' } = definition.serialization;

        return template.replace(/\{(\w+)\}/g, (match, key) => {
            if (!(key in props)) return match;
            const value = props[key];
            const argDefinition = definition.arguments?.[key];
            const processed = argDefinition?.supportsMiniNotation && typeof value === 'string'
                ? this.parseMiniNotation(value)
                : value;
            return this.formatTemplateValue(processed);
        });
    }

    formatTemplateValue(value) {
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
        const text = String(value);
        if (/^-?\d+(\.\d+)?$/.test(text) || text.includes('=>')) return text;
        return `"${text.replace(/"/g, '\\"')}"`;
    }

    /* ------------------------------------------------------------------ *
     * Child levels (nodes with children rendered as mini-notation)
     * ------------------------------------------------------------------ */

    buildHierarchicalPattern(node) {
        const childNotation = this.buildChildPattern(node.children);
        if (!childNotation) return this.buildNodePattern({ ...node, children: [] });

        const base = this.buildNodePattern({ ...node, children: [] });

        if (!base || !base.startsWith('.')) {
            // A source node: the children become the mini-notation inside s()/note().
            const call = this.codegen?.sourceCallFor?.(node) || 's';
            return this.codegen
                ? this.codegen.applyInstrumentProperties(`${call}("${childNotation}")`, node)
                : `${call}("${childNotation}")`;
        }

        // An effect/transform with children applies to the children's pattern.
        return `s("${childNotation}")${base}`;
    }

    buildChildPattern(children) {
        if (!children || !children.length) return '';
        return this.groupChildrenByContainer(children)
            .map(group => this.generateGroupNotation(group))
            .join(' ');
    }

    groupChildrenByContainer(children) {
        const groups = [];
        let currentGroup = [];

        children.forEach(child => {
            if (child.containerType) {
                if (currentGroup.length) {
                    groups.push({ type: 'sequence', items: currentGroup });
                    currentGroup = [];
                }
                groups.push({ type: child.containerType, items: [child] });
            } else {
                currentGroup.push(child);
            }
        });

        if (currentGroup.length) groups.push({ type: 'sequence', items: currentGroup });
        return groups;
    }

    generateGroupNotation(group) {
        const content = group.items.map(item => this.getChildNotation(item)).join(' ');
        if (group.type === 'parallel') return `[${content}]`;
        if (group.type === 'random') return `<${content}>`;
        return content;
    }

    getChildNotation(child) {
        if (!child) return '~';
        if (child.type === 'rest') return '~';
        if (child.type === 'note') return child.properties?.note || child.instrument || '0';
        if (child.type === 'sound') return child.instrument || child.properties?.sound || 's';

        const sound = child.properties?.strudelProperties;
        return child.instrument || sound?.symbol || sound?.sound || child.type;
    }

    /* ------------------------------------------------------------------ *
     * Pattern -> nodes
     * ------------------------------------------------------------------ */

    parseAndCreateNodes(pattern) {
        this.nodeManager.clearAllNodes();

        try {
            const parsed = this.parseStrudelPattern(pattern);
            if (!parsed) {
                this.nodeManager.updateStatus('Pattern could not be parsed');
                return;
            }
            this.createNodesFromParsedPattern(parsed);
            this.nodeManager.updateStrudelOutput();
        } catch (error) {
            console.error('Error parsing pattern:', error);
            this.nodeManager.updateStatus('Error parsing pattern: ' + error.message);
        }
    }

    /** Recognises a few common Strudel shapes so a pasted pattern becomes nodes. */
    parseStrudelPattern(pattern) {
        const source = String(pattern || '').trim();
        if (!source) return null;

        const noteWithSound = source.match(/note\(['"]([^'"]+)['"]\)\.s(?:ound)?\(['"]([^'"]+)['"]\)/);
        if (noteWithSound) {
            return {
                type: 'noteWithInstrument',
                notes: noteWithSound[1].split(/\s+/).filter(Boolean),
                instrument: noteWithSound[2]
            };
        }

        const stacked = source.match(/^stack\((.*)\)$/s);
        if (stacked) {
            const parts = stacked[1].split(/,\s*(?=[a-z]+\()/i).filter(Boolean);
            return { type: 'stack', parts };
        }

        const sound = source.match(/s\(['"]([^'"]+)['"]\)/);
        if (sound) {
            return {
                type: 'sound',
                sounds: sound[1].split(/\s+/).filter(name => name && name !== '~')
            };
        }

        const note = source.match(/note\(['"]([^'"]+)['"]\)/);
        if (note) {
            return {
                type: 'noteWithInstrument',
                notes: note[1].split(/\s+/).filter(Boolean),
                instrument: null
            };
        }

        console.warn('Unsupported pattern shape:', source);
        return null;
    }

    createNodesFromParsedPattern(parsed) {
        const manager = this.nodeManager;

        if (parsed.type === 'noteWithInstrument') {
            const [firstNote, ...childNotes] = parsed.notes;
            if (!firstNote) return;

            const noteNode = manager.createNode('note', firstNote, 100, 100);
            if (noteNode?.properties) noteNode.properties.note = firstNote;

            childNotes.forEach((childNote, index) => {
                const childNode = manager.createNode('note', childNote, 100, 220 + index * 110);
                if (childNode?.properties) childNode.properties.note = childNote;
                if (!parsed.instrument) return;
                noteNode.children = noteNode.children || [];
                noteNode.children.push(childNode);
            });

            if (parsed.instrument) {
                const instrumentNode = manager.createNode('Instrument', parsed.instrument, 420, 100);
                if (instrumentNode?.properties) {
                    instrumentNode.properties.strudelProperties = { sound: parsed.instrument };
                }
                manager.createConnection(noteNode.id, 'output', instrumentNode.id, 'input');
                manager.updateNodeDisplay(noteNode);
                manager.updateNodeDisplay(instrumentNode);
            }
            return;
        }

        if (parsed.type === 'sound') {
            parsed.sounds.forEach((sound, index) => {
                manager.createNode('DrumSymbol', sound, 100 + index * 210, 100);
            });
            return;
        }

        if (parsed.type === 'stack') {
            const stackNode = manager.createNode('stack', 'stack', 120, 120);
            parsed.parts.forEach((part, index) => {
                const inner = this.parseStrudelPattern(part);
                if (!inner) return;
                const nodesBefore = manager.nodes.length;
                this.createNodesFromParsedPattern(inner);
                const created = manager.nodes.slice(nodesBefore);
                const terminal = created[created.length - 1];
                if (terminal && stackNode) {
                    manager.createConnection(terminal.id, 'output', stackNode.id, `input${index}`);
                }
            });
        }
    }

    /* ------------------------------------------------------------------ *
     * Mini-notation helpers
     * ------------------------------------------------------------------ */

    /** Warns about unbalanced mini-notation brackets and returns the text as-is. */
    parseMiniNotation(patternString) {
        const text = String(patternString ?? '');
        if (!this.miniNotationSchema) return text;

        const pairs = [['[', ']'], ['<', '>'], ['(', ')'], ['{', '}']];
        pairs.forEach(([open, close]) => {
            const opens = [...text].filter(char => char === open).length;
            const closes = [...text].filter(char => char === close).length;
            if (opens !== closes) {
                console.warn(`Unbalanced ${open}/${close} in mini-notation: ${text}`);
            }
        });

        return text;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StrudelPatternGenerator;
}
