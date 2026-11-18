# Pixel Music

A browser-based, node-graph music builder. You patch instrument, effect and
combinator nodes together on a canvas and the app compiles the graph into
[Strudel](https://strudel.cc) code, displays it, and plays it in the browser.

No build step: plain HTML, CSS and ES2020 JavaScript, served as static files.

## Running locally

The app fetches its node schemas from `nodes/*.json`, so it needs HTTP (not
`file://`):

```bash
python3 -m http.server 8899
# then open http://localhost:8899/index.html
```

Click **Enable Audio** once so the browser allows sound, click instruments in the
left palette to add nodes, then **Play All Nodes**.

## Using it

| Action | How |
| --- | --- |
| Add a node | Click an item in the instrument/pattern/effect palette, or drag it onto the canvas |
| Delete a node | Right-click it → **Delete Node** (also **Disconnect** and **Edit Children**) |
| Sample tune | Header **Sample Tune** loads a ready-made graph; click again for the next one |
| Connect nodes | Drag from a node's output port to another node's input port |
| Edit children | Double-click a node, `Esc` to go back |
| Play / stop | `Play All Nodes` / `Stop All` |
| See the code | The **Strudel Pattern Generator** field at the bottom always shows the generated code |
| Import a pattern | Type a Strudel pattern and press **Build Nodes** (replaces the canvas) |
| Save / load project | Header **Save** (`Cmd/Ctrl+S`) writes a `.json` file, **Load** (`Cmd/Ctrl+O`) restores one |
| Export | Header **Export** downloads the generated Strudel code as `.strudel` |
| Autosave | The graph is stored in `localStorage` every 5 seconds and restored on reload |
| Settings | Header **Settings**: tempo, canvas grid, and a master effect chain that is appended to the generated code |
| AI Create | Bottom-right button; asks the AI for a Strudel pattern and applies it |

## How it is put together

```
index.html            markup + script order
css/                  styles (styles.css, node.css, settings.css, modal.css, tutorials.css)
js/
  nodes/NodeManager.js       controller: schemas, events, status, graph -> code
  nodes/NodeFactory.js       node objects, DOM, property panels, child levels
  nodes/ConnectionManager.js ports, connection validation, SVG lines
  nodes/NodeAudio.js         Strudel evaluate/hush, playback state
  nodes/NodeCanvas.js        pan, zoom
  strudelPatternGenerator.js graph traversal and composition (no per-type cases)
  nodeCodegen.js             what one node emits, from the schema's `codegen` rules
  nodeProperties.js          property definitions shared by panels and codegen
  settingsCodegen.js         settings -> master chain / tempo code (pure functions)
  projectManager.js          save / load / export / autosave
  sampleTunes.js             example graphs behind the "Sample Tune" button
  nodeContextMenu.js         right-click menu for a single node
  appWiring.js               settings modal, "Build Nodes", AI apply adapter
  menuLoader.js              instrument palette from nodes/strudel-node-instruments.json
  nodeSearch.js              canvas search (Ctrl/Cmd+F)
  ai-provider.js, ai-creator.js  optional AI helper
nodes/*.json          the schema: node types, properties, sockets, instruments
```

Data flow: **nodes + connections → `StrudelPatternGenerator` →
`NodeCodegen.emit()` → `NodeManager.buildPlayablePattern()` → code in the footer
field → `NodeAudio.evaluatePattern()` → Strudel → speakers.**

`nodes/*.json` is the source of truth for what a node type can do, and it drives
both the property panel and the code. Each node type resolves to a rule:

1. an explicit entry in `codegen.types` (e.g. `Stack` → `stack(...)`, `Chance` →
   `.degradeBy(1 - p)`), otherwise
2. the rule for its `category` in `codegen.categories` (source, effect, transform,
   rhythmic, temporal, conditional, modulation, pitch, wrapper, control,
   structural, synth), otherwise
3. `validate()` reports it at boot as a schema issue.

Arguments come from the schema, not from `switch` statements: a method's own
definition wins over the node's generic properties, and argument names/order are
taken from `mapsTo` or from the definition's `signature` template
(`pattern.chop(slices)`). The property panel renders the same definitions, and
every control writes straight back to `node.properties.strudelProperties` and
regenerates the code, so the panel and the output cannot disagree.

Adding a node type normally means editing the JSON only. `nodeManager.schemaIssues`
lists anything that would have no code path.

## Tests

```bash
node test/pattern-smoke.mjs
```

Runs in Node (no browser): per-node codegen for every schema and palette type,
graph composition (chains, stacking, combinators, cycles), property-definition
merging, and project save/load/autosave round-trips.

Browser check — boots the real app in an iframe and asserts the wiring, including
that the schema passes validation and that dragging a schema slider changes the
generated code. It reports its verdict in the page title, and `?report=1` also
downloads the log.

```bash
python3 -m http.server 8899
# open http://localhost:8899/test/boot-smoke.html
```

## Deploy

`.github/workflows/static.yml` publishes to GitHub Pages on pushes to `main`. It
copies only the files the app loads, so `docs/`, `test/` and the legacy modules
below are not published.

## Known gaps

* Strudel still loads from the CDN (`@strudel/web@1.0.3`). Bundling it locally is
  the next step for offline use and version pinning.

## Legacy files (safe to delete)

These are no longer loaded by `index.html`. Deleting them was refused by the tool
policy in this environment, so they are still in the tree; the Pages build skips
them. Run this yourself to remove them:

```bash
git rm js/main.js js/ui.js js/layerManager.js js/timeline.js \
  js/settings-manager.js js/tutorialSystem.js js/tutorialConfig.js \
  js/graphNormalizer.js js/fileManager.js js/databaseManager.js \
  js/collectionManager.js js/collectionUI.js js/presets.js \
  js/soundGenerator.js js/audioEngine.js js/notifications.js \
  js/nodeManager.js js/strudel.js js/strudel.mjs js/strudel.esm.min.js \
  js/strudel-core.mjs js/strudel-web.html js/musicManager.js \
  js/audioEffectsManager.js js/strudel-sample-manager.js test-all-fixes.js
git rm -r docs
```
