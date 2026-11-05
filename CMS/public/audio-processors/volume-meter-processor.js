/**
 * VolumeMeterProcessor (Web Audio API AudioWorkletProcessor)
 *
 * Runs on a dedicated real-time audio thread off the main UI thread.
 * Computes root-mean-square (RMS) energy across microphone audio samples.
 * Emits throttled volume levels to the main thread via MessagePort.
 *
 * Replaces deprecated ScriptProcessorNode without interrupting audio passthrough.
 */
class VolumeMeterProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._volume = 0;
    this._lastUpdate = 0;
    this._updateInterval = 0.05; // 50ms (20 updates/second)
    this._smoothingFactor = 0.85; // Exponential decay smoothing
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) {
      return true;
    }

    const channelData = input[0];
    if (!channelData || channelData.length === 0) {
      return true;
    }

    // Calculate sum of squares (energy) across the sample block (128 samples per render quantum)
    let sumSquares = 0;
    const length = channelData.length;
    for (let i = 0; i < length; i++) {
      const sample = channelData[i];
      sumSquares += sample * sample;
    }

    // Root-mean-square (RMS) volume calculation
    const rms = Math.sqrt(sumSquares / length);

    // Scale from 0.0-1.0 float to 0-100 integer range for easy threshold comparisons
    const rawLevel = Math.min(100, Math.round(rms * 250));

    // Smooth with previous volume to eliminate high-frequency jitter
    this._volume = Math.max(rawLevel, Math.round(this._volume * this._smoothingFactor));

    // Throttled notification to main thread (avoids postMessage flooding)
    if (currentTime - this._lastUpdate >= this._updateInterval) {
      this.port.postMessage({
        volume: this._volume,
        isSpeaking: this._volume > 15,
      });
      this._lastUpdate = currentTime;
    }

    // Pass through audio unchanged to output if connected
    if (outputs[0] && outputs[0][0]) {
      outputs[0][0].set(channelData);
    }

    return true;
  }
}

registerProcessor("volume-meter-processor", VolumeMeterProcessor);

