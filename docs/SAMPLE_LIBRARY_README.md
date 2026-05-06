# Strudel Sample Library Integration Guide

This document explains how to access and use the actual sound files from Strudel's built-in sample library in your own projects.

## Quick Start

### 1. Basic Integration

```javascript
// Load Strudel's default sample library
await Strudel.samples('github:tidalcycles/dirt-samples');

// Use samples in patterns
s("bd sd bd sd,hh*16").bank("tr909").dec(0.4);
```

### 2. What's Included

By default, Strudel provides:

- **Classic Drum Machines**: TR-808, TR-909, TR-707, LinnDrum samples
- **Virtual Community Sound Library (VCSL)**: Hundreds of community-contributed samples
- **High-Quality Processing**: All samples are pre-processed and optimized

## Available Sample Libraries

### Primary Libraries

| Library | URL | Description |
|---------|-----|-------------|
| **Dirt Samples** | `github:tidalcycles/dirt-samples` | Classic drum breaks and percussion |
| **Dough Samples** | `github:felixroos/dough-samples` | Default Strudel sample collection |
| **VCSL** | `github:sgossner/VCSL` | Community sound library |

### Direct URLs

```javascript
const base = 'https://raw.githubusercontent.com/felixroos/dough-samples/main/';

// Load all default libraries
await samples(`${base}/tidal-drum-machines.json`, `${base}/tidal-drum-machines/machines/`);
await samples(`${base}/piano.json`, `${base}/piano/`);
await samples(`${base}/vcsl.json`, `${base}/VCSL/`);
```

## Sample Categories

### Drum Machines
- **TR-808**: `bd`, `sd`, `hh`, `oh`, `rim`, `cp`, `mt`, `ht`, `lt`, `cr`, `rd`
- **TR-909**: Electronic drum sounds
- **TR-707**: Digital drum machine
- **LinnDrum**: Classic 80s drums
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

## Usage Examples

### Basic Pattern

```javascript
// Load samples
await Strudel.samples('github:tidalcycles/dirt-samples');

// Simple beat
s("bd sn");

// With variations
s("bd <sn cp> hh");

// Complex pattern
s("[bd sn] hh*2, [cp rim]*4");
```

### Drum Banks

```javascript
// TR-909 samples
s("bd sd").bank("tr909").dec(0.4);

// TR-808 samples  
s("bd sd").bank("tr808").dec(0.5);

// LinnDrum samples
s("bd sd").bank("linn").dec(0.3);
```

### Sample Variations

```javascript
// Different kick samples
s("bd:0 bd:1 bd:2");

// Hi-hat variations
s("hh:0 [hh:1 hh:2]");

// Using n() function
s("bd").n("0 1 2");
```

### Multiple Libraries

```javascript
async function loadAllSamples() {
  const base = 'https://raw.githubusercontent.com/felixroos/dough-samples/main/';
  
  await Promise.all([
    samples(`${base}/tidal-drum-machines.json`, `${base}/tidal-drum-machines/machines/`),
    samples(`${base}/piano.json`, `${base}/piano/`),
    samples(`${base}/vcsl.json`, `${base}/VCSL/`),
  ]);
}

await loadAllSamples();
s("bd [sn cp] hh*4").bank("tr909");
```

## Custom Sample Loading

### From GitHub

```javascript
// Your own repository
samples('github:username/repo-name/main');

// With custom mapping
samples({
  'mykick': 'samples/kick.wav',
  'mysnare': 'samples/snare.wav'
}, 'github:username/repo-name/main/');
```

### From URLs

```javascript
samples({
  'kick': 'https://example.com/kick.wav',
  'snare': 'https://example.com/snare.wav',
  'hat': 'https://example.com/hat.wav'
});

s("kick snare hat");
```

### Local Development

```bash
# Install sampler
npm install -g @strudel/sampler

# Start server
cd my-samples
npx @strudel/sampler
```

```javascript
// Load from local server
samples('http://localhost:5432/');
s("mykick mysnare");
```

## Sample Map Format

### Basic

```javascript
samples({
  '_base': 'https://example.com/samples/',
  'bd': 'drums/kick.wav',
  'sd': ['drums/snare1.wav', 'drums/snare2.wav'],
  'hh': 'drums/hihat.wav'
});
```

### strudel.json

```json
{
  "_base": "https://example.com/samples/",
  "bd": "drums/kick.wav",
  "sd": ["drums/snare1.wav", "drums/snare2.wav"],
  "hh": "drums/hihat.wav"
}
```

## Complete Integration Example

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
      
      // Create pattern
      const pattern = Strudel.s("bd [sn cp] hh*4")
        .bank("tr909")
        .dec(0.3);
      
      // Play
      pattern.play();
    }
  </script>
</body>
</html>
```

## Best Practices

### Performance
- Load samples once and reuse
- Consider lazy-loading large libraries
- Use compressed formats (mp3, ogg) for large samples

### Caching
- Add version numbers to URLs
- Example: `github:tidalcycles/dirt-samples?v=2`

### Error Handling

```javascript
try {
  await Strudel.samples('github:tidalcycles/dirt-samples');
} catch (error) {
  console.error('Failed to load samples:', error);
  // Fallback to built-in samples
}
```

### User Interaction
- Initialize audio on user click (browser requirement)
- Show loading indicators for large libraries

## Troubleshooting

### Samples Not Loading
1. Check browser console for errors
2. Verify URLs are correct
3. Check CORS headers
4. Ensure files exist

### No Sound
1. Check autoplay policies
2. Ensure audio context started
3. Verify sample files are valid

### Slow Loading
1. Large files take time
2. Use compressed formats
3. Load only what you need

## Licensing

- **Dirt Samples**: Various (check repository)
- **VCSL**: Community-contributed
- **Drum Machine Samples**: Often copyright-free

Always check individual sample licenses before use.

## Resources

- **Strudel Documentation**: https://strudel.cc
- **Dirt Samples**: https://github.com/tidalcycles/dirt-samples
- **Dough Samples**: https://github.com/felixroos/dough-samples
- **VCSL**: https://github.com/sgossner/VCSL
- **Sample Manager**: https://cannerycoders.com/docs/hz/reference/musicAPI/samplemgr.html

## API Reference

### samples()

```javascript
// Load from GitHub shortcut
samples('github:user/repo/branch');

// Load from URL
samples('https://example.com/strudel.json');

// Load from object
samples({
  'sound': 'path/to/sound.wav'
}, 'https://example.com/base/');

// Load multiple
await Promise.all([
  samples('github:user/repo1'),
  samples('github:user/repo2')
]);
```

### Using Samples

```javascript
// Basic
s("bd sn hh");

// With bank
s("bd sn").bank("tr909");

// With variations
s("bd:0 sn:1");

// With effects
s("bd sd").bank("tr909").dec(0.4).room(0.5);
```

## Summary

To use Strudel's sample library:

1. **Quick Start**: `samples('github:tidalcycles/dirt-samples')`
2. **Full Library**: Load multiple repositories
3. **Custom**: Create your own sample maps
4. **Local**: Serve from your machine

All samples are high-quality and ready for production use!