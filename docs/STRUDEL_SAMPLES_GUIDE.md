# Strudel Sample Library Access Guide

This guide explains how to access and use the actual sound files from Strudel's built-in sample library in your own projects.

## Overview

Strudel provides several ways to access its sample library:

1. **Built-in samples** - Pre-loaded in the Strudel library
2. **GitHub repositories** - Public sample collections
3. **Custom sample loading** - Load your own samples
4. **Local file serving** - Serve samples from your machine

## 1. Built-in Strudel Samples

By default, Strudel includes a curated sample library with:
- Classic drum machine sounds (TR-808, TR-909, TR-707, LinnDrum)
- Virtual Community Sound Library (VCSL) samples
- Hundreds of high-quality instrument samples

### Default Sample Repositories

The main sample repositories used by Strudel are:

#### **Dirt Samples** (TidalCycles)
- **GitHub**: `tidalcycles/dirt-samples`
- **URL**: `github:tidalcycles/dirt-samples`
- **Samples**: Classic drum breaks, percussion, and effects
- **Usage**: `samples('github:tidalcycles/dirt-samples')`

#### **Dough Samples** (Default Strudel Samples)
- **GitHub**: `felixroos/dough-samples`
- **URL**: `https://raw.githubusercontent.com/felixroos/dough-samples/main/`
- **Contains**:
  - `tidal-drum-machines.json` - TR-808, TR-900, TR-707, etc.
  - `piano.json` - Various piano samples
  - `Dirt-Samples.json` - Subset of dirt samples
  - `EmuSP12.json` - E-mu SP-12 samples
  - `vcsl.json` - Virtual Community Sound Library
  - `mridangam.json` - Indian percussion

#### **VCSL (Virtual Community Sound Library)**
- **GitHub**: `sgossner/VCSL`
- **URL**: `github:sgossner/VCSL`
- **Description**: Community-contributed samples from around the world

## 2. Accessing Samples in Your Project

### Method 1: Using GitHub Shortcut (Recommended)

```javascript
// Load the default Strudel samples
samples('github:tidalcycles/dirt-samples');

// Use the samples
s("bd sd bd sd,hh*16");
```

### Method 2: Direct URL Loading

```javascript
// Load from raw GitHub URL
samples('https://raw.githubusercontent.com/felixroos/dough-samples/main/strudel.json');

// Or load specific sample maps
const base = 'https://raw.githubusercontent.com/felixroos/dough-samples/main/';
await samples(`${base}/tidal-drum-machines.json`, `${base}/tidal-drum-machines/machines/`);
await samples(`${base}/vcsl.json`, `${base}/VCSL/`);
```

### Method 3: Loading Multiple Sample Libraries

```javascript
async function loadAllSamples() {
  const base = 'https://raw.githubusercontent.com/felixroos/dough-samples/main/';
  
  await Promise.all([
    samples(`${base}/tidal-drum-machines.json`, `${base}/tidal-drum-machines/machines/`),
    samples(`${base}/piano.json`, `${base}/piano/`),
    samples(`${base}/Dirt-Samples.json`, `${base}/Dirt-Samples/`),
    samples(`${base}/EmuSP12.json`, `${base}/tidal-drum-machines/machines/`),
    samples(`${base}/vcsl.json`, `${base}/VCSL/`),
    samples(`${base}/mridangam.json`, `${base}/mrid/`),
  ]);
}

// Call this before using samples
await loadAllSamples();
s("bd [sn cp] hh*4");
```

## 3. Available Sample Libraries

### Drum Machines
- **Roland TR-808**: `bd`, `sd`, `hh`, `oh`, `rim`, `cp`, `mt`, `ht`, `lt`, `cr`, `rd`
- **Roland TR-909**: Electronic drum sounds
- **Roland TR-707**: Digital drum machine
- **LinnDrum**: Classic 80s drum machine
- **Akai Linn**: Linn LM-1 samples

### Instruments (VCSL)
- **Pianos**: Grand, upright, electric
- **Organs**: Pipe, Hammond, electronic
- **Guitars**: Acoustic, electric, bass
- **Strings**: Violin, cello, harp
- **Winds**: Saxophone, flute, clarinet
- **World**: Tabla, sitar, balafon, kalimba
- **Synths**: Sawtooth, sine, square, triangle
- **Textures**: Pads, atmospheres, effects

### Percussion
- **Drums**: Conga, bongo, djembe, darbuka
- **Shakers**: Various types and sizes
- **Cymbals**: Ride, crash, hi-hats
- **Wood**: Claves, woodblock, guiro
- **Metal**: Cowbell, triangle, bell

## 4. Using Samples in Strudel Patterns

### Basic Usage

```javascript
// Load samples first
samples('github:tidalcycles/dirt-samples');

// Use in patterns
s("bd sn");              // Kick and snare
s("bd*2 sn");            // Double kick
s("[bd sn] hh");         // Grouped patterns
s("bd <sn cp> hh");      // Alternating patterns
```

