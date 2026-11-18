/**
 * Phase 1 smoke test: schema-driven code generation and project persistence.
 *
 * Runs the browser modules in a Node VM with tiny DOM stubs, so the pure logic
 * (codegen rules, graph composition, save/load) is covered without a browser.
 *
 *   node test/pattern-smoke.mjs
 */

import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = relativePath => JSON.parse(readFileSync(join(root, relativePath), 'utf8'));

/* ---------------------------------------------------------------------- *
 * Sandbox
 * ---------------------------------------------------------------------- */

function makeSandbox() {
    const storage = new Map();
    const document = {
        readyState: 'complete',
        visibilityState: 'visible',
        body: { appendChild() {} },
        getElementById: () => null,
        querySelectorAll: () => [],
        addEventListener: () => {},
        dispatchEvent: () => {},
        createElement: () => ({
            style: {},
            dataset: {},
            classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
            setAttribute() {},
            addEventListener() {},
            appendChild() {},
            remove() {},
            click() {}
        })
    };
    const sandbox = {
        console: { log() {}, warn() {}, error() {} },
        document,
        window: { addEventListener() {}, confirm: () => true },
        localStorage: {
            getItem: key => (storage.has(key) ? storage.get(key) : null),
            setItem: (key, value) => storage.set(key, String(value)),
            removeItem: key => storage.delete(key)
        },
        setInterval: () => 0,
        clearInterval: () => {},
        setTimeout: () => 0,
        CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
        Date, JSON, Math, Number, String, Set, Map, Array, Object
    };
    sandbox.globalThis = sandbox;
    sandbox.self = sandbox;
    return createContext(sandbox);
}

function loadModule(context, relativePath, className) {
    const source = readFileSync(join(root, relativePath), 'utf8');
    runInContext(`${source}\n;globalThis.__loaded = ${className};`, context, { filename: relativePath });
    const loaded = context.__loaded;
    assert.ok(loaded, `${className} was not defined by ${relativePath}`);
    return loaded;
}

let passed = 0;
function check(name, fn) {
    try {
        fn();
        passed += 1;
        console.log(`  ok   ${name}`);
    } catch (error) {
        console.error(`  FAIL ${name}\n       ${error.message}`);
        process.exitCode = 1;
    }
}

function group(name) {
    console.log(`\n${name}`);
}

/* ---------------------------------------------------------------------- *
 * Modules + schemas
 * ---------------------------------------------------------------------- */

const context = makeSandbox();
loadModule(context, 'js/nodeProperties.js', 'NodeProperties');
const NodeCodegen = loadModule(context, 'js/nodeCodegen.js', 'NodeCodegen');
const StrudelPatternGenerator = loadModule(context, 'js/strudelPatternGenerator.js', 'StrudelPatternGenerator');
const NodeProperties = context.window.NodeProperties || context.NodeProperties;
const ProjectManager = loadModule(context, 'js/projectManager.js', 'ProjectManager');

const schemas = {
    nodeSchema: readJson('nodes/strudel-node-schema.json'),
    propertySchema: readJson('nodes/strudel-node-properties.json'),
    controlNodesSchema: readJson('nodes/strudel-control-nodes.json'),
    patternCombinatorsSchema: readJson('nodes/strudel-pattern-combinators.json'),
    patternFunctionsSchema: readJson('nodes/strudel-pattern-functions.json'),
    miniNotationSchema: readJson('nodes/strudel-mini-notation.json')
};
const instrumentsMenu = readJson('nodes/strudel-node-instruments.json');

const signatureMap = new Map();
instrumentsMenu.menus.forEach(menu => {
    (menu.groups || []).forEach(g => {
        if (!g.signature || !g.property) return;
        (g.items || []).forEach(item => {
            const name = typeof item === 'string' ? item : (item.value ?? item.id);
            signatureMap.set(name, { signature: g.signature, property: g.property });
        });
    });
});

const paletteTypes = [];
instrumentsMenu.menus.forEach(menu => {
    (menu.groups || []).forEach(g => {
        if (g.nodeType) paletteTypes.push(g.nodeType);
    });
});

function makeNode(type, instrument = '', props = {}) {
    return {
        id: `n-${type}-${instrument}-${Math.random().toString(36).slice(2, 6)}`,
        type,
        instrument,
        x: 0,
        y: 0,
        properties: { note: '', effects: {}, strudelProperties: props }
    };
}

