/**
 * Strudel Sample Library Access Script
 * 
 * This script demonstrates how to access and use Strudel's sample library
 * in your own projects.
 * 
 * Usage:
 * 1. Include this script in your HTML file
 * 2. Call loadStrudelSamples() to initialize
 * 3. Use the samples in your patterns
 */

class StrudelSampleManager {
  constructor() {
    this.isInitialized = false;
    this.loadedLibraries = [];
  }

  /**
   * Initialize Strudel and load sample libraries
   * @param {Object} options - Configuration options
   * @param {boolean} options.loadDirt - Load Dirt Samples (default: true)
   * @param {boolean} options.loadDrumMachines - Load Drum Machines (default: true)
   * @param {boolean} options.loadVCSL - Load VCSL samples (default: false)
   * @returns {Promise<boolean>} Success status
   */
  async initialize(options = {}) {
    const config = {
      loadDirt: true,
      loadDrumMachines: true,
      loadVCSL: false,
      ...options
    };

    try {
      // Check if Strudel is available
      if (typeof Strudel === 'undefined' && typeof window.Strudel === 'undefined') {
        console.warn('Strudel not found. Make sure to include Strudel.js');
        return false;
      }

      const StrudelLib = window.Strudel || Strudel;

      // Initialize Strudel audio
      if (StrudelLib.start) {
        await StrudelLib.start();
      }

      // Load sample libraries
      if (config.loadDirt) {
        await this.loadDirtSamples();
      }

      if (config.loadDrumMachines) {
        await this.loadDrumMachines();
      }

      if (config.loadVCSL) {
        await this.loadVCSLSamples();
      }

      this.isInitialized = true;
      console.log('✓ Strudel Sample Manager initialized');
      return true;

    } catch (error) {
      console.error('Failed to initialize Strudel Sample Manager:', error);
      return false;
    }
  }

  /**
   * Load Dirt Samples library
   * @returns {Promise<void>}
   */
  async loadDirtSamples() {
    try {
      if (window.samples || (window.Strudel && window.Strudel.samples)) {
        const samples = window.samples || window.Strudel.samples;
        await samples('github:tidalcycles/dirt-samples');
        this.loadedLibraries.push('dirt-samples');
        console.log('✓ Dirt Samples loaded');
      }
    } catch (error) {
      console.warn('Could not load Dirt Samples:', error);
    }
  }

  /**
   * Load Drum Machines from dough-samples
   * @returns {Promise<void>}
   */
  async loadDrumMachines() {
    try {
      const base = 'https://raw.githubusercontent.com/felixroos/dough-samples/main/';
      
      if (window.samples || (window.Strudel && window.Strudel.samples)) {
        const samples = window.samples || window.Strudel.samples;
        await samples(
          `${base}/tidal-drum-machines.json`,
          `${base}/tidal-drum-machines/machines/`
        );
        this.loadedLibraries.push('drum-machines');
        console.log('✓ Drum Machines loaded');
      }
    } catch (error) {
      console.warn('Could not load Drum Machines:', error);
    }
  }

  /**
   * Load VCSL (Virtual Community Sound Library)
   * @returns {Promise<void>}
   */
  async loadVCSLSamples() {
    try {
      const base = 'https://raw.githubusercontent.com/felixroos/dough-samples/main/';
      
      if (window.samples || (window.Strudel && window.Strudel.samples)) {
        const samples = window.samples || window.Strudel.samples;
        await samples(
          `${base}/vcsl.json`,
          `${base}/VCSL/`
        );
        this.loadedLibraries.push('vcsl');
        console.log('✓ VCSL samples loaded');
      }
    } catch (error) {
      console.warn('Could not load VCSL samples:', error);
    }
  }

  /**
   * Load custom sample library from GitHub
   * @param {string} repo - GitHub repository (e.g., 'user/repo')
   * @param {string} branch - Branch name (default: 'main')
   * @returns {Promise<boolean>}
   */
  async loadFromGitHub(repo, branch = 'main') {
    try {
      if (window.samples || (window.Strudel && window.Strudel.samples)) {
        const samples = window.samples || window.Strudel.samples;
        await samples(`github:${repo}/${branch}`);
        this.loadedLibraries.push(`github:${repo}`);
        console.log(`✓ Loaded samples from ${repo}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to load samples from ${repo}:`, error);
      return false;
    }
  }

  /**
   * Load custom sample map
   * @param {Object} sampleMap - Sample map object
   * @param {string} baseUrl - Base URL for samples
   * @returns {Promise<boolean>}
   */
  async loadCustomSamples(sampleMap, baseUrl = '') {
    try {
      if (window.samples || (window.Strudel && window.Strudel.samples)) {
        const samples = window.samples || window.Strudel.samples;
        await samples(sampleMap, baseUrl);
        console.log('✓ Custom samples loaded');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to load custom samples:', error);
      return false;
    }
  }

  /**
   * Create a pattern with loaded samples
   * @param {string} patternStr - Pattern string
   * @param {Object} options - Pattern options
   * @returns {Object} Pattern object
   */
  createPattern(patternStr, options = {}) {
    if (!this.isInitialized) {
      console.warn('Sample manager not initialized');
      return null;
    }

    try {
      let pattern = window.s(patternStr);

      // Apply options
      if (options.bank) {
        pattern = pattern.bank(options.bank);
      }
      if (options.decay !== undefined) {
        pattern = pattern.dec(options.decay);
      }
      if (options.speed !== undefined) {
        pattern = pattern.speed(options.speed);
      }
      if (options.gain !== undefined) {
        pattern = pattern.gain(options.gain);
      }

      return pattern;
    } catch (error) {
      console.error('Failed to create pattern:', error);
      return null;
    }
  }

  /**
   * Get list of available sample libraries
   * @returns {Array<string>}
   */
  getLoadedLibraries() {
    return [...this.loadedLibraries];
  }

  /**
   * Check if manager is initialized
   * @returns {boolean}
   */
  isReady() {
    return this.isInitialized;
  }
}

// Export for Node.js or attach to window for browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StrudelSampleManager;
} else {
  window.StrudelSampleManager = StrudelSampleManager;
}

// Auto-initialize on user interaction (optional)
document.addEventListener('DOMContentLoaded', () => {
  // Create global instance
  if (!window.strudelSamples) {
    window.strudelSamples = new StrudelSampleManager();
  }

  // Auto-initialize on first user click
  const initOnClick = () => {
    if (!window.strudelSamples.isReady()) {
      window.strudelSamples.initialize({
        loadDirt: true,
        loadDrumMachines: true,
        loadVCSL: false
      });
    }
    document.removeEventListener('click', initOnClick);
  };

  document.addEventListener('click', initOnClick, { once: true });
});

// Example usage:
/*
async function example() {
  const manager = new StrudelSampleManager();
  
  // Initialize with default libraries
  await manager.initialize({
    loadDirt: true,
    loadDrumMachines: true,
    loadVCSL: false
  });
  
  // Create and play a pattern
  const pattern = manager.createPattern('bd sd bd sd,hh*16', {
    bank: 'tr909',
    decay: 0.4
  });
  
  if (pattern) {
    pattern.play();
  }
}
*/
