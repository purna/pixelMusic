# Strudel Schema Files - Updated Structure

## Overview
This document summarizes the updated Strudel schema files with child node support and missing elements added.

## File Summaries

### 1. **strudel-node-schema.json**
**Purpose**: Core node type definitions, socket compatibility, and execution flow rules.

**Key Updates**:
- Added child node support with `children`, `minChildren`, `maxChildren` properties
- Added `parent` socket type for hierarchical relationships
- Enhanced wrapper nodes to properly support child patterns
- Added missing nodes: `Gain`, `Crush`, `Shape`, `Jux`, `Rev`, `Palindrome`
- Added `childExecutionMode` for controlling how children are processed

**Missing Elements Added**:
- Parent-child relationship system
- Nested execution contexts
- Transform wrapper nodes
- Utility nodes for pattern manipulation

---

### 2. **strudel-node-properties.json**
**Purpose**: Defines UI controls, parameter ranges, and property-to-API mappings for each node type.

**Key Updates**:
- Added `childContainer` property type for nodes that accept children
- Added missing effect nodes: `crush`, `shape`, `vowel`
- Added transform nodes: `jux`, `rev`, `palindrome`, `shuffle`
- Enhanced envelope controls with dedicated section
- Added `transformFunction` property type for wrapper nodes

**Missing Elements Added**:
- Child slot UI definitions
- Bit crushing and wave shaping effects
- Pattern reversal and manipulation transforms
- Enhanced modulation controls

---

### 3. **strudel-node-instruments.json**
**Purpose**: Comprehensive instrument library organized by category with menu structure for UI.

**Key Updates**:
- Added complete synthesizer waveforms group
- Added bass instruments group
- Added vocal/choir sounds group
- Added ethnic/world instruments group
- Enhanced pattern manipulation section
- Added complete transform operations menu

**Missing Elements Added**:
- Synthesizer instruments (sawtooth, sine, square, triangle)
- Bass sounds (bass0-3, bassfoo, bassdm)
- Vocal samples (choir, soprano, alto)
- World instruments (tabla, sitar, tanpura)
- Complete pattern transform operations

---

### 4. **strudel-control-nodes.json**
**Purpose**: Defines control signal generators (LFOs, randoms, envelopes) and their outputs.

**Key Updates**:
- Added perlin noise generator
- Added step sequencer control
- Added envelope follower
- Added sample and hold
- Enhanced range mapping with curve options
- Added control signal arithmetic nodes (add, multiply, mix)

**Missing Elements Added**:
- Smooth random (perlin/noise)
- Step-based control sequences
- Dynamic envelope following
- Control signal math operations
- Non-linear range mapping

---

### 5. **strudel-mini-notation.json**
**Purpose**: Complete mini-notation syntax reference with operators, precedence, and parsing rules.

**Key Updates**:
- Clarified operator precedence with more examples
- Added polymeter syntax (`,` for simultaneous patterns of different lengths)
- Enhanced subdivision examples with deeper nesting
- Added mini-notation within method arguments examples
- Documented interaction between operators

**Missing Elements Added**:
- Polymeter/polyrhythm notation details
- Complex nesting examples (4+ levels deep)
- Operator combination rules
- Edge cases and limitations

---

### 6. **strudel-pattern-combinators.json**
**Purpose**: Higher-order functions for pattern composition, layering, and transformation.

**Key Updates**:
- Added `jux` (juxtapose/stereo split) combinator
- Added `rev` (reverse) and `palindrome` combinators
- Added `shuffle` and `scramble` combinators
- Added `iter` and `segment` for pattern rotation
- Enhanced `superimpose` with multiple transform support
- Added `ply` for event multiplication

**Missing Elements Added**:
- Stereo field manipulation (jux)
- Pattern direction/reversal
- Stochastic reordering
- Rotational transforms
- Event-level multiplication

---

### 7. **strudel-pattern-functions.json**
**Purpose**: Pattern constructor functions and chainable methods for sound generation and effects.

**Key Updates**:
- Added missing effect methods: `crush`, `shape`, `vowel`, `coarse`
- Added modulation methods: `accelerate`, `decelerate`
- Added utility methods: `segment`, `chunk`, `fit`
- Added scale/harmony methods: `scale`, `chord`, `arp`
- Documented mini-notation support in all relevant methods
- Added envelope methods: `hold`, `legato`

**Missing Elements Added**:
- Complete effect chain methods
- Time manipulation utilities
- Harmonic/melodic helpers
- Envelope shaping controls
- Sample manipulation methods

---

### 8. **strudel-schema-index.json**
**Purpose**: Master index linking all schemas with usage examples and implementation guidance.

**Key Updates**:
- Added child node architecture section
- Expanded coverage analysis with parent-child examples
- Added execution context hierarchy diagram
- Enhanced validation rules for nested structures
- Added common patterns for child node usage

**Missing Elements Added**:
- Parent-child relationship documentation
- Nested execution context rules
- Wrapper node implementation patterns
- Complex nesting examples

---

## Critical Child Node Architecture

### Node Hierarchy Types

1. **Container Nodes** (Stack, Sequence, Group)
   - Accept multiple pattern children
   - Combine children according to mode (parallel/sequential)
   - Children execute independently then combine

2. **Wrapper Nodes** (Often, Sometimes, Rarely, Every)
   - Accept one or more transform children
   - Apply probability/conditional logic to children
   - Children execute within wrapper context

3. **Transform Nodes** (Jux, Superimpose, Layer)
   - Accept pattern children and transform functions
   - Apply transformations to children
   - May create multiple execution branches

### Socket System for Children

- `patternIn` → Accepts pattern from parent/previous node
- `patternOut` → Sends pattern to next node
- `wrapIn` → Special input for nodes that will be wrapped
- `childSlot` → Accepts child patterns (new)
- `parentOut` → Sends to parent container (new)

### Execution Flow with Children

```
Source Node (Instrument/Drum)
  ↓ patternOut
Structural Node (Stack/Group) ← childSlot ← Child 1
                               ← childSlot ← Child 2
  ↓ patternOut (combined)
Effect Chain (LPF, Delay)
  ↓ patternOut
Wrapper Node (Sometimes) ← wrapIn ← Transform Child
  ↓ patternOut
Output
```

## Implementation Priorities

1. **Phase 1**: Core node types with child support (Stack, Sometimes, Every)
2. **Phase 2**: Control nodes with proper output routing
3. **Phase 3**: Complex transforms and effects
4. **Phase 4**: Advanced combinators and utilities

## Validation Requirements

- Child nodes must have compatible socket types
- Wrapper nodes require at least `minChildren`
- Execution stages must flow in order (source → wrapper)
- No circular dependencies in parent-child relationships
- Control signals can only connect to `controlIn` sockets

## Next Steps

1. Implement child slot UI in node editor
2. Add drag-drop from node onto another to create parent-child
3. Implement execution context stack for nested evaluation
4. Add visual indicators for parent-child relationships
5. Create code generator that respects hierarchy