# Audio Effects Tooltips Guide

## Overview

This guide provides detailed explanations for all audio effects in the Pixel Music Grid. Each effect has a tooltip that appears when you hover over the info icon (🄵).

## How to Use Tooltips

1. **Hover over any effect's info icon** (🄵) to see its explanation
2. **Read the tooltip** to understand what the effect does
3. **Enable the effect** by checking the checkbox
4. **Adjust the slider** to change the effect's intensity
5. **Disable the effect** by unchecking the checkbox when not needed

## Complete Effects Reference

### 🎚️ Core Amplitude & Envelope

#### Gain - Volume Control
**Tooltip**: "Adjusts the overall volume of the sound."
- **1.0** = Normal volume
- **0.5** = Half volume  
- **2.0** = Double volume
- **Range**: 0-2
- **Use**: Balance sounds in your mix

#### Attack - Sound Start
**Tooltip**: "Controls how quickly the sound reaches full volume."
- **0.01s** = Instant attack (sharp start)
- **0.5s** = Slow attack (gradual fade-in)
- **Range**: 0-1 seconds
- **Use**: Shape the "punch" of percussive sounds

#### Decay - Initial Fade
**Tooltip**: "Determines how quickly the sound fades after attack."
- **0.4s** = Quick decay
- **2.0s** = Long decay
- **Range**: 0-2 seconds
- **Use**: Shape the character of the sound envelope

#### Sustain - Volume Level
**Tooltip**: "Sets the volume level during the main part of the sound."
- **0.2** = Lower sustain (20% volume)
- **1.0** = Full sustain (100% volume)
- **Range**: 0-1
- **Use**: Control how "held" the sound feels

#### Release - Sound End
**Tooltip**: "Controls how quickly the sound fades out after note ends."
- **0.2s** = Quick release
- **2.0s** = Long release (gradual fade-out)
- **Range**: 0-2 seconds
- **Use**: Create smoother or more abrupt endings

#### Pan - Stereo Position
**Tooltip**: "Positions the sound in the stereo field."
- **-1.0** = Full left
- **0.0** = Center
- **1.0** = Full right
- **Range**: -1 to 1
- **Use**: Create spatial effects and width in your mix

### 🔍 Filters

#### Low-Pass Filter
**Tooltip**: "Cuts high frequencies, allowing only low frequencies to pass."
- **800Hz** = Muted, bass-heavy sound
- **20000Hz** = Full frequency range
- **Range**: 20-20000Hz
- **Use**: Create darker, bassier sounds

#### High-Pass Filter
**Tooltip**: "Cuts low frequencies, allowing only high frequencies to pass."
- **20Hz** = Full frequency range
- **200Hz** = Thin, treble-heavy sound
- **Range**: 20-20000Hz
- **Use**: Create brighter, thinner sounds

#### Band-Pass Filter
**Tooltip**: "Allows only mid-range frequencies to pass."
- **1200Hz** = Telephone-like sound
- **Range**: 20-20000Hz
- **Use**: Create nasal, focused sound characteristics

#### Filter Resonance
**Tooltip**: "Emphasizes frequencies around the cutoff point."
- **0.7** = Moderate resonance
- **10.0** = Strong resonance (peaking)
- **Range**: 0-10
- **Use**: Create more pronounced filtering effects

### ⏱️ Time & Space Effects

#### Delay Time
**Tooltip**: "Sets the timing between delay repetitions."
- **0.25** = Quarter-note delay
- **0.5** = Half-note delay
- **Range**: 0-1 cycles
- **Use**: Sync with musical timing for rhythmic effects

#### Delay Feedback
**Tooltip**: "Controls how much delay signal is fed back."
- **0.4** = Moderate feedback
- **0.9** = Long feedback trails
- **Range**: 0-1
- **Use**: Create more repetitions and longer trails

#### Delay Triplet
**Tooltip**: "Adds swing/triplet feel to delay timing."
- **0.33** = Triplet timing
- **0.5** = Dotted timing
- **Range**: 0-1
- **Use**: Create more natural, musical delay patterns

#### Reverb Amount
**Tooltip**: "Controls the intensity of reverb effect."
- **0.3** = Subtle room ambiance
- **1.0** = Full wet reverb
- **Range**: 0-1
- **Use**: Add spatial depth to sounds

