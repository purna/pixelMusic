/**
 * Tutorial Configuration System
 *
 * This file defines the tutorial steps configuration and provides
 * an easy-to-use interface for setting up tutorials.
 */

/*
Config Seettings
arrowPositionOverride
Vertical Arrows (top/bottom): 'top-third', 'middle-third', 'bottom-third'
Horizontal Arrows (left/right): 'left-third', 'center-third', 'right-third'
Center Position: 'center' (default)
*/

class TutorialConfig {
    constructor() {
        // Default tutorial configuration
        this.tutorials = {
            'main': {
                enabled: true,
                steps: [
                    {
                        id: 'welcome',
                        elementId: 'workspace-area',
                        position: 'center',
                        arrowPosition: 'none', // No arrow for center position
                        arrowPositionOverride: 'center', // Arrow position along the side (center, top-third, middle-third, bottom-third)
                        marginOverride: '0',
                        heading: 'Welcome to Pixel Audio!',
                        content: 'This quick tutorial will guide you through the main features of the SFX Studio Pro.',
                        showNext: true,
                        showSkip: true
                    },
                    {
                        id: 'layers',
                        elementId: 'panel-layers',
                        position: 'right',
                        arrowPosition: 'left', // Arrow is on the left side of the tutorial panel, points left (away from tutorial panel)
                        arrowPositionOverride: 'top-third', // Arrow positioned in the top third of the right side
                        marginOverride: '60px', // Additional margin for better spacing
                        heading: 'Layers Panel',
                        content: 'Here you can add, remove, and manage different sound layers. Each layer can have its own unique sound settings.',
                        showNext: true,
                        showSkip: true
                    },
                    {
                        id: 'presets',
                        elementId: 'panel-presets',
                        position: 'right',
                        arrowPosition: 'left', // Arrow is on the left side of the tutorial panel, points left (away from tutorial panel)
                        arrowPositionOverride: 'middle-third',
                        marginOverride: '60px', // Additional margin for better spacing
                        heading: 'Presets',
                        content: 'Quickly load pre-configured sound presets for common game effects like jumps, explosions, and UI sounds.',
                        showNext: true,
                        showSkip: true
                    },
                    {
                        id: 'synthesizer',
                        elementId: 'fixed-tools-panel',
                        position: 'right',
                        arrowPosition: 'left', // Arrow is on the left side of the tutorial panel, points left (away from tutorial panel)
                        marginOverride: '35px', // Slightly less margin for this panel
                        heading: 'Synthesizer Controls',
                        content: 'Adjust waveform, envelope, frequency, and other parameters to create your perfect sound.',
                        showNext: true,
                        showSkip: true
                    },
                    {
                        id: 'timeline',
                        elementId: 'timeline-controls',
                        position: 'center',
                        arrowPosition: 'none', 
                        marginOverride: '0px', // More margin for timeline positioning
                        heading: 'Timeline',
                        content: 'Control playback and visualize your sound layers over time. Use the transport controls to play, stop, and adjust timing.',
                        showNext: true,
                        showSkip: true
                    },
            {
                id: 'export',
                elementId: 'exportMixBtn',
                position: 'bottom',
                arrowPosition: 'top', // Arrow is on the top side of the tutorial panel, points up (towards target panel)
                marginOverride: '25px', // Margin for export button positioning
                heading: 'Export Your Sounds',
                content: 'When you\'re happy with your creation, use the Export Mix button to save your sound as a WAV file.',
                showNext: true,
                showSkip: true
            },
            {
                id: 'strudel-samples',
                elementId: 'instrument-content',
                position: 'right',
                arrowPosition: 'left',
                arrowPositionOverride: 'middle-third',
                marginOverride: '60px',
                heading: 'Strudel Sample Library',
                content: 'Pixel Music uses Strudel\'s powerful sample library with curated, high-quality sounds including classic drum machines (TR-808, TR-909) and the Virtual Community Sound Library (VCSL). These samples are pre-processed and loaded in the background for instant use!',
                showNext: true,
                showSkip: true
            },
            {
                id: 'using-samples',
                elementId: 'strudel-example-input',
                position: 'bottom',
                arrowPosition: 'top',
                marginOverride: '25px',
                heading: 'Using Samples in Patterns',
                content: 'Create patterns using Strudel\'s mini-notation. Try examples like "s(\'[bd <hh oh>]*2\').bank(\'tr909\').dec(.4)" to use drum samples with effects!',
                showNext: true,
                showSkip: true
            }
                ]
            }
        };

        // Current tutorial state
        this.currentTutorial = 'main';
        this.currentStep = 0;
        this.isActive = false;
    }

    /**
     * Add a new tutorial
     * @param {string} tutorialId - Unique identifier for the tutorial
     * @param {Object} config - Tutorial configuration
     */
    addTutorial(tutorialId, config) {
        this.tutorials[tutorialId] = config;
    }

