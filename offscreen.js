// ============================================
// PokéDrop AU - Offscreen Audio Player
// Plays Pokemon-style notification sounds
// ============================================

// Audio context for generating sounds
let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

// Pokemon-style catch/notification sound
// A cheerful ascending arpeggio reminiscent of Pokemon games
function playPokemonCatchSound() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  
  // Master gain
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.setValueAtTime(0.3, now);
  
  // Notes for a Pokemon-style jingle (C major arpeggio with octave)
  // Similar to the "item get" or "Pokemon caught" sound
  const notes = [
    { freq: 523.25, start: 0, duration: 0.1 },      // C5
    { freq: 659.25, start: 0.08, duration: 0.1 },   // E5
    { freq: 783.99, start: 0.16, duration: 0.1 },   // G5
    { freq: 1046.50, start: 0.24, duration: 0.2 },  // C6 (held longer)
    { freq: 783.99, start: 0.38, duration: 0.08 },  // G5
    { freq: 1046.50, start: 0.44, duration: 0.3 },  // C6 (final note)
  ];
  
  notes.forEach(note => {
    // Oscillator
    const osc = ctx.createOscillator();
    osc.type = 'square'; // Square wave for that chiptune feel
    osc.frequency.setValueAtTime(note.freq, now + note.start);
    
    // Envelope
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0, now + note.start);
    envelope.gain.linearRampToValueAtTime(0.5, now + note.start + 0.02);
    envelope.gain.exponentialRampToValueAtTime(0.01, now + note.start + note.duration);
    
    // Connect
    osc.connect(envelope);
    envelope.connect(masterGain);
    
    // Play
    osc.start(now + note.start);
    osc.stop(now + note.start + note.duration + 0.05);
  });
  
  // Add a subtle second voice (harmony) for richness
  const harmonyNotes = [
    { freq: 261.63, start: 0, duration: 0.1 },      // C4
    { freq: 329.63, start: 0.08, duration: 0.1 },   // E4
    { freq: 392.00, start: 0.16, duration: 0.1 },   // G4
    { freq: 523.25, start: 0.24, duration: 0.2 },   // C5
  ];
  
  harmonyNotes.forEach(note => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle'; // Softer for harmony
    osc.frequency.setValueAtTime(note.freq, now + note.start);
    
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0, now + note.start);
    envelope.gain.linearRampToValueAtTime(0.2, now + note.start + 0.02);
    envelope.gain.exponentialRampToValueAtTime(0.01, now + note.start + note.duration);
    
    osc.connect(envelope);
    envelope.connect(masterGain);
    
    osc.start(now + note.start);
    osc.stop(now + note.start + note.duration + 0.05);
  });
}

// Alternative: Pokeball "ding" sound (simpler, single note with shimmer)
function playPokeballDing() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.setValueAtTime(0.25, now);
  
  // Main ding
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(880, now); // A5
  osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.1); // A6
  
  const env1 = ctx.createGain();
  env1.gain.setValueAtTime(0.5, now);
  env1.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
  
  osc1.connect(env1);
  env1.connect(masterGain);
  osc1.start(now);
  osc1.stop(now + 0.5);
  
  // Shimmer/sparkle
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const startTime = now + 0.05 + (i * 0.08);
    osc.frequency.setValueAtTime(2000 + (i * 500), startTime);
    
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.15, startTime);
    env.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
    
    osc.connect(env);
    env.connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + 0.2);
  }
}

// Full Pokemon "rare item found" style sound
function playRareDropSound() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.setValueAtTime(0.3, now);
  
  // Ascending fanfare
  const melody = [
    { freq: 392.00, time: 0, dur: 0.12 },     // G4
    { freq: 493.88, time: 0.1, dur: 0.12 },   // B4
    { freq: 587.33, time: 0.2, dur: 0.12 },   // D5
    { freq: 783.99, time: 0.3, dur: 0.25 },   // G5
    { freq: 698.46, time: 0.5, dur: 0.1 },    // F5
    { freq: 783.99, time: 0.58, dur: 0.35 },  // G5 (held)
  ];
  
  melody.forEach(note => {
    // Lead voice
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(note.freq, now + note.time);
    
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now + note.time);
    env.gain.linearRampToValueAtTime(0.4, now + note.time + 0.015);
    env.gain.setValueAtTime(0.35, now + note.time + note.dur * 0.7);
    env.gain.exponentialRampToValueAtTime(0.01, now + note.time + note.dur);
    
    osc.connect(env);
    env.connect(masterGain);
    osc.start(now + note.time);
    osc.stop(now + note.time + note.dur + 0.05);
    
    // Bass accompaniment (octave lower, triangle wave)
    const bass = ctx.createOscillator();
    bass.type = 'triangle';
    bass.frequency.setValueAtTime(note.freq / 2, now + note.time);
    
    const bassEnv = ctx.createGain();
    bassEnv.gain.setValueAtTime(0, now + note.time);
    bassEnv.gain.linearRampToValueAtTime(0.2, now + note.time + 0.02);
    bassEnv.gain.exponentialRampToValueAtTime(0.01, now + note.time + note.dur * 0.8);
    
    bass.connect(bassEnv);
    bassEnv.connect(masterGain);
    bass.start(now + note.time);
    bass.stop(now + note.time + note.dur);
  });
  
  // Final sparkle effect
  setTimeout(() => {
    for (let i = 0; i < 4; i++) {
      const sparkle = ctx.createOscillator();
      sparkle.type = 'sine';
      const sTime = ctx.currentTime + (i * 0.05);
      sparkle.frequency.setValueAtTime(1500 + Math.random() * 1000, sTime);
      
      const sEnv = ctx.createGain();
      sEnv.gain.setValueAtTime(0.1, sTime);
      sEnv.gain.exponentialRampToValueAtTime(0.001, sTime + 0.1);
      
      sparkle.connect(sEnv);
      sEnv.connect(masterGain);
      sparkle.start(sTime);
      sparkle.stop(sTime + 0.15);
    }
  }, 800);
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PLAY_SOUND') {
    try {
      const soundType = message.soundType || 'catch';
      
      switch (soundType) {
        case 'ding':
          playPokeballDing();
          break;
        case 'rare':
          playRareDropSound();
          break;
        case 'catch':
        default:
          playPokemonCatchSound();
          break;
      }
      
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error playing sound:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  return true;
});

console.log('PokéDrop Audio offscreen document loaded');

