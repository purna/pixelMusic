document.addEventListener('DOMContentLoaded', function() {
    // Initialize Tone.js
    const synth = new Tone.PolySynth(Tone.Synth).toDestination();
    let instruments = [];
    let strudelInitialized = false;
    let strudelPlayer = null;
      
    // Drag and drop functionality
    let draggedInstrument = null;
    let draggedItem = null;
      
    // Category tabs functionality
    const categoryTabs = document.querySelectorAll('.category-tab');
    const categoryContents = document.querySelectorAll('.category-content');
      
    categoryTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs and contents
            categoryTabs.forEach(t => t.classList.remove('active'));
            categoryContents.forEach(c => c.classList.remove('active'));
              
            // Add active class to clicked tab and corresponding content
            this.classList.add('active');
            const category = this.dataset.category;
            document.querySelector(`.category-content[data-category="${category}"]`).classList.add('active');
        });
    });
      
    // Sample subgroup functionality
    const sampleGroupHeaders = document.querySelectorAll('.sample-group-header');
    sampleGroupHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const subgroup = this.parentElement;
            const instruments = subgroup.querySelector('.sample-group-instruments');
            const icon = this.querySelector('.expand-icon');
              
            // Toggle expanded state
            subgroup.classList.toggle('expanded');
              
            if (subgroup.classList.contains('expanded')) {
                instruments.style.display = 'block';
                icon.classList.remove('fa-chevron-right');
                icon.classList.add('fa-chevron-down');
            } else {
                instruments.style.display = 'none';
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-right');
            }
        });
    });
     
    // Expand all sample subgroups by default on page load
    const sampleSubgroups = document.querySelectorAll('.sample-subgroup');
    sampleSubgroups.forEach(subgroup => {
        const instruments = subgroup.querySelector('.sample-group-instruments');
        const icon = subgroup.querySelector('.expand-icon');
        if (instruments && icon) {
            subgroup.classList.add('expanded');
            instruments.style.display = 'block';
            icon.classList.remove('fa-chevron-right');
            icon.classList.add('fa-chevron-down');
        }
    });
     
    // Drum machine category functionality
    const drumMachineHeaders = document.querySelectorAll('.drum-machine-header');
    drumMachineHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const category = this.parentElement;
            const instruments = category.querySelector('.drum-machine-instruments');
            const icon = this.querySelector('.expand-icon');
              
            // Toggle expanded state
            category.classList.toggle('expanded');
              
            if (category.classList.contains('expanded')) {
                instruments.style.display = 'block';
                icon.classList.remove('fa-chevron-right');
                icon.classList.add('fa-chevron-down');
            } else {
                instruments.style.display = 'none';
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-right');
            }
        });
    });
      
    // Instrument items
    const instrumentItems = document.querySelectorAll('.instrument-item');
    instrumentItems.forEach(item => {
        item.addEventListener('dragstart', function(e) {
            draggedItem = this;
            e.dataTransfer.setData('text/plain', this.dataset.instrument);
            e.dataTransfer.setData('strudel', this.dataset.strudel || '');
            this.classList.add('dragging');
        });
          
        item.addEventListener('dragend', function() {
            this.classList.remove('dragging');
        });
    });
      
    // Grid quarters
    const gridQuarters = document.querySelectorAll('.grid-quarter');
    gridQuarters.forEach(quarter => {
        quarter.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('highlight');
        });
          
        quarter.addEventListener('dragleave', function() {
            this.classList.remove('highlight');
        });
          
        quarter.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('highlight');
              
            const instrumentType = e.dataTransfer.getData('text/plain');
            const strudelSample = e.dataTransfer.getData('strudel');
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
              
            createInstrument(this, instrumentType, x, y, strudelSample);
        });
    });
      
    function createInstrument(quarter, instrumentType, x, y, strudelSample = '') {
        const instrument = document.createElement('div');
        instrument.className = 'instrument';
        instrument.textContent = getInstrumentIcon(instrumentType);
        instrument.style.left = `${x - 25}px`;
        instrument.style.top = `${y - 25}px`;
        instrument.dataset.instrument = instrumentType;
        instrument.dataset.id = Date.now().toString();
        instrument.dataset.strudel = strudelSample;
          
        // Make instrument draggable
        instrument.draggable = true;
        instrument.addEventListener('dragstart', function(e) {
            draggedInstrument = this;
            e.dataTransfer.setData('text/plain', this.dataset.instrument);
            e.dataTransfer.setData('strudel', this.dataset.strudel || '');
            this.classList.add('dragging');
        });
          
        instrument.addEventListener('dragend', function() {
            this.classList.remove('dragging');
        });
          
        // Add click event to select instrument
        instrument.addEventListener('click', function(e) {
            e.stopPropagation();
            selectInstrument(this.dataset.id);
        });
          
        // Add to instruments array
        const instrumentId = instrument.dataset.id;
        instruments.push({
            id: instrumentId,
            element: instrument,
            type: instrumentType,
            strudel: strudelSample,
            x: x,
            y: y,
            quarter: quarter.dataset.quarter,
            duration: 500,
            volume: 80,
            pitch: 440,
            pan: 0,
            attack: 0.1,
            decay: 0.5,
            waveform: 'sine'
        });
          
        quarter.appendChild(instrument);
          
        // Select the newly created instrument
        selectInstrument(instrumentId);
    }
      
    function selectInstrument(instrumentId) {
        // Deselect all instruments
        document.querySelectorAll('.instrument').forEach(inst => {
            inst.classList.remove('selected');
        });
           
        // Find and select the clicked instrument
        const instrument = instruments.find(inst => inst.id === instrumentId);
        if (instrument) {
            selectedInstrument = instrument;
            instrument.element.classList.add('selected');
            document.getElementById('side-panel').classList.add('visible');
            updatePropertyPanel();
            
            // Set current instrument for audio effects manager
            if (audioEffectsManager) {
                audioEffectsManager.setCurrentInstrument(instrumentId);
            }
        }
    }
      
    // Add click event to quarters to deselect instruments
    gridQuarters.forEach(quarter => {
        quarter.addEventListener('click', function() {
            if (selectedInstrument) {
                selectedInstrument.element.classList.remove('selected');
                selectedInstrument = null;
                document.getElementById('side-panel').classList.remove('visible');
                updatePropertyPanel();
            }
        });
    });
    
    // Enhanced Pattern Generator - Create complex sound patterns like Strudel.cc
    function createPattern(patternString, quarterElement) {
        // Parse pattern string and create multiple instruments
        // Example patterns:
        // "hh*4" - 4 hi-hats
        // "bd sd [~ bd] sd" - bass drum, snare, rest, bass drum, snare
        // "note('c4 d e f')" - C4, D4, E4, F4 notes
        // "s('hh*4').stack(note('c4(5,8)'))" - hi-hats with C4 notes
        
        const patterns = patternString.split(' ');
        const gridWidth = quarterElement.clientWidth;
        const gridHeight = quarterElement.clientHeight;
        const patternWidth = gridWidth / patterns.length;
        
        patterns.forEach((pattern, index) => {
            if (pattern === '~' || pattern === '[]' || pattern === '~') {
                // Rest - don't create an instrument
                return;
            }
            
            // Parse pattern
            let instrumentType = '9000_hh'; // default to hi-hat
            let strudelCode = '9000_hh(1)';
            let yPosition = gridHeight / 2;
            
            // Handle simple patterns like "hh", "bd", "sd"
            if (pattern.includes('hh')) {
                instrumentType = '9000_hh';
                strudelCode = '9000_hh(1)';
                yPosition = gridHeight * 0.7; // Lower position for drums
            } else if (pattern.includes('bd')) {
                instrumentType = '9000_bd';
                strudelCode = '9000_bd(1)';
                yPosition = gridHeight * 0.8; // Lower position for bass drums
            } else if (pattern.includes('sd')) {
                instrumentType = '9000_sd';
                strudelCode = '9000_sd(1)';
                yPosition = gridHeight * 0.75; // Middle position for snares
            } else if (pattern.includes('note')) {
                // Handle note patterns like note("c4 d e f")
                instrumentType = 'piano';
                strudelCode = ''; // Will use Tone.js for notes
                yPosition = gridHeight * 0.3; // Higher position for melodic instruments
            } else if (pattern.includes('sawtooth')) {
                // Handle sawtooth wave patterns
                instrumentType = 'sawtooth';
                strudelCode = '';
                yPosition = gridHeight * 0.4;
            } else if (pattern.includes('piano')) {
                // Handle piano patterns
                instrumentType = 'piano';
                strudelCode = '';
                yPosition = gridHeight * 0.3;
            }
            
            // Handle pattern multipliers like "hh*4"
            const multiplierMatch = pattern.match(/\*(\d+)/);
            if (multiplierMatch) {
                const count = parseInt(multiplierMatch[1]);
                for (let i = 0; i < count; i++) {
                    const x = (index + i) * patternWidth + patternWidth / 2;
                    createInstrument(quarterElement, instrumentType, x, yPosition, strudelCode);
                }
                return; // Skip the rest for this pattern
            }
            
            // Calculate position
            const x = index * patternWidth + patternWidth / 2;
            
            // Create instrument
            createInstrument(quarterElement, instrumentType, x, yPosition, strudelCode);
        });
    }
    
    // Add pattern creation to context menu or special drag behavior
    // For now, let's add a simple pattern creation UI
    function addPatternControls() {
        const patternControls = document.createElement('div');
        patternControls.id = 'pattern-controls';
        patternControls.style.position = 'fixed';
        patternControls.style.bottom = '20px';
        patternControls.style.left = '20px';
        patternControls.style.zIndex = '1000';
        patternControls.style.background = 'var(--bg-dark)';
        patternControls.style.padding = '10px';
        patternControls.style.borderRadius = '6px';
        patternControls.style.border = '1px solid var(--border-color)';
        
        patternControls.innerHTML = `
            <h4 style="color: var(--accent-primary); margin-bottom: 10px;">Pattern Generator</h4>
            <input type="text" id="pattern-input"
                   placeholder="e.g. bd sd [~ bd] sd"
                   style="width: 300px; padding: 8px; background: var(--bg-darkest);
                          border: 1px solid var(--border-color); color: var(--text-primary);">
            <button id="generate-pattern"
                    style="margin-top: 8px; padding: 8px 16px; background: var(--accent-primary);
                           color: #000; border: none; border-radius: 4px; cursor: pointer;">
                Generate Pattern
            </button>
            <div style="margin-top: 15px; font-size: 11px; color: var(--text-secondary); margin-bottom: 10px;">
                <strong>Preset Patterns:</strong>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px;">
                <button class="preset-btn" data-pattern="hh*4">hh*4</button>
                <button class="preset-btn" data-pattern="bd sd [~ bd] sd">bd sd [~ bd] sd</button>
                <button class="preset-btn" data-pattern="bd hh sd hh">bd hh sd hh</button>
                <button class="preset-btn" data-pattern="note(c4 d e f)">C4 D4 E4 F4</button>
                <button class="preset-btn" data-pattern="bd sd bd sd bd sd bd sd">4/4 Beat</button>
            </div>
            <div style="font-size: 11px; color: var(--text-secondary);">
                <strong>Examples:</strong><br>
                "hh*4" - 4 hi-hats<br>
                "bd sd [~ bd] sd" - bass, snare, rest, bass, snare<br>
                "note(c4 d e f)" - C4, D4, E4, F4 notes<br>
                "bd*8" - 8 bass drums<br>
                "sd hh sd hh" - snare, hi-hat pattern
            </div>
        `;
        
        document.body.appendChild(patternControls);
        
        // Add CSS for preset buttons
        const style = document.createElement('style');
        style.textContent = `
            .preset-btn {
                background: var(--bg-medium);
                border: 1px solid var(--border-color);
                color: var(--text-primary);
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 10px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .preset-btn:hover {
                background: var(--accent-primary);
                color: #000;
                border-color: var(--accent-primary);
            }
        `;
        document.head.appendChild(style);
        
        // Add pattern generation functionality
        document.getElementById('generate-pattern').addEventListener('click', function() {
            const patternInput = document.getElementById('pattern-input').value;
            if (patternInput.trim()) {
                // Use the first grid quarter for pattern generation
                const firstQuarter = document.querySelector('.grid-quarter[data-quarter="1"]');
                if (firstQuarter) {
                    // Clear existing instruments in this quarter
                    firstQuarter.innerHTML = '';
                    
                    // Generate pattern
                    createPattern(patternInput, firstQuarter);
                    
                    // Update instruments array
                    updateInstrumentsFromDOM();
                }
            }
        });
        
        // Add preset pattern buttons functionality
        const presetButtons = patternControls.querySelectorAll('.preset-btn');
        presetButtons.forEach(button => {
            button.addEventListener('click', function() {
                const pattern = this.dataset.pattern;
                document.getElementById('pattern-input').value = pattern;
                
                // Generate the pattern immediately
                const firstQuarter = document.querySelector('.grid-quarter[data-quarter="1"]');
                if (firstQuarter) {
                    firstQuarter.innerHTML = '';
                    createPattern(pattern, firstQuarter);
                    updateInstrumentsFromDOM();
                }
            });
        });
    }
    
    // Function to update instruments array from DOM
    function updateInstrumentsFromDOM() {
        instruments = [];
        
        gridQuarters.forEach(quarter => {
            const quarterInstruments = quarter.querySelectorAll('.instrument');
            quarterInstruments.forEach(instElement => {
                instruments.push({
                    id: instElement.dataset.id,
                    element: instElement,
                    type: instElement.dataset.instrument,
                    strudel: instElement.dataset.strudel || '',
                    x: parseFloat(instElement.style.left.replace('px', '')),
                    y: parseFloat(instElement.style.top.replace('px', '')),
                    quarter: quarter.dataset.quarter,
                    duration: 500,
                    volume: 80,
                    pitch: 440,
                    pan: 0,
                    attack: 0.1,
                    decay: 0.5,
                    waveform: 'sine'
                });
            });
        });
    }
      
    function getInstrumentIcon(type) {
        switch(type) {
            case 'sine': return '🌊';
            case 'square': return '▢';
            case 'sawtooth': return '🔺';
            case 'triangle': return '△';
            case 'piano': return '🎹';
            case 'guitar': return '🎸';
            default: return '🎵';
        }
    }
      
    // Selected instrument
    let selectedInstrument = null;
    
    // Audio Effects Manager
    let audioEffectsManager = null;
      
    // Play button
    document.getElementById('playBtn').addEventListener('click', function() {
        playInstruments();
    });
      
    // Stop button
    document.getElementById('stopBtn').addEventListener('click', function() {
        Tone.Transport.stop();
    });
      
    // Delete button
    document.getElementById('deleteBtn').addEventListener('click', function() {
        if (selectedInstrument) {
            selectedInstrument.element.remove();
            instruments = instruments.filter(inst => inst.id !== selectedInstrument.id);
            selectedInstrument = null;
            document.getElementById('side-panel').classList.remove('visible');
            document.getElementById('workspace-area').classList.remove('showing-side-panel');
            updatePropertyPanel();
        }
    });
      
    // Clear button
    document.getElementById('clearBtn').addEventListener('click', function() {
        gridQuarters.forEach(quarter => {
            quarter.innerHTML = '';
        });
        instruments = [];
        selectedInstrument = null;
        document.getElementById('side-panel').classList.remove('visible');
        document.getElementById('workspace-area').classList.remove('showing-side-panel');
        updatePropertyPanel();
        // Save complete project including grid data, instrument effects, and settings
        function saveCompleteProject() {
            try {
                // Create project state object
                const projectState = {
                    version: '2.0',
                    timestamp: new Date().toISOString(),
                    instruments: [],
                    audioEffects: {},
                    settings: {}
                };
                
                // Save all instruments with their properties and positions
                instruments.forEach(instrument => {
                    const instrumentData = {
                        id: instrument.id,
                        type: instrument.type,
                        strudel: instrument.strudel || '',
                        x: instrument.x,
                        y: instrument.y,
                        quarter: instrument.quarter,
                        duration: instrument.duration || 500,
                        volume: instrument.volume || 80,
                        pitch: instrument.pitch || 440,
                        pan: instrument.pan || 0,
                        attack: instrument.attack || 0.1,
                        decay: instrument.decay || 0.5,
                        waveform: instrument.waveform || 'sine'
                    };
                    
                    // Add audio effects for this instrument if available
                    if (audioEffectsManager && audioEffectsManager.getInstrumentEffects) {
                        const instrumentEffects = audioEffectsManager.getInstrumentEffects(instrument.id);
                        if (instrumentEffects) {
                            instrumentData.effects = instrumentEffects;
                        }
                    }
                    
                    projectState.instruments.push(instrumentData);
                });
                
                // Save global audio effects settings
                if (audioEffectsManager && audioEffectsManager.defaultEffects) {
                    projectState.audioEffects = { ...audioEffectsManager.defaultEffects };
                }
                
                // Save general settings
                if (typeof SettingsManager !== 'undefined' && SettingsManager.getSettings) {
                    projectState.settings = SettingsManager.getSettings();
                }
                
                // Save to localStorage
                localStorage.setItem('pixelAudioCompleteProject', JSON.stringify(projectState));
                
                // Show success notification
                alert('Project saved successfully! All instruments, effects, and settings have been saved.');
                console.log('Project saved:', projectState);
                
            } catch (error) {
                console.error('Error saving project:', error);
                alert('Error saving project: ' + error.message);
            }
        }
        
        // Load complete project function
        function loadCompleteProject() {
            try {
                const projectData = localStorage.getItem('pixelAudioCompleteProject');
                if (projectData) {
                    const parsed = JSON.parse(projectData);
                    console.log('Loading project:', parsed);
                    
                    // Clear existing instruments
                    gridQuarters.forEach(quarter => {
                        quarter.innerHTML = '';
                    });
                    instruments = [];
                    
                    // Recreate instruments from saved data
                    if (parsed.instruments && parsed.instruments.length > 0) {
                        parsed.instruments.forEach(instData => {
                            const quarter = document.querySelector(`.grid-quarter[data-quarter="${instData.quarter}"]`);
                            if (quarter) {
                                // Create instrument element
                                const instrument = document.createElement('div');
                                instrument.className = 'instrument';
                                instrument.textContent = getInstrumentIcon(instData.type);
                                instrument.style.left = `${instData.x - 25}px`;
                                instrument.style.top = `${instData.y - 25}px`;
                                instrument.dataset.instrument = instData.type;
                                instrument.dataset.id = instData.id;
                                instrument.dataset.strudel = instData.strudel || '';
                                
                                // Make draggable
                                instrument.draggable = true;
                                instrument.addEventListener('dragstart', function(e) {
                                    draggedInstrument = this;
                                    e.dataTransfer.setData('text/plain', this.dataset.instrument);
                                    e.dataTransfer.setData('strudel', this.dataset.strudel || '');
                                    this.classList.add('dragging');
                                });
                                
                                instrument.addEventListener('dragend', function() {
                                    this.classList.remove('dragging');
                                });
                                
                                // Add click event to select instrument
                                instrument.addEventListener('click', function(e) {
                                    e.stopPropagation();
                                    selectInstrument(this.dataset.id);
                                });
                                
                                quarter.appendChild(instrument);
                                
                                // Add to instruments array
                                instruments.push({
                                    id: instData.id,
                                    element: instrument,
                                    type: instData.type,
                                    strudel: instData.strudel || '',
                                    x: instData.x,
                                    y: instData.y,
                                    quarter: instData.quarter,
                                    duration: instData.duration || 500,
                                    volume: instData.volume || 80,
                                    pitch: instData.pitch || 440,
                                    pan: instData.pan || 0,
                                    attack: instData.attack || 0.1,
                                    decay: instData.decay || 0.5,
                                    waveform: instData.waveform || 'sine',
                                    effects: instData.effects || {}
                                });
                                
                                // Restore instrument effects if available
                                if (instData.effects && audioEffectsManager) {
                                    audioEffectsManager.instrumentEffects[instData.id] = instData.effects;
                                }
                            }
                        });
                    }
                    
                    // Restore global audio effects
                    if (parsed.audioEffects && audioEffectsManager) {
                        audioEffectsManager.defaultEffects = { ...parsed.audioEffects };
                    }
                    
                    // Restore settings
                    if (parsed.settings && typeof SettingsManager !== 'undefined') {
                        SettingsManager.settings = { ...SettingsManager.settings, ...parsed.settings };
                        SettingsManager.applySettings();
                    }
                    
                    alert('Project loaded successfully!');
                    console.log('Project loaded successfully');
                    
                } else {
                    alert('No saved project found.');
                }
            } catch (error) {
                console.error('Error loading project:', error);
                alert('Error loading project: ' + error.message);
            }
        }
        
        // Add load project button functionality
        const loadProjectBtn = document.getElementById('loadProject');
        if (loadProjectBtn) {
            loadProjectBtn.addEventListener('click', function() {
                if (confirm('Load saved project? This will replace your current work.')) {
                    loadCompleteProject();
                }
            });
        }
        
        // Initialize pattern controls
        addPatternControls();
    });
      
    // Update property panel based on selected instrument
    function updatePropertyPanel() {
        const soundProperties = document.getElementById('sound-properties');
           
        if (!selectedInstrument) {
            // Reset to default Tone.js settings
            soundProperties.classList.remove('strudel-mode');
            document.getElementById('instrumentType').value = 'sine';
            document.getElementById('duration').value = 500;
            document.getElementById('durationVal').textContent = '500';
            document.getElementById('volume').value = 80;
            document.getElementById('volumeVal').textContent = '80';
            document.getElementById('pitch').value = 440;
            document.getElementById('pitchVal').textContent = '440';
            document.getElementById('pan').value = 0;
            document.getElementById('panVal').textContent = '0';
            document.getElementById('attack').value = 0.1;
            document.getElementById('attackVal').textContent = '0.1';
            document.getElementById('decay').value = 0.5;
            document.getElementById('decayVal').textContent = '0.5';
            document.getElementById('waveform').value = 'sine';
            document.getElementById('strudelSample').value = '';
            
            // Reset audio effects panel
            if (audioEffectsManager) {
                audioEffectsManager.setCurrentInstrument(null);
            }
            return;
        }
          
        // Check if this is a Strudel instrument
        const isStrudel = selectedInstrument.strudel && selectedInstrument.strudel.length > 0;
          
        if (isStrudel) {
            soundProperties.classList.add('strudel-mode');
            document.getElementById('strudelSample').value = selectedInstrument.strudel;
        } else {
            soundProperties.classList.remove('strudel-mode');
        }
          
        document.getElementById('instrumentType').value = selectedInstrument.type;
        document.getElementById('duration').value = selectedInstrument.duration || 500;
        document.getElementById('durationVal').textContent = selectedInstrument.duration || 500;
        document.getElementById('volume').value = selectedInstrument.volume || 80;
        document.getElementById('volumeVal').textContent = selectedInstrument.volume || 80;
          
        // Only update Tone.js specific properties if not a Strudel instrument
        if (!isStrudel) {
            document.getElementById('pitch').value = selectedInstrument.pitch || 440;
            document.getElementById('pitchVal').textContent = selectedInstrument.pitch || 440;
            document.getElementById('pan').value = selectedInstrument.pan || 0;
            document.getElementById('panVal').textContent = selectedInstrument.pan || 0;
            document.getElementById('attack').value = selectedInstrument.attack || 0.1;
            document.getElementById('attackVal').textContent = selectedInstrument.attack || 0.1;
            document.getElementById('decay').value = selectedInstrument.decay || 0.5;
            document.getElementById('decayVal').textContent = selectedInstrument.decay || 0.5;
            document.getElementById('waveform').value = selectedInstrument.waveform || 'sine';
        }
    }
      
    // Update property values when sliders change
    document.getElementById('duration').addEventListener('input', function() {
        document.getElementById('durationVal').textContent = this.value;
        if (selectedInstrument) {
            selectedInstrument.duration = parseInt(this.value);
        }
    });
      
    document.getElementById('volume').addEventListener('input', function() {
        document.getElementById('volumeVal').textContent = this.value;
        if (selectedInstrument) {
            selectedInstrument.volume = parseInt(this.value);
        }
    });
      
    document.getElementById('pitch').addEventListener('input', function() {
        document.getElementById('pitchVal').textContent = this.value;
        if (selectedInstrument) {
            selectedInstrument.pitch = parseInt(this.value);
        }
    });
      
    document.getElementById('pan').addEventListener('input', function() {
        document.getElementById('panVal').textContent = this.value;
        if (selectedInstrument) {
            selectedInstrument.pan = parseFloat(this.value);
        }
    });
      
    document.getElementById('attack').addEventListener('input', function() {
        document.getElementById('attackVal').textContent = this.value;
        if (selectedInstrument) {
            selectedInstrument.attack = parseFloat(this.value);
        }
    });
      
    document.getElementById('decay').addEventListener('input', function() {
        document.getElementById('decayVal').textContent = this.value;
        if (selectedInstrument) {
            selectedInstrument.decay = parseFloat(this.value);
        }
    });
      
    document.getElementById('instrumentType').addEventListener('change', function() {
        if (selectedInstrument) {
            const newType = this.value;
            selectedInstrument.type = newType;
            selectedInstrument.element.textContent = getInstrumentIcon(newType);
              
            // Update Strudel sample if this is a Strudel instrument
            const strudelSamples = {
                'agogo': 'agogo(5)',
                'anvil': 'anvil(9)',
                'balafon': 'balafon(6)',
                'bongo': 'bongo(28)',
                'brakedrum': 'brakedrum(17)',
                'cabasa': 'cabasa(6)',
                '9000_bd': '9000_bd(1)',
                '9000_sd': '9000_sd(1)',
                '9000_hh': '9000_hh(1)',
                '9000_oh': '9000_oh(1)',
                '9000_lt': '9000_lt(2)',
                '9000_mt': '9000_mt(1)',
                '9000_ht': '9000_ht(2)',
                '9000_rd': '9000_rd(2)',
                '9000_cr': '9000_cr(2)',
                '9000_rim': '9000_rim(1)',
                'ace_bd': 'ace_bd(3)',
                'brown': 'brown',
                'bytebeat': 'bytebeat',
                'crackle': 'crackle'
            };
              
            if (strudelSamples[newType]) {
                selectedInstrument.strudel = strudelSamples[newType];
            } else {
                selectedInstrument.strudel = '';
            }
              
            // Update the property panel to reflect changes
            updatePropertyPanel();
        }
    });
      
    document.getElementById('waveform').addEventListener('change', function() {
        if (selectedInstrument) {
            selectedInstrument.waveform = this.value;
        }
    });
      
    function playInstruments() {
        if (instruments.length === 0) return;
          
        // Check if audio context is running, if not, start it
        if (Tone.context.state !== 'running') {
            Tone.start().then(() => {
                console.log('Audio context started automatically');
                playInstrumentsAfterAudioStart();
            }).catch(error => {
                console.error('Could not start audio context:', error);
                alert('Please click "Enable Audio" first to initialize the audio system.');
            });
            return;
        }
          
        playInstrumentsAfterAudioStart();
    }
      
    function playInstrumentsAfterAudioStart() {
        // Separate instruments by type
        const toneInstruments = instruments.filter(inst => !inst.strudel);
        const strudelInstruments = instruments.filter(inst => inst.strudel);
          
        // Play Tone.js instruments
        toneInstruments.forEach((instrument, index) => {
            const pitch = instrument.pitch || calculatePitchFromPosition(instrument);
            const volume = instrument.volume ? Tone.gainToDb(instrument.volume / 100) : calculateVolumeFromPosition(instrument);
            const duration = instrument.duration ? `${instrument.duration / 1000}n` : '8n';
              
            synth.set({
                oscillator: { type: instrument.waveform || 'sine' },
                envelope: {
                    attack: instrument.attack || 0.1,
                    decay: instrument.decay || 0.5,
                    sustain: 0.5,
                    release: 0.5
                }
            });
              
            synth.triggerAttackRelease(pitch, duration, `+${index * 0.1}`, volume);
        });
          
        // Play Strudel instruments
        if (strudelInstruments.length > 0 && window.strudel) {
            playStrudelInstruments(strudelInstruments);
        }
    }
      
    function playStrudelInstruments(strudelInstruments) {
        try {
            if (!strudelInitialized) {
                const { play, sample, stack } = window.strudel;
                strudelInitialized = true;
            }
              
            // Create a Strudel pattern from the instruments
            const patterns = strudelInstruments.map(inst => {
                return window.strudel.sample(inst.strudel);
            });
              
            // Play the stack of patterns
            const pattern = window.strudel.stack(...patterns);
            window.strudel.play(pattern);
              
        } catch (error) {
            console.error('Error playing Strudel instruments:', error);
            // Fallback to Tone.js if Strudel fails
            strudelInstruments.forEach((inst, index) => {
                synth.triggerAttackRelease(440, '8n', `+${index * 0.1}`, -12);
            });
        }
    }
      
    function calculatePitchFromPosition(instrument) {
        const quarter = instrument.quarter;
        const y = instrument.y;
        const rect = document.querySelector(`.grid-quarter[data-quarter="${quarter}"]`).getBoundingClientRect();
        const normY = y / rect.height;
        return 220 + (880 - 220) * normY;
    }
      
    function calculateVolumeFromPosition(instrument) {
        const quarter = instrument.quarter;
        const x = instrument.x;
        const rect = document.querySelector(`.grid-quarter[data-quarter="${quarter}"]`).getBoundingClientRect();
        const normX = x / rect.width;
        return -20 + (0 - (-20)) * normX;
    }
      
    // Audio initialization button
    document.getElementById('initAudioBtn').addEventListener('click', async function() {
        try {
            if (Tone.context.state !== 'running') {
                await Tone.start();
                this.textContent = 'Audio Enabled';
                this.style.backgroundColor = '#55aa55';
                console.log('Audio context started successfully');
            }
        } catch (error) {
            console.error('Error starting audio context:', error);
            this.textContent = 'Audio Error';
            this.style.backgroundColor = '#ff5555';
        }
    });
      
    // Panel toggle button
    document.getElementById('panel-toggle').addEventListener('click', function() {
        const sidePanel = document.getElementById('side-panel');
        sidePanel.classList.toggle('visible');
    });
    
    // Initialize Audio Effects Manager
    audioEffectsManager = Object.create(AudioEffectsManager);
    audioEffectsManager.init({
        instruments: instruments,
        selectedInstrument: selectedInstrument
    });
      
    // Save button - save complete project
   const saveProjectBtn = document.getElementById('saveProject');
   if (saveProjectBtn) {
       saveProjectBtn.addEventListener('click', function() {
           saveCompleteProject();
       });
   }
   
   // Settings button
   const settingsBtn = document.getElementById('settingsBtn');
   if (settingsBtn) {
       settingsBtn.addEventListener('click', function() {
           if (typeof SettingsManager !== 'undefined' && SettingsManager.toggleSettings) {
               SettingsManager.toggleSettings();
           } else {
               document.getElementById('settings-modal').style.display = 'flex';
           }
       });
   }

    // Close modal
    const modalClose = document.getElementById('modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', function() {
            if (typeof SettingsManager !== 'undefined' && SettingsManager.closeSettings) {
                SettingsManager.closeSettings();
            } else {
                document.getElementById('settings-modal').style.display = 'none';
            }
        });
    }

    // Save settings
    const saveSettings = document.getElementById('saveSettings');
    if (saveSettings) {
        saveSettings.addEventListener('click', function() {
            if (typeof SettingsManager !== 'undefined' && SettingsManager.saveSettings) {
                SettingsManager.saveSettings();
            }
            if (typeof SettingsManager !== 'undefined' && SettingsManager.closeSettings) {
                SettingsManager.closeSettings();
            } else {
                document.getElementById('settings-modal').style.display = 'none';
            }
        });
    }
});