    /**
     * Add Strudel sample library tutorial
     * This tutorial explains the built-in sample library features
     */
    addStrudelSampleTutorial() {
        this.addTutorial('strudel-samples', {
            enabled: true,
            steps: [
                {
                    id: 'strudel-welcome',
                    elementId: 'workspace-area',
                    position: 'center',
                    arrowPosition: 'none',
                    arrowPositionOverride: 'center',
                    marginOverride: '0',
                    heading: 'Strudel Sample Library',
                    content: 'Pixel Music includes Strudel\'s powerful sample library with curated, high-quality sounds. Let\'s explore what\'s available!',
                    showNext: true,
                    showSkip: true
                },
                {
                    id: 'built-in-sounds',
                    elementId: 'instrument-content',
                    position: 'right',
                    arrowPosition: 'left',
                    arrowPositionOverride: 'top-third',
                    marginOverride: '60px',
                    heading: 'Built-in Sounds',
                    content: 'Strudel provides a curated base library with classic drum machine sounds like Roland TR-808 and TR-909. These are high-quality, pre-processed samples loaded in the background for instant use.',
                    showNext: true,
                    showSkip: true
                },
                {
                    id: 'sample-libraries',
                    elementId: 'instrument-content',
                    position: 'right',
                    arrowPosition: 'left',
                    arrowPositionOverride: 'middle-third',
                    marginOverride: '60px',
                    heading: 'Virtual Community Sound Library',
                    content: 'Strudel leverages instrument samples from the Virtual Community Sound Library (VCSL), providing a rich collection of diverse sounds from acoustic instruments to electronic textures.',
                    showNext: true,
                    showSkip: true
                },
                {
                    id: 'drum-kits',
                    elementId: 'instrument-content',
                    position: 'right',
                    arrowPosition: 'left',
                    arrowPositionOverride: 'middle-third',
                    marginOverride: '60px',
                    heading: 'Drum Kits & Percussion',
                    content: 'Explore comprehensive drum kits including TR-808, TR-909, TR-707, and LinnDrum samples. Plus a wide range of percussion instruments from congas to shakers.',
                    showNext: true,
                    showSkip: true
                },
                {
                    id: 'melodic-instruments',
                    elementId: 'instrument-content',
                    position: 'right',
                    arrowPosition: 'left',
                    arrowPositionOverride: 'middle-third',
                    marginOverride: '60px',
                    heading: 'Melodic Instruments',
                    content: 'From pianos and organs to synthesizers, mallets, strings, winds, and world instruments. Each category offers multiple variations for creative exploration.',
                    showNext: true,
                    showSkip: true
                },
                {
                    id: 'using-samples',
                    elementId: 'strudel-example-input',
                    position: 'bottom',
                    arrowPosition: 'top',
                    marginOverride: '25px',
                    heading: 'Using Samples in Patterns',
                    content: 'Create patterns using Strudel\'s mini-notation. Try examples like "s(\'[bd <hh oh>]*2\').bank(\'tr909\').dec(.4)" to use drum samples with effects!',
                    showNext: true,
                    showSkip: true
                },
                {
                    id: 'sample-complete',
                    elementId: 'workspace-area',
                    position: 'center',
                    arrowPosition: 'none',
                    arrowPositionOverride: 'center',
                    marginOverride: '0',
                    heading: 'Start Creating!',
                    content: 'Now you know about Strudel\'s sample library! Drag instruments from the sidebar or use the pattern generator to create music with these high-quality samples.',
                    showNext: false,
                    showSkip: true
                }
            ]
        });
    }

    /**
     * Get tutorial by ID
     * @param {string} tutorialId - Tutorial identifier
     * @returns {Object|null} Tutorial configuration or null if not found
     */
    getTutorial(tutorialId) {
        return this.tutorials[tutorialId] || null;
    }

    /**
     * Get current step in current tutorial
     * @returns {Object|null} Current step or null if no active tutorial
     */
    getCurrentStep() {
        const tutorial = this.getTutorial(this.currentTutorial);
        if (!tutorial || !tutorial.steps || this.currentStep >= tutorial.steps.length) {
            return null;
        }
        return tutorial.steps[this.currentStep];
    }

    /**
     * Move to next step
     * @returns {Object|null} Next step or null if tutorial is complete
     */
    nextStep() {
        const tutorial = this.getTutorial(this.currentTutorial);
        if (!tutorial || !tutorial.steps) return null;

        this.currentStep++;
        if (this.currentStep >= tutorial.steps.length) {
            // Tutorial complete
            return null;
        }
        return this.getCurrentStep();
    }

    /**
     * Move to previous step
     * @returns {Object|null} Previous step or null if at beginning
     */
    prevStep() {
        if (this.currentStep <= 0) return null;
        this.currentStep--;
        return this.getCurrentStep();
    }

    /**
     * Reset tutorial to first step
     */
    resetTutorial() {
        this.currentStep = 0;
    }

    /**
     * Start a specific tutorial
     * @param {string} tutorialId - Tutorial to start
     */
    startTutorial(tutorialId) {
        if (this.tutorials[tutorialId]) {
            this.currentTutorial = tutorialId;
            this.currentStep = 0;
            this.isActive = true;
        }
    }

    /**
     * Stop current tutorial
     */
    stopTutorial() {
        this.isActive = false;
    }

    /**
     * Check if tutorial is active
     * @returns {boolean} True if tutorial is active
     */
    isTutorialActive() {
        return this.isActive;
    }

    /**
     * Get position class for tutorial step
     * @param {string} position - Position value from step config
     * @returns {string} CSS class for positioning
     */
    getPositionClass(position) {
        switch(position) {
            case 'top': return 'tutorial-top';
            case 'bottom': return 'tutorial-bottom';
            case 'left': return 'tutorial-left';
            case 'right': return 'tutorial-right';
            case 'center': return 'tutorial-center';
            default: return 'tutorial-right';
        }
    }
}

// Export for use in other modules
const tutorialConfig = new TutorialConfig();