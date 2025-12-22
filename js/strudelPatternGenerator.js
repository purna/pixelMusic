/**
 * StrudelPatternGenerator - Dedicated pattern generation for Strudel code
 * Handles all pattern construction, mini-notation parsing, and code generation
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
    }

    // Initialize schemas from node manager
    initSchemas(schemas) {
        this.miniNotationSchema = schemas.miniNotationSchema;
        this.patternCombinatorsSchema = schemas.patternCombinatorsSchema;
        this.patternFunctionsSchema = schemas.patternFunctionsSchema;
        this.propertySchema = schemas.propertySchema;
        this.controlNodesSchema = schemas.controlNodesSchema;
        this.nodeSchema = schemas.nodeSchema;
    }

    /**
     * Generate pattern for a specific node
     */
    generatePatternFromNode(node) {
        // Build pattern by traversing connections backwards from this node
        const connectedNodes = this.getConnectedNodes(node);
        
        // Start with the base pattern for this node
        let pattern = this.buildNodePattern(node);
        
        // Check if this is a combinator that needs special handling
        const isCombinator = this.patternCombinatorsSchema &&
                             this.patternCombinatorsSchema.combinators &&
                             this.patternCombinatorsSchema.combinators[node.type];
        
        if (isCombinator) {
            // Handle combinators with multiple inputs
            return this.buildCombinatorPatternWithChildren(node, connectedNodes);
        }
        
        // Apply connected nodes in reverse order (effect chains, etc.)
        connectedNodes.reverse().forEach(connectedNode => {
            const connectedPattern = this.buildNodePattern(connectedNode.node);
            pattern = `${connectedPattern}(${pattern})`;
        });
        
        return pattern;
    }

    /**
     * Build pattern for a combinator with its connected children
     */
    buildCombinatorPatternWithChildren(combinatorNode, connectedNodes) {
        const combinatorType = combinatorNode.type;
        const combinatorDef = this.patternCombinatorsSchema.combinators[combinatorType];
        
        if (!combinatorDef) {
            return this.buildNodePattern(combinatorNode);
        }
        
        // Get all input connections for this combinator
        const connections = this.nodeManager.connections.connections || [];
        const inputConnections = connections.filter(conn =>
            conn.targetNodeId === combinatorNode.id && conn.targetPort === 'input'
        );
        
        // Build patterns for all connected children
        const childPatterns = inputConnections.map(conn => {
            const childNode = this.nodeManager.nodes.find(n => n.id === conn.sourceNodeId);
            return childNode ? this.generatePatternFromNode(childNode) : '';
        }).filter(p => p !== '');
        
        // Handle different combinator types
        if (combinatorType === 'stack') {
            // stack() combinator - layers patterns in parallel
            const childrenArg = childPatterns.join(', ');
            
            // Check for bank selection on the stack node
            const props = combinatorNode.properties.strudelProperties || {};
            let stackPattern = `stack(${childrenArg})`;
            
            if (props.bank) {
                stackPattern += `.bank("${props.bank}")`;
            }
            
            return stackPattern;
        } else if (combinatorType === 'cat' || combinatorType === 'seq') {
            // cat() or seq() combinator - sequences patterns
            const childrenArg = childPatterns.join(', ');
            return `${combinatorType}(${childrenArg})`;
        } else if (combinatorDef.serialization.type === 'method') {
            // Method-based combinators like struct, mask, etc.
            const basePattern = childPatterns.length > 0 ? childPatterns[0] : this.buildNodePattern(combinatorNode);
            const methodPattern = this.buildCombinatorPattern(combinatorNode);
            return `${basePattern}${methodPattern}`;
        } else {
            // Fallback for other combinators
            const basePattern = childPatterns.length > 0 ? childPatterns[0] : this.buildNodePattern(combinatorNode);
            const combinatorPattern = this.buildCombinatorPattern(combinatorNode);
            return `${combinatorPattern}(${basePattern})`;
        }
    }

    /**
     * Get nodes connected to the given node (input connections)
     */
    getConnectedNodes(node) {
        // Find nodes that connect to this node (input connections)
        const connections = this.nodeManager.connections.connections || [];
        const inputConnections = connections.filter(conn => 
            conn.targetNodeId === node.id && conn.targetPort === 'input'
        );
        
        return inputConnections.map(conn => {
            const sourceNode = this.nodeManager.nodes.find(n => n.id === conn.sourceNodeId);
            return {
                node: sourceNode,
                connection: conn
            };
        }).filter(item => item.node);
    }

    /**
     * Build pattern string for a specific node
     */
    buildNodePattern(node) {
        let pattern = '';
        const props = node.properties.strudelProperties || {};
        
        // Handle hierarchical children first
        if (node.children && node.children.length > 0) {
            pattern = this.buildHierarchicalPattern(node);
        } else {
            // Handle pattern combinators first
            if (this.patternCombinatorsSchema && this.patternCombinatorsSchema.combinators && this.patternCombinatorsSchema.combinators[node.type]) {
                pattern = this.buildCombinatorPattern(node);
            }
            
            // Handle pattern functions
            else if (this.patternFunctionsSchema && this.patternFunctionsSchema.constructors && this.patternFunctionsSchema.constructors[node.type]) {
                pattern = this.buildPatternFunctionPattern(node);
            }
            
            // Handle new node types from updated schema
            else if (this.nodeSchema && this.nodeSchema.nodes && this.nodeSchema.nodes[node.type]) {
                pattern = this.buildNodeSchemaPattern(node);
            }
            
            else if (node.type === 'Instrument' || node.type === 'DrumSymbol' || node.type === 'instrument') {
                // Build instrument pattern with properties
                if (node.properties.note) {
                    pattern = `note("${node.properties.note}")`;
                } else {
                    // Use sound property if available, otherwise fall back to instrument
                    const sound = props.sound || props.symbol || node.instrument;
                    
                    // Check if sound contains mini-notation
                    const parsedSound = this.parseMiniNotation(sound);
                    pattern = `s("${parsedSound}")`;
                }
                
                // Apply instrument properties
                if (props.n !== undefined) {
                    pattern += `.n(${props.n})`;
                }
                if (props.gain !== undefined && props.gain !== 1) {
                    pattern += `.gain(${props.gain})`;
                }
                if (props.pan !== undefined && props.pan !== 0) {
                    pattern += `.pan(${props.pan})`;
                }
                if (props.bank) {
                    pattern += `.bank("${props.bank}")`;
                }
                if (props.dec !== undefined && props.dec !== 0.3) {
                    pattern += `.dec(${props.dec})`;
                }
                
                // Apply ADSR envelope
                if (props.attack !== undefined && props.attack !== 0.01) {
                    pattern += `.attack(${props.attack})`;
                }
                if (props.decay !== undefined && props.decay !== 0.3) {
                    pattern += `.decay(${props.decay})`;
                }
                if (props.sustain !== undefined && props.sustain !== 0.7) {
                    pattern += `.sustain(${props.sustain})`;
                }
                if (props.release !== undefined && props.release !== 0.5) {
                    pattern += `.release(${props.release})`;
                }
                
                // Apply audio effects
                if (props.vowel) {
                    pattern += `.vowel()`;
                }
                if (props.lpf !== undefined && props.lpf !== 8000) {
                    pattern += `.lpf(${props.lpf})`;
                }
                if (props.hpf !== undefined && props.hpf !== 20) {
                    pattern += `.hpf(${props.hpf})`;
                }
                if (props.bpf !== undefined && props.bpf !== 1000) {
                    pattern += `.bpf(${props.bpf})`;
                }
                if (props.delay !== undefined && props.delay !== 0) {
                    pattern += `.delay(${props.delay})`;
                }
                if (props.reverb !== undefined && props.reverb !== 0) {
                    pattern += `.reverb(${props.reverb})`;
                }
                if (props.distort !== undefined && props.distort !== 0) {
                    pattern += `.distort(${props.distort})`;
                }
                if (props.crush !== undefined && props.crush !== 0) {
                    pattern += `.crush(${Math.round(props.crush)})`;
                }
                if (props.speed !== undefined && props.speed !== 1) {
                    pattern += `.speed(${props.speed})`;
                }
                
                // Apply pattern combinator methods
                if (props.structure) {
                    pattern += `.struct("${props.structure}")`;
                }
                if (props.mask) {
                    pattern += `.mask("${props.mask}")`;
                }
                if (props.pulses !== undefined && props.steps !== undefined) {
                    pattern += `.euclidean(${props.pulses}, ${props.steps})`;
                }
                if (props.slowFactor !== undefined) {
                    pattern += `.slow(${props.slowFactor})`;
                }
                if (props.fastFactor !== undefined) {
                    pattern += `.fast(${props.fastFactor})`;
                }
                if (props.everyN !== undefined && props.everyTransform) {
                    pattern += `.every(${props.everyN}, ${props.everyTransform})`;
                }
                if (props.whenmodDivisor !== undefined && props.whenmodRemainder !== undefined && props.whenmodTransform) {
                    pattern += `.whenmod(${props.whenmodDivisor}, ${props.whenmodRemainder}, ${props.whenmodTransform})`;
                }
                
            } else if (node.type === 'Repeater' || node.type === 'multiplier') {
                const amount = props.amount || 4;
                pattern = `*(${amount})`;
            } else if (node.type === 'Chance') {
                const probType = props.type || 'sometimes';
                const probability = props.probability || 0.5;
                const interval = props.interval || 4;
                
                // Map chance types to Strudel functions
                const chanceMap = {
                    'often': `often(${probability})`,
                    'sometimes': `sometimes(${probability})`,
                    'rarely': `rarely(${probability})`,
                    'chance': `when(${probability})`,
                    'every': `every(${interval})`
                };
                
                pattern = chanceMap[probType] || `sometimes(${probability})`;
            } else if (node.type === 'Effect') {
                pattern = this.buildEffectPattern(node);
            } else if (node.type === 'Pitch') {
                const note = props.note || 0;
                const speed = props.speed || 1;
                pattern = `.note(${note}).speed(${speed})`;
            } else if (node.type === 'Generator') {
                const type = props.type || 'rand';
                const max = props.max || 8;
                pattern = `${type}(${max})`;
            } else if (node.type === 'Transform') {
                const transformType = props.type || 'chop';
                const amount = props.amount !== undefined ? props.amount : 0.5;
                const speed = props.speed !== undefined && props.speed !== 1 ? `.speed(${props.speed})` : '';
                
                // Map transform types to Strudel methods
                const transformMap = {
                    'chop': `.chop(${Math.round(amount * 16)})`,
                    'stutter': `.stutter(${Math.round(amount * 16)})`,
                    'density': `.density(${amount})`,
                    'linger': `.linger(${amount})`,
                    'rarely': `.rarely(${amount})`,
                    'sometimes': `.sometimes(${amount})`,
                    'often': `.often(${amount})`,
                    'slow': `.slow(${Math.max(1, Math.round(amount * 4))})`,
                    'fast': `.fast(${Math.max(1, Math.round(amount * 4))})`,
                    'rev': `.rev()`,
                    'palindrome': `.palindrome()`
                };
                
                pattern = transformMap[transformType] || `.${transformType}(${amount})`;
                if (speed) pattern += speed;
            } else if (this.propertySchema.transformNodes && this.propertySchema.transformNodes[node.type]) {
                // Handle individual transform nodes
                pattern = this.buildIndividualTransformPattern(node);
            } else if (this.isControlNode(node)) {
                // Handle control nodes
                pattern = this.buildControlNodePattern(node);
            } else if (node.type === 'note') {
                pattern = `note("${node.properties.note}")`;
            } else {
                pattern = `s("${node.instrument}")`;
            }
        }
        
        return pattern;
    }

    /**
     * Build pattern for node schema types
     */
    /**
     * Build pattern for hierarchical nodes with children
     */
    buildHierarchicalPattern(node) {
        if (!node.children || node.children.length === 0) {
            return this.buildBasicNodePattern(node);
        }

        const basePattern = this.buildBasicNodePattern(node);
        const childPattern = this.buildChildPattern(node.children);
        
        // For instrument nodes, use the child pattern as the content
        if (node.type === 'Instrument' || node.type === 'DrumSymbol' || node.type === 'instrument') {
            // Replace the sound pattern with the hierarchical content
            if (node.properties.note) {
                return `note("${childPattern}")`;
            } else {
                const props = node.properties.strudelProperties || {};
                const sound = props.sound || props.symbol || node.instrument;
                
                let pattern = `s("${childPattern}")`;
                
                // Apply other properties from the parent node
                if (props.n !== undefined) pattern += `.n(${props.n})`;
                if (props.gain !== undefined && props.gain !== 1) pattern += `.gain(${props.gain})`;
                if (props.pan !== undefined && props.pan !== 0) pattern += `.pan(${props.pan})`;
                if (props.bank) pattern += `.bank("${props.bank}")`;
                
                return pattern;
            }
        }
        
        // For other node types, combine base pattern with children
        return `${basePattern}(${childPattern})`;
    }

    /**
     * Build pattern string from child nodes
     */
    buildChildPattern(children) {
        if (!children || children.length === 0) return '';
        
        // Group children by container type
        const groups = this.groupChildrenByContainer(children);
        
        // Generate notation string from groups
        return groups.map(group => this.generateGroupNotation(group)).join(' ');
    }

    /**
     * Group children by their container types
     */
    groupChildrenByContainer(children) {
        const groups = [];
        let currentGroup = [];
        
        children.forEach((child, index) => {
            if (child.containerType) {
                // Close current group if it has items
                if (currentGroup.length > 0) {
                    groups.push({ type: 'sequence', items: [...currentGroup] });
                    currentGroup = [];
                }
                // Add container group
                groups.push({ type: child.containerType, items: [child] });
            } else {
                currentGroup.push(child);
            }
        });
        
        // Add remaining items as sequence
        if (currentGroup.length > 0) {
            groups.push({ type: 'sequence', items: currentGroup });
        }
        
        return groups;
    }

    /**
     * Generate notation string for a group of children
     */
    generateGroupNotation(group) {
        if (group.type === 'sequence') {
            return group.items.map(item => this.getChildNotation(item)).join(' ');
        } else if (group.type === 'parallel') {
            const content = group.items.map(item => this.getChildNotation(item)).join(' ');
            return `[${content}]`;
        } else if (group.type === 'random') {
            const content = group.items.map(item => this.getChildNotation(item)).join(' ');
            return `<${content}>`;
        }
        
        return group.items.map(item => this.getChildNotation(item)).join(' ');
    }

    /**
     * Get notation string for a single child node
     */
    getChildNotation(child) {
        if (child.type === 'note') {
            return child.properties.note || '0';
        } else if (child.type === 'sound') {
            return child.instrument || child.properties.sound || 's';
        } else if (child.type === 'rest') {
            return '~';
        }
        
        // Handle other child types
        return child.instrument || child.type;
    }

    /**
     * Build basic node pattern without hierarchical processing
     */
    buildBasicNodePattern(node) {
        const props = node.properties.strudelProperties || {};
        
        // Handle pattern combinators
        if (this.patternCombinatorsSchema && this.patternCombinatorsSchema.combinators && this.patternCombinatorsSchema.combinators[node.type]) {
            return this.buildCombinatorPattern(node);
        }
        
        // Handle pattern functions
        if (this.patternFunctionsSchema && this.patternFunctionsSchema.constructors && this.patternFunctionsSchema.constructors[node.type]) {
            return this.buildPatternFunctionPattern(node);
        }
        
        // Handle new node types from updated schema
        if (this.nodeSchema && this.nodeSchema.nodes && this.nodeSchema.nodes[node.type]) {
            return this.buildNodeSchemaPattern(node);
        }
        
        // Handle basic node types
        if (node.type === 'Instrument' || node.type === 'DrumSymbol' || node.type === 'instrument') {
            if (node.properties.note) {
                return `note("${node.properties.note}")`;
            } else {
                const sound = props.sound || props.symbol || node.instrument;
                return `s("${sound}")`;
            }
        } else if (node.type === 'note') {
            return `note("${node.properties.note}")`;
        } else {
            return `s("${node.instrument}")`;
        }
    }

    buildNodeSchemaPattern(node) {
        const props = node.properties.strudelProperties || {};
        const nodeType = node.type;
        const nodeDef = this.nodeSchema.nodes[nodeType];
        
        if (!nodeDef) {
            return '';
        }
        
        let pattern = '';
        
        // Handle different node types from the schema
        switch (nodeType) {
            case 's':
                // Sound pattern constructor
                const soundPattern = props.pattern || node.instrument || 'bd';
                const parsedSound = this.parseMiniNotation(soundPattern);
                pattern = `s("${parsedSound}")`;
                break;
                
            case 'note':
                // Note pattern constructor
                const notePattern = props.pattern || node.instrument || 'c4';
                const parsedNote = this.parseMiniNotation(notePattern);
                pattern = `note("${parsedNote}")`;
                break;
                
            case 'bank':
                // Bank selection (method call)
                const bankName = props.bankName || 'tr909';
                pattern = `.bank("${bankName}")`;
                break;
                
            case 'dec':
                // Decay control (method call)
                const decAmount = props.amount || 0.3;
                pattern = `.dec(${decAmount})`;
                break;
                
            case 'stack':
                // Stack combinator - handled separately in buildCombinatorPatternWithChildren
                pattern = 'stack({children})';
                break;
                
            case 'struct':
                // Structure application (method call)
                const structure = props.structure || 'x ~ x ~';
                const parsedStructure = this.parseMiniNotation(structure);
                pattern = `.struct("${parsedStructure}")`;
                break;
                
            case 'slow':
                // Slow down (method call)
                const slowFactor = props.factor || 2;
                pattern = `.slow(${slowFactor})`;
                break;
                
            case 'fast':
                // Speed up (method call)
                const fastFactor = props.factor || 2;
                pattern = `.fast(${fastFactor})`;
                break;
                
            case 'every':
                // Every N cycles transformation
                const everyN = props.n || 4;
                const everyTransform = props.transform || 'x => x.fast(2)';
                pattern = `.every(${everyN}, ${everyTransform})`;
                break;
                
            case 'whenmod':
                // When modulo transformation
                const divisor = props.divisor || 4;
                const remainder = props.remainder || 0;
                const whenmodTransform = props.transform || 'x => x.speed(2)';
                pattern = `.whenmod(${divisor}, ${remainder}, ${whenmodTransform})`;
                break;
                
            case 'group':
                // Group multiple patterns
                const groupMode = props.mode || 'parallel';
                pattern = `.group("${groupMode}")`;
                break;
                
            case 'scale':
                // Apply musical scale
                const scalePattern = props.scalePattern || 'C5:minor';
                const parsedScale = this.parseMiniNotation(scalePattern);
                pattern = `.scale("${parsedScale}")`;
                break;
                
            case 'off':
                // Add offset timing
                const time = props.time || '1/16';
                const transform = props.transform || 'x => x.add(4)';
                pattern = `.off(${time}, ${transform})`;
                break;
                
            case 'add':
                // Add value to pattern
                const value = props.value || 4;
                pattern = `.add(${value})`;
                break;
                
            default:
                // Fallback for other node types
                pattern = nodeType;
                break;
        }
        
        return pattern;
    }

    /**
     * Build pattern for individual transform nodes
     */
    buildIndividualTransformPattern(node) {
        const props = node.properties.strudelProperties || {};
        const transformType = node.type;
        const transformDef = this.propertySchema.transformNodes[transformType];
        
        if (!transformDef) {
            return '';
        }
  
        let pattern = '';
        
        // Map transform types to Strudel methods with proper parameters
        const transformMap = {
            'chop': () => `.chop(${props.slices || 8})`,
            'stutter': () => `.stutter(${props.repeats || 2})`,
            'trunc': () => `.trunc(${props.amount || 0.5})`,
            'speed': () => `.speed(${props.factor || 1})`,
            'note': () => `.note(${props.semitones || 0})`,
            'coarse': () => `.coarse(${props.octaves || 0})`,
            'vibrato': () => {
                let p = `.vibrato(${props.rate || 4})`;
                if (props.depth !== undefined && props.depth !== 0.02) {
                    p += `.depth(${props.depth})`;
                }
                return p;
            },
            'tremolo': () => {
                let p = `.tremolo(${props.rate || 8})`;
                if (props.depth !== undefined && props.depth !== 0.5) {
                    p += `.depth(${props.depth})`;
                }
                return p;
            },
            'lpf': () => `.lpf(${props.frequency || 800})`,
            'hpf': () => `.hpf(${props.frequency || 200})`,
            'lpq': () => `.lpq(${props.q || 0.7})`,
            'gain': () => `.gain(${props.amount || 1})`,
            'delay': () => `.delay(${props.time || 0.25})`,
            'delayfb': () => `.delayfb(${props.amount || 0.4})`,
            'reverb': () => `.reverb(${props.amount || 0.3})`,
            'room': () => `.room(${props.size || 0.5})`,
            'often': () => `.often(${props.chance || 0.75})`,
            'sometimes': () => `.sometimes(${props.chance || 0.5})`,
            'rarely': () => `.rarely(${props.chance || 0.25})`
        };
        
        const transformFunc = transformMap[transformType];
        if (transformFunc) {
            pattern = transformFunc();
        } else {
            // Fallback for unknown transform types
            pattern = `.${transformType}()`;
        }
        
        return pattern;
    }

    /**
     * Build pattern for combinator nodes
     */
    buildCombinatorPattern(node) {
        const props = node.properties.strudelProperties || {};
        const combinatorType = node.type;
        const combinatorDef = this.patternCombinatorsSchema.combinators[combinatorType];
        
        if (!combinatorDef) {
            return '';
        }
        
        let pattern = '';
        const serialization = combinatorDef.serialization;
        
        if (serialization.type === 'function') {
            // Function-based combinators like stack(), cat(), etc.
            pattern = serialization.template;
            
            // Replace placeholders with actual values
            if (serialization.template.includes('{args}')) {
                // For multi-input combinators, we'll handle this in pattern generation
                pattern = serialization.template.replace('{args}', '{children}');
            }
            
        } else if (serialization.type === 'method') {
            // Method-based combinators like .struct(), .mask(), etc.
            pattern = serialization.template;
            
            // Replace placeholders with actual values
            Object.keys(props).forEach(propKey => {
                const placeholder = `{${propKey}}`;
                const value = props[propKey];
                if (serialization.template.includes(placeholder)) {
                    pattern = pattern.replace(placeholder, typeof value === 'string' ? `"${value}"` : value);
                }
            });
            
        } else {
            // Fallback for template-based serialization
            pattern = serialization.template || combinatorType;
            
            // Replace placeholders with actual values
            Object.keys(props).forEach(propKey => {
                const placeholder = `{${propKey}}`;
                const value = props[propKey];
                pattern = pattern.replace(placeholder, typeof value === 'string' ? `"${value}"` : value);
            });
        }
        
        return pattern;
    }

    /**
     * Build pattern for pattern function constructors
     */
    buildPatternFunctionPattern(node) {
        const props = node.properties.strudelProperties || {};
        const functionType = node.type;
        const functionDef = this.patternFunctionsSchema.constructors[functionType];
        
        if (!functionDef) {
            return '';
        }
        
        let pattern = '';
        const serialization = functionDef.serialization;
        
        if (serialization.type === 'function') {
            // Function-based pattern constructors like s(), n(), note(), etc.
            pattern = serialization.template;
            
            // Replace placeholders with actual values
            Object.keys(props).forEach(propKey => {
                const placeholder = `{${propKey}}`;
                const value = props[propKey];
                if (serialization.template.includes(placeholder)) {
                    // Check if this argument supports mini-notation
                    const argDef = functionDef.arguments && functionDef.arguments[propKey];
                    let processedValue = value;
                    
                    if (argDef && argDef.supportsMiniNotation && typeof value === 'string') {
                        processedValue = this.parseMiniNotation(value);
                    }
                    
                    pattern = pattern.replace(placeholder, typeof processedValue === 'string' ? `"${processedValue}"` : processedValue);
                }
            });
            
        } else {
            // Fallback for template-based serialization
            pattern = serialization.template || functionType;
            
            // Replace placeholders with actual values
            Object.keys(props).forEach(propKey => {
                const placeholder = `{${propKey}}`;
                const value = props[propKey];
                
                // Check if this argument supports mini-notation
                const argDef = functionDef.arguments && functionDef.arguments[propKey];
                let processedValue = value;
                
                if (argDef && argDef.supportsMiniNotation && typeof value === 'string') {
                    processedValue = this.parseMiniNotation(value);
                }
                
                pattern = pattern.replace(placeholder, typeof processedValue === 'string' ? `"${processedValue}"` : processedValue);
            });
        }
        
        return pattern;
    }

    /**
     * Build pattern for control nodes
     */
    buildControlNodePattern(node) {
        const props = node.properties.strudelProperties || {};
        const controlType = node.type;
        const controlDef = this.nodeManager.getControlNodeDefinition(controlType);
        
        if (!controlDef) {
            return '';
        }

        const serialization = controlDef.serialization;
        if (!serialization) {
            return '';
        }

        let pattern = '';
        
        switch (serialization.type) {
            case 'literal':
                // Direct value replacement
                pattern = serialization.template.replace('{value}', props.value || 0);
                break;
                
            case 'function':
                // Function call with arguments
                const func = serialization.function;
                const args = serialization.args || [];
                const argValues = args.map(argName => {
                    const value = props[argName];
                    return typeof value === 'string' ? `"${value}"` : value;
                }).join(', ');
                pattern = `${func}(${argValues})`;
                break;
                
            case 'method':
                // Method call on input
                const method = serialization.function;
                const methodArgs = serialization.args || [];
                const methodArgValues = methodArgs.map(argName => {
                    const value = props[argName];
                    return typeof value === 'string' ? `"${value}"` : value;
                }).join(', ');
                pattern = `.${method}(${methodArgValues})`;
                break;
                
            default:
                // Fallback for template-based serialization
                if (serialization.template) {
                    pattern = serialization.template;
                    // Replace placeholders with actual values
                    Object.keys(props).forEach(propKey => {
                        const placeholder = `{${propKey}}`;
                        const value = props[propKey];
                        pattern = pattern.replace(placeholder, typeof value === 'string' ? `"${value}"` : value);
                    });
                }
                break;
        }
        
        return pattern;
    }

    /**
     * Build pattern for effect nodes
     */
    buildEffectPattern(node) {
        const props = node.properties.strudelProperties || {};
        const effectType = props.type || node.instrument || 'lpf';
        const amount = props.amount || 0.5;
        
        let pattern = '';
        
        // Map effect types to Strudel methods
        const effectMap = {
            'lpf': `.lpf(${amount})`,
            'hpf': `.hpf(${amount})`,
            'bpf': `.bpf(${amount})`,
            'lpq': `.lpq(${amount})`,
            'delay': `.delay(${amount})`,
            'delayfb': `.delayfb(${amount})`,
            'delayt': `.delayt(${amount})`,
            'reverb': `.reverb(${amount})`,
            'room': `.room(${amount})`,
            'distort': `.distort(${amount})`,
            'crush': `.crush(${Math.round(amount * 16)})`,
            'shape': `.shape(${amount})`,
            'vibrato': `.vibrato(${amount})`,
            'tremolo': `.tremolo(${amount})`,
            'chop': `.chop(${Math.round(amount * 16)})`,
            'stutter': `.stutter(${Math.round(amount * 16)})`
        };
        
        pattern = effectMap[effectType] || `.${effectType}(${amount})`;
        
        return pattern;
    }

    /**
     * Check if a node is a control node
     */
    isControlNode(node) {
        if (!this.controlNodesSchema || !this.controlNodesSchema.controlNodes) {
            return false;
        }
        return this.controlNodesSchema.controlNodes[node.type] !== undefined;
    }

    /**
     * Mini-notation parsing support
     */
    parseMiniNotation(patternString) {
        if (!this.miniNotationSchema) {
            console.warn('Mini-notation schema not loaded');
            return patternString; // Return as-is if schema not available
        }
        
        // Basic validation - check for balanced brackets
        const bracketPairs = [
            { open: '[', close: ']' },
            { open: '<', close: '>' },
            { open: '(', close: ')' },
            { open: '{', close: '}' }
        ];
        
        for (const pair of bracketPairs) {
            let openCount = 0;
            let closeCount = 0;
            
            for (const char of patternString) {
                if (char === pair.open) openCount++;
                if (char === pair.close) closeCount++;
            }
            
            if (openCount !== closeCount) {
                console.warn(`Unbalanced ${pair.open}/${pair.close} brackets in mini-notation: ${patternString}`);
                return patternString; // Return as-is if invalid
            }
        }
        
        // Pattern is valid, return it for use in Strudel
        return patternString;
    }

    /**
     * Generate canonical code using graph normalizer if available
     */
    generateCanonicalCode() {
        // Check if graph normalizer is available
        if (this.nodeManager.graphNormalizer && this.nodeManager.nodeSchema) {
            try {
                const result = this.nodeManager.graphNormalizer.normalizeGraph(this.nodeManager.nodes, this.nodeManager.connections);
                
                if (result.success) {
                    console.log('Canonical code generated:', {
                        code: result.code,
                        chains: result.chains.length,
                        normalizationMetadata: result.metadata
                    });
                    return result.code;
                } else {
                    console.error('Canonical code generation failed:', result.error);
                    return '';
                }
            } catch (error) {
                console.error('Canonical code generation error:', error);
                return '';
            }
        } else {
            console.warn('Graph normalizer not available, using basic code generation');
            return this.basicGenerateCanonicalCode();
        }
    }

    /**
     * Basic canonical code generation fallback
     */
    basicGenerateCanonicalCode() {
        const normalizedChains = this.nodeManager.normalizeGraph();
        const patterns = [];

        normalizedChains.forEach(chain => {
            const pattern = this.buildChainPattern(chain);
            if (pattern) {
                patterns.push(pattern);
            }
        });

        return patterns.join(' ');
    }

    /**
     * Build pattern for an execution chain
     */
    buildChainPattern(chain) {
        if (chain.length === 0) return '';
        
        // Start with the source node
        let pattern = this.buildNodePattern(chain[0]);
        
        // Apply nodes in execution order (excluding the source)
        for (let i = 1; i < chain.length; i++) {
            const node = chain[i];
            const nodeDef = this.nodeSchema.nodes[node.type];
            
            if (nodeDef?.execution?.wraps) {
                // Wrapper nodes enclose the entire pattern
                pattern = this.buildWrapperPattern(node, pattern);
            } else {
                // Regular nodes chain with the pattern
                const nodePattern = this.buildNodePattern(node);
                pattern = `${nodePattern}(${pattern})`;
            }
        }
        
        return pattern;
    }

    /**
     * Build pattern for wrapper nodes
     */
    buildWrapperPattern(wrapperNode, innerPattern) {
        const props = wrapperNode.properties.strudelProperties || {};
        const wrapperDef = this.nodeSchema.nodes[wrapperNode.type];
        
        // Map wrapper types to Strudel functions
        const wrapperMap = {
            'Often': `often(${props.probability || 0.7})`,
            'Sometimes': `sometimes(${props.probability || 0.5})`,
            'Rarely': `rarely(${props.probability || 0.3})`,
            'Chance': (() => {
                const probType = props.type || 'sometimes';
                const probability = props.probability || 0.5;
                const interval = props.interval || 4;
                
                const chanceMap = {
                    'often': `often(${probability})`,
                    'sometimes': `sometimes(${probability})`,
                    'rarely': `rarely(${probability})`,
                    'chance': `when(${probability})`,
                    'every': `every(${interval})`
                };
                
                return chanceMap[probType] || `sometimes(${probability})`;
            })()
        };
        
        const wrapperFunc = wrapperMap[wrapperNode.type] || wrapperNode.type.toLowerCase();
        return `${wrapperFunc}(${innerPattern})`;
    }

    /**
     * Test new Strudel features
     */
    testNewStrudelFeatures() {
        console.log('Testing new Strudel features...');
        
        // Test mini-notation parsing
        const testPatterns = [
            'bd ~ sd ~',
            '<[x*<1 2> [~@3 x]] x>',
            '~ [rim, sd:<2 3>]',
            '[0 <1 3>]*<2!3 4>'
        ];
        
        testPatterns.forEach(pattern => {
            const parsed = this.parseMiniNotation(pattern);
            console.log(`Mini-notation test: "${pattern}" -> "${parsed}"`);
        });
        
        // Test combinator pattern generation
        const combinatorTests = [
            { type: 'stack', props: {}, expected: 'stack({children})' },
            { type: 'cat', props: {}, expected: 'cat({children})' },
            { type: 'struct', props: { structure: 'x ~ x ~' }, expected: '.struct("x ~ x ~")' }
        ];
        
        combinatorTests.forEach(test => {
            const node = { type: test.type, properties: { strudelProperties: test.props } };
            const pattern = this.buildCombinatorPattern(node);
            console.log(`Combinator test: ${test.type} -> ${pattern}`);
        });
        
        // Test pattern function generation
        const functionTests = [
            { type: 's', props: { pattern: 'bd sd hh' }, expected: 's("bd sd hh")' },
            { type: 'n', props: { pattern: '[0 <1 3>]*<2!3 4>' }, expected: 'n("[0 <1 3>]*<2!3 4>")' }
        ];
        
        functionTests.forEach(test => {
            const node = { type: test.type, properties: { strudelProperties: test.props } };
            const pattern = this.buildPatternFunctionPattern(node);
            console.log(`Pattern function test: ${test.type} -> ${pattern}`);
        });
        
        this.nodeManager.updateStatus('✅ New Strudel features test completed - check console for details');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StrudelPatternGenerator;
}