#### Room Size
**Tooltip**: "Simulates different physical spaces."
- **0.5** = Medium room
- **1.0** = Large hall
- **Range**: 0-1
- **Use**: Simulate different acoustic environments

### 🔥 Distortion & Saturation

#### Distortion
**Tooltip**: "Adds harmonic distortion to the sound."
- **0.3** = Subtle warmth
- **1.0** = Heavy distortion
- **Range**: 0-1
- **Use**: Create gritty, aggressive textures

#### Bitcrush
**Tooltip**: "Reduces audio bit depth for lo-fi effects."
- **4 bits** = Heavy digital distortion
- **16 bits** = Full quality
- **Range**: 1-16 bits
- **Use**: Create digital artifacts and lo-fi sounds

#### Waveshaper
**Tooltip**: "Applies non-linear distortion."
- **0.5** = Moderate shaping
- **1.0** = Extreme shaping
- **Range**: 0-1
- **Use**: Add harmonic richness and saturation

### 🎵 Pitch & Playback

#### Playback Speed
**Tooltip**: "Changes the speed of audio playback."
- **0.5** = Half speed (lower pitch)
- **1.0** = Normal speed
- **2.0** = Double speed (higher pitch)
- **Range**: 0.1-2x
- **Use**: Affect both speed and pitch simultaneously

#### Pitch - Semitones
**Tooltip**: "Shifts pitch in semitone increments."
- **-12** = One octave down
- **0** = Original pitch
- **12** = One octave up
- **Range**: -24 to 24 semitones
- **Use**: Precise pitch adjustments for melody

#### Octave Shift
**Tooltip**: "Shifts pitch by full octaves."
- **-2** = Two octaves down
- **0** = Original octave
- **2** = Two octaves up
- **Range**: -2 to 2 octaves
- **Use**: Dramatic pitch changes

### 🎲 Rhythmic & Glitch

#### Chop - Sample Slices
**Tooltip**: "Divides the sound into slices."
- **8 slices** = Moderate chopping
- **16 slices** = Fine granular slicing
- **Range**: 1-16 slices
- **Use**: Create stuttering and glitch effects

#### Stutter - Repeats
**Tooltip**: "Creates rapid repetition effects."
- **2 repeats** = Double hits
- **8 repeats** = Machine-gun effect
- **Range**: 1-8 repeats
- **Use**: Add rhythmic complexity and glitch effects

#### Truncate - Tail Cut
**Tooltip**: "Cuts the end of the sound."
- **0.5** = Cut sound in half
- **1.0** = Full sound length
- **Range**: 0-1
- **Use**: Create abrupt endings and glitch effects

### 🌊 Modulation & Movement

#### Vibrato - Rate
**Tooltip**: "Sets the speed of pitch oscillation."
- **4Hz** = Slow vibrato
- **20Hz** = Fast vibrato
- **Range**: 1-20Hz
- **Use**: Create subtle to intense pitch modulation

#### Vibrato Depth
**Tooltip**: "Controls the amount of pitch oscillation."
- **0.02** = Subtle pitch variation
- **0.1** = Strong pitch wobble
- **Range**: 0-0.1
- **Use**: Control the intensity of pitch changes

#### Tremolo - Rate
**Tooltip**: "Sets the speed of volume oscillation."
- **8Hz** = Moderate tremolo
- **20Hz** = Fast tremolo
- **Range**: 1-20Hz
- **Use**: Create rhythmic volume pulsations

#### Tremolo Depth
**Tooltip**: "Controls the amount of volume oscillation."
- **0.5** = Moderate volume variation
- **1.0** = Full volume oscillation
- **Range**: 0-1
- **Use**: Control the intensity of volume changes

### 🎲 Probability & Variation

#### Often Probability
**Tooltip**: "High chance (75%) that effect will apply."
- **0.75** = 75% probability
- **1.0** = Always applies
- **Range**: 0-1
- **Use**: Create occasional variations

#### Sometimes Probability
**Tooltip**: "Medium chance (50%) that effect will apply."
- **0.5** = 50% probability
- **1.0** = Always applies
- **Range**: 0-1
- **Use**: Create balanced randomness