### With Drum Banks

```javascript
// Use specific drum machine banks
s("bd sd").bank("tr909");     // TR-909 samples
s("bd sd").bank("tr808");     // TR-808 samples
s("bd sd").bank("linn");      // LinnDrum samples

// With decay control
s("bd sd").bank("tr909").dec(0.4);
```

### Sample Variations

```javascript
// Use different variations of the same sound
s("bd:0 bd:1 bd:2");     // Different kick samples
s("hh:0 [hh:1 hh:2]");   // Closed and open hi-hat

// Or use the n() function
s("bd").n("0 1 2");
```

## 5. Loading Custom Samples

### From GitHub

```javascript
// Your own GitHub repository
samples('github:username/repo-name/branch');

// Example with specific path
samples({
  'mykick': 'samples/kick.wav',
  'mysnare': 'samples/snare.wav'
}, 'github:username/repo-name/main/');
```

### From URLs

```javascript
// Direct URLs to audio files
samples({
  'kick': 'https://example.com/kick.wav',
  'snare': 'https://example.com/snare.wav',
  'hat': 'https://example.com/hat.wav'
});

// Use them
s("kick snare hat");
```

### From Local Files (Development)

```bash
# Install the sampler tool
npm install -g @strudel/sampler

# Navigate to your samples folder
cd my-samples

# Start the server
npx @strudel/sampler
```

```javascript
// Load from local server
samples('http://localhost:5432/');
s("mykick mysnare");
```

## 6. Sample Map Format

### Basic Structure

```javascript
samples({
  '_base': 'https://example.com/samples/',  // Base URL
  'bd': 'drums/kick.wav',                    // Single file
  'sd': ['drums/snare1.wav', 'drums/snare2.wav'],  // Multiple files
  'hh': 'drums/hihat.wav'
});
```

### strudel.json Format

```json
{
  "_base": "https://example.com/samples/",
  "bd": "drums/kick.wav",
  "sd": ["drums/snare1.wav", "drums/snare2.wav"],
  "hh": "drums/hihat.wav"
}
```

## 7. Complete Example for Your Project

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/@strudel/webaudio@1.2.6/dist/strudel.min.js"></script>
</head>
<body>
  <button onclick="startMusic()">Play</button>
  
  <script>
    async function startMusic() {
      // Initialize Strudel
      await Strudel.start();
      
      // Load samples
      await Strudel.samples('github:tidalcycles/dirt-samples');
      
      // Or load multiple libraries
      const base = 'https://raw.githubusercontent.com/felixroos/dough-samples/main/';
      await Strudel.samples(`${base}/tidal-drum-machines.json`, `${base}/tidal-drum-machines/machines/`);
      
      // Create a pattern
      const pattern = Strudel.s("bd [sn cp] hh*4")
        .bank("tr909")
        .dec(0.3);
      
      // Play it
      pattern.play();
    }
  </script>
</body>
</html>
```

## 8. Important Notes

### Caching
- Browsers cache sample files aggressively
- Add version numbers or cache-busting to URLs if you update samples
- Example: `samples('github:tidalcycles/dirt-samples?v=2')`

### CORS
- Samples must be served with proper CORS headers
- GitHub raw URLs work well for this
- For local development, use a local server

### Performance
- Large sample libraries take time to load
- Load samples once and reuse them
- Consider lazy-loading samples as needed

### Licensing
- Check licenses for sample libraries
- Dirt Samples: Various (check repository)
- VCSL: Community-contributed, check individual samples
- Drum machine samples: Often copyright-free

## 9. Troubleshooting

### Samples Not Loading
1. Check browser console for errors
2. Verify URLs are correct
3. Check CORS headers
4. Ensure files exist at the specified paths

### No Sound
1. Check browser autoplay policies
2. Ensure audio context is started (usually requires user interaction)
3. Verify sample files are valid audio formats

### Slow Loading
1. Large sample files take time
2. Consider using compressed formats (mp3, ogg)
3. Load only the samples you need

## 10. Additional Resources

- **Strudel Documentation**: https://strudel.cc
- **Dirt Samples**: https://github.com/tidalcycles/dirt-samples
- **Dough Samples**: https://github.com/felixroos/dough-samples
- **VCSL**: https://github.com/sgossner/VCSL
- **Sample Manager**: https://cannerycoders.com/docs/hz/reference/musicAPI/samplemgr.html

## Summary

To use Strudel's sample library in your project:

1. **Quick Start**: `samples('github:tidalcycles/dirt-samples')`
2. **Full Library**: Load multiple repositories using dough-samples
3. **Custom**: Create your own sample maps with URLs or GitHub repos
4. **Local**: Serve samples from your machine for development

The samples are high-quality, professionally recorded, and ready to use in your music projects!