function connect(source, target, targetPort = 'input') {
    return { id: `c-${source.id}-${target.id}`, sourceNodeId: source.id, sourcePort: 'output', targetNodeId: target.id, targetPort };
}

function makeGenerator(nodes = [], connections = []) {
    const manager = {
        nodes,
        connections: { connections },
        getInstrumentSignatureInfo: name => signatureMap.get(name) || null,
        updateStatus() {}
    };
    const generator = new StrudelPatternGenerator(manager);
    generator.initSchemas(schemas);
    return generator;
}

function codeFor(nodes, connections, target) {
    return makeGenerator(nodes, connections).generatePatternFromNode(target);
}

function createCodegen() {
    return new NodeCodegen(schemas, {
        signatureLookup: name => signatureMap.get(name) || null,
        miniNotation: value => value
    });
}

/* ---------------------------------------------------------------------- *
 * Per-node code generation (rules in the schema)
 * ---------------------------------------------------------------------- */

group('node code generation');

check('source node uses the instrument menu signature', () => {
    const codegen = createCodegen();
    const node = makeNode('Instrument', 'piano', { sound: 'piano' });
    assert.match(codegen.emit(node).code, /^s\(['"]piano['"]\)/);
});

check('drum node applies its bank property', () => {
    const codegen = createCodegen();
    const node = makeNode('DrumSymbol', 'bd', { symbol: 'bd', bank: 'RolandTR909' });
    assert.equal(codegen.emit(node).code, `s('bd').bank("RolandTR909")`);
});

check('effect node takes its method and argument from the schema', () => {
    const codegen = createCodegen();
    const node = makeNode('Effect', 'lpf', { frequency: 800 });
    assert.equal(codegen.emit(node).code, '.lpf(800)');
    // The method definition decides which arguments exist.
    assert.equal(codegen.emit(makeNode('Effect', 'rev')).code, '.rev()');
});

check('transform node resolves the method from the palette value', () => {
    const codegen = createCodegen();
    assert.equal(codegen.emit(makeNode('Transform', 'rev')).code, '.rev()');
    assert.equal(codegen.emit(makeNode('Transform', 'shuffle', { seed: 3 })).code, '.shuffle(3)');
    assert.equal(codegen.emit(makeNode('Chop', 'chop', { amount: 8 })).code, '.chop(8)');
});

check('envelope properties become method calls', () => {
    const codegen = createCodegen();
    const code = codegen.emit(makeNode('Envelope', 'envelope', { attack: 0.1, sustain: 0.4 })).code;
    assert.match(code, /\.attack\(0\.1\)/);
    assert.match(code, /\.sustain\(0\.4\)/);
});

check('multiplier node becomes .fast/.slow', () => {
    const codegen = createCodegen();
    assert.equal(codegen.emit(makeNode('Repeater', '*', { amount: 4 })).code, '.fast(4)');
    assert.equal(codegen.emit(makeNode('Repeater', 'slow', {})).code, '.slow(2)');
});

check('probability wrapper becomes .degradeBy(1 - p)', () => {
    const codegen = createCodegen();
    assert.equal(codegen.emit(makeNode('Often', 'often', { probability: 0.75 })).code, '.degradeBy(0.25)');
    assert.equal(codegen.emit(makeNode('Chance', 'sometimes', { probability: 0.5 })).code, '.degradeBy(0.5)');
});

check('control nodes emit a signal expression', () => {
    const codegen = createCodegen();
    assert.equal(codegen.emit(makeNode('Range', 'range', { min: 0, max: 8 })).code, 'range(0, 8)');
    assert.equal(codegen.emit(makeNode('Random', 'rand')).code, 'rand');
    assert.equal(codegen.emit(makeNode('Generator', 'rand', { max: 8 })).code, 'rand(8)');
});

check('structural nodes resolve to a combinator', () => {
    const codegen = createCodegen();
    assert.equal(codegen.emit(makeNode('Group', '[ ]')).combinator, 'stack');
    assert.equal(codegen.emit(makeNode('Group', '< >')).combinator, 'cat');
    assert.equal(codegen.emit(makeNode('stack', 'cat')).combinator, 'cat');
    assert.equal(codegen.emit(makeNode('Stack', 'stack')).combinator, 'stack');
});

check('every schema node type has a codegen rule', () => {
    const codegen = createCodegen();
    const missing = Object.keys(schemas.nodeSchema.nodes)
        .filter(type => !codegen.ruleFor(type));
    assert.equal(JSON.stringify(missing), '[]', `no rule for: ${missing.join(', ')}`);
});

check('every palette node type has a codegen rule', () => {
    const codegen = createCodegen();
    const missing = [...new Set(paletteTypes)].filter(type => !codegen.ruleFor(type));
    assert.equal(JSON.stringify(missing), '[]', `no rule for: ${missing.join(', ')}`);
});

check('no node type falls back to a placeholder', () => {
    const codegen = createCodegen();
    const failures = [];
    Object.keys(schemas.nodeSchema.nodes).forEach(type => {
        let result;
        try {
            result = codegen.emit(makeNode(type, 'bd', { amount: 0.5, type: 'lpf' }));
        } catch (error) {
            failures.push(`${type}: threw ${error.message}`);
            return;
        }
        if (result.kind === 'none') failures.push(`${type}: no code`);
        const code = result.code || '';
        if (/\bundefined\b|\[object Object\]|\bNaN\b/.test(code)) failures.push(`${type}: ${code}`);
        if (code === type) failures.push(`${type}: fell through to the type name`);
    });
    assert.equal(JSON.stringify(failures), '[]', failures.join('\n'));
});

check('validate() reports no schema issues', () => {
    const issues = createCodegen().validate(paletteTypes);
    assert.equal(JSON.stringify(issues), '[]', issues.join('\n'));
});

/* ---------------------------------------------------------------------- *
 * Graph composition
 * ---------------------------------------------------------------------- */

group('graph composition');

check('single instrument', () => {
    const drum = makeNode('DrumSymbol', 'bd', { symbol: 'bd' });
    assert.match(codeFor([drum], [], drum), /^s\('bd'\)$/);
});

check('effect chains onto its input', () => {
    const drum = makeNode('DrumSymbol', 'bd', { symbol: 'bd' });
    const lowpass = makeNode('Effect', 'lpf', { frequency: 500 });
    assert.equal(codeFor([drum, lowpass], [connect(drum, lowpass)], lowpass), `s('bd').lpf(500)`);
});

check('two inputs stack before the effect is applied', () => {
    const bd = makeNode('DrumSymbol', 'bd', { symbol: 'bd' });
    const hh = makeNode('DrumSymbol', 'hh', { symbol: 'hh' });
    const lowpass = makeNode('Effect', 'lpf', { frequency: 500 });
    const connections = [connect(bd, lowpass), connect(hh, lowpass)];
    assert.equal(
        codeFor([bd, hh, lowpass], connections, lowpass),
        `stack(s('bd'), s('hh')).lpf(500)`
    );
});

check('multiplier is appended to the upstream pattern', () => {
    const bd = makeNode('DrumSymbol', 'bd', { symbol: 'bd' });
    const repeat = makeNode('Repeater', '*', { amount: 4 });
    assert.equal(codeFor([bd, repeat], [connect(bd, repeat)], repeat), `s('bd').fast(4)`);
});

check('combinator combines its children', () => {
    const bd = makeNode('DrumSymbol', 'bd', { symbol: 'bd' });
    const hh = makeNode('DrumSymbol', 'hh', { symbol: 'hh' });
    const stack = makeNode('stack', 'stack');
    const connections = [connect(bd, stack), connect(hh, stack)];
    assert.equal(codeFor([bd, hh, stack], connections, stack), `stack(s('bd'), s('hh'))`);
});

check('cat combinator sequences its children', () => {
    const bd = makeNode('DrumSymbol', 'bd', { symbol: 'bd' });
    const hh = makeNode('DrumSymbol', 'hh', { symbol: 'hh' });
    const cat = makeNode('stack', 'cat');
    const connections = [connect(bd, cat), connect(hh, cat)];
    assert.equal(codeFor([bd, hh, cat], connections, cat), `cat(s('bd'), s('hh'))`);
});

check('cycles do not recurse forever', () => {
    const a = makeNode('Effect', 'lpf', { frequency: 1 });
    const b = makeNode('Effect', 'hpf', { frequency: 1 });
    const code = codeFor([a, b], [connect(a, b), connect(b, a)], a);
    assert.equal(typeof code, 'string');
});

/* ---------------------------------------------------------------------- *
 * Property definitions (shared by the panel and the generator)
 * ---------------------------------------------------------------------- */

group('property definitions');

check('node properties are collected from every schema source', () => {
    const props = NodeProperties.collect(schemas, 'DrumSymbol');
    assert.ok(props.symbol, 'missing symbol');
    assert.ok(props.bank, 'missing bank');
});

check('effect nodes inherit the properties of their method', () => {
    const props = NodeProperties.collect(schemas, 'Effect', 'lpf');
    assert.ok(props.frequency, `unexpected properties: ${Object.keys(props)}`);
});

check('unknown node types have no properties instead of throwing', () => {
    const props = NodeProperties.collect(schemas, 'NotARealNode');
    assert.equal(Object.keys(props).length, 0);
});

/* ---------------------------------------------------------------------- *
 * Project persistence
 * ---------------------------------------------------------------------- */

group('project persistence');

function makeEditor() {
    const factory = {
        nodes: [],
        rootNodes: null,
        selectedNode: null,
        renderNode() {},
        hideSidePanel() {},
        updateDeleteButtonState() {},
        exitNodeLevel() {}
    };
    const manager = {
        factory,
        connections: {
            connections: [],
            clearAllConnections() { this.connections = []; },
            renderConnection() {}
        },
        currentLevel: { level: 0, parentNode: null, nodes: [] },
        previousLevel: null,
        updateStatus() {},
        updateStrudelOutput() {},
        updateBackButtonState() {},
        buildPlayablePattern: () => `s('bd')`,
        schemasReady: Promise.resolve()
    };
    return manager;
}

check('save/load round-trips nodes and connections', () => {
    const sourceEditor = makeEditor();
    const bd = makeNode('DrumSymbol', 'bd', { symbol: 'bd' });
    const lowpass = makeNode('Effect', 'lpf', { frequency: 500 });
    sourceEditor.factory.nodes.push(bd, lowpass);
    sourceEditor.connections.connections.push(connect(bd, lowpass));

    const saved = new ProjectManager(sourceEditor, { autosaveIntervalMs: 100000 }).serialize();
    assert.equal(saved.format, 'pixelmusic-project');

    const target = makeEditor();
    const count = new ProjectManager(target, { autosaveIntervalMs: 100000 }).applyProject(saved);
    assert.equal(count, 2);
    assert.deepEqual(JSON.parse(JSON.stringify(target.factory.nodes.map(n => n.id))), [bd.id, lowpass.id]);
    assert.equal(target.connections.connections.length, 1);
});

check('saving while editing children keeps the root graph', () => {
    const editor = makeEditor();
    const parent = makeNode('Instrument', 'piano', { sound: 'piano' });
    const child = makeNode('note', 'c4');
    parent.children = [child];
    editor.factory.nodes.push(parent);

    editor.factory.rootNodes = editor.factory.nodes;
    editor.factory.nodes = parent.children;
    editor.currentLevel = { level: 1, parentNode: parent, nodes: parent.children };

    const saved = new ProjectManager(editor, { autosaveIntervalMs: 100000 }).serialize();
    assert.equal(saved.nodes.length, 1);
    assert.equal(saved.nodes[0].children[0].id, child.id);
});

check('invalid projects are rejected with a clear message', () => {
    const pm = new ProjectManager(makeEditor(), { autosaveIntervalMs: 100000 });
    assert.throws(() => pm.applyProject({ nodes: 'nope' }), /no "nodes" list/);
    assert.throws(() => pm.applyProject({ format: 'other', nodes: [] }), /Unsupported project format/);
    assert.throws(() => pm.applyProject({ nodes: [] }), /any usable nodes/);
});

check('connections to missing nodes are dropped', () => {
    const editor = makeEditor();
    const bd = makeNode('DrumSymbol', 'bd', { symbol: 'bd' });
    new ProjectManager(editor, { autosaveIntervalMs: 100000 }).applyProject({
        nodes: [bd],
        connections: [{ id: 'x', sourceNodeId: bd.id, targetNodeId: 'ghost', sourcePort: 'output', targetPort: 'input' }]
    });
    assert.equal(editor.connections.connections.length, 0);
});

check('autosave is restored after a reload', () => {
    const first = makeEditor();
    first.factory.nodes.push(makeNode('DrumSymbol', 'bd', { symbol: 'bd' }));
    new ProjectManager(first, { autosaveIntervalMs: 100000 }).autosave();

    const reloaded = makeEditor();
    assert.equal(new ProjectManager(reloaded, { autosaveIntervalMs: 100000 }).restoreAutosave(), true);
    assert.equal(reloaded.factory.nodes.length, 1);
});

console.log(`\n${passed} check(s) passed`);