#### Rarely Probability
**Tooltip**: "Low chance (25%) that effect will apply."
- **0.25** = 25% probability
- **1.0** = Always applies
- **Range**: 0-1
- **Use**: Add subtle, occasional variations

## Tips for Using Effects

### 1. **Start Subtle**
- Begin with small effect amounts
- Gradually increase until you hear the desired change
- Subtle effects often sound more professional

### 2. **Enable Only What You Need**
- Disable effects you're not using
- This reduces CPU usage
- Makes it easier to focus on specific sounds

### 3. **Use Category Tooltips**
- Hover over category info icons for general explanations
- Understand the overall purpose of each effect type

### 4. **Experiment with Combinations**
- Try combining different effects
- Example: Delay + Reverb for spatial depth
- Example: Distortion + Filter for unique textures

### 5. **Reset When Stuck**
- Use the "Reset to Defaults" button
- Start fresh if effects become overwhelming
- Rebuild your sound step by step

### 6. **Use Probability Effects**
- Add variation to repetitive patterns
- Create more organic, human-like performances
- Make static sounds more dynamic

## Troubleshooting

### Effects Not Working?
1. **Check if enabled**: Make sure the checkbox is checked
2. **Check volume**: Ensure gain is not set to 0
3. **Check global enable**: Verify the main effects toggle is on
4. **Check instrument selection**: Make sure an instrument is selected

### Too Much CPU Usage?
1. **Disable unused effects**: Turn off effects you're not using
2. **Reduce effect amounts**: Lower slider values
3. **Use fewer instruments**: Reduce the number of active instruments
4. **Close other apps**: Free up system resources

### Sound Too Harsh?
1. **Reduce distortion**: Lower distortion amounts
2. **Add filters**: Use low-pass filters to soften
3. **Adjust attack**: Increase attack time for smoother starts
4. **Add reverb**: Create spatial depth to soften sounds

## Advanced Techniques

### Creating Space
- **Pan**: Position sounds left/right
- **Reverb**: Add depth and ambiance
- **Delay**: Create echo and dimension
- **Combination**: Use all three for immersive soundscapes

### Adding Movement
- **Vibrato**: Pitch modulation
- **Tremolo**: Volume modulation
- **LFO effects**: Create evolving sounds
- **Automation**: Change parameters over time

### Sound Design
- **Filters + Distortion**: Unique textures
- **Bitcrush + Delay**: Digital glitch effects
- **Reverse + Effects**: Otherworldly sounds
- **Layering**: Combine multiple processed sounds

### Rhythmic Effects
- **Stutter**: Create rhythmic patterns
- **Chop**: Break sounds into slices
- **Delay sync**: Match delay to tempo
- **Probability**: Randomize patterns

## Preset Ideas

### Warm Analog Sound
- **Gain**: 1.0
- **Attack**: 0.1s
- **Waveshaper**: 0.3
- **Low-Pass Filter**: 5000Hz
- **Reverb**: 0.2

### Digital Glitch
- **Bitcrush**: 8 bits
- **Chop**: 12 slices
- **Stutter**: 4 repeats
- **Delay**: 0.25 with 0.6 feedback
- **High-Pass Filter**: 1000Hz

### Smooth Pad
- **Attack**: 1.0s
- **Release**: 2.0s
- **Reverb**: 0.7
- **Room Size**: 0.8
- **Low-Pass Filter**: 3000Hz

### Aggressive Lead
- **Distortion**: 0.6
- **Gain**: 1.5
- **Vibrato**: 12Hz with 0.05 depth
- **Tremolo**: 8Hz with 0.3 depth
- **High-Pass Filter**: 500Hz

### Bass Enhancement
- **Low-Pass Filter**: 800Hz
- **Gain**: 1.2
- **Attack**: 0.05s
- **Sustain**: 0.8
- **Distortion**: 0.2 (for warmth)

## Best Practices

1. **Label Your Effects**: Keep track of what each effect does
2. **Save Presets**: Save combinations you like
3. **A/B Test**: Compare before/after effect application
4. **Use Reference Tracks**: Compare with professional sounds
5. **Take Breaks**: Fresh ears hear more accurately
6. **Document Settings**: Write down your favorite combinations
7. **Experiment**: Try unexpected combinations
8. **Have Fun**: Audio effects are creative tools!