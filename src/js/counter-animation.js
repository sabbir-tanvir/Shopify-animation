/**
 * Counter Animation
 * 
 * Animates the sparkle point counter between values.
 * Uses requestAnimationFrame for smooth number transitions.
 */

export class CounterAnimation {
  constructor() {
    this.valueEl = document.getElementById('sparkle-value');
    this.currentValue = 0;
    this._animationId = null;
    this.onUpdate = null;
  }

  /**
   * Immediately set the counter to a value (no animation).
   */
  set(value) {
    this.currentValue = value;
    this.valueEl.textContent = value;
    if (this.onUpdate) {
      this.onUpdate(value);
    }
    this._cancelAnimation();
  }

  /**
   * Animate the counter from its current value to a target value.
   * 
   * @param {number} target - The target value
   * @param {number} duration - Animation duration in ms
   * @returns {Promise} Resolves when animation completes
   */
  animateTo(target, duration = 500) {
    return new Promise((resolve) => {
      this._cancelAnimation();

      const start = this.currentValue;
      const diff = target - start;

      if (diff === 0) {
        resolve();
        return;
      }

      const startTime = performance.now();

      const step = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease-out cubic for natural deceleration
        const eased = 1 - Math.pow(1 - progress, 3);

        const current = Math.round(start + diff * eased);
        this.valueEl.textContent = current;
        this.currentValue = current;
        if (this.onUpdate) {
          this.onUpdate(current);
        }

        if (progress < 1) {
          this._animationId = requestAnimationFrame(step);
        } else {
          this.currentValue = target;
          this.valueEl.textContent = target;
          if (this.onUpdate) {
            this.onUpdate(target);
          }
          resolve();
        }
      };

      this._animationId = requestAnimationFrame(step);
    });
  }

  _cancelAnimation() {
    if (this._animationId) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }
  }
}
