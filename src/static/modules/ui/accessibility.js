// Accessibility Preferences Manager
// Manages: reducedMotion, focusMode, highContrast, largeTargets, showBreadcrumbs

const STORAGE_KEY = 'mdplanner_accessibility_prefs';

const DEFAULT_PREFS = {
  reducedMotion: 'system', // 'system' | 'on' | 'off'
  highContrast: false,
  largeTargets: false,
  showBreadcrumbs: true
};

/**
 * Manages accessibility preferences with localStorage persistence
 */
export class AccessibilityManager {
  static prefs = { ...DEFAULT_PREFS };

  /**
   * Initialize accessibility preferences from localStorage and system
   */
  static init() {
    this.load();
    this.apply();
    this.watchSystemPreferences();
  }

  /**
   * Load preferences from localStorage
   */
  static load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.prefs = { ...DEFAULT_PREFS, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load accessibility preferences:', e);
    }
  }

  /**
   * Save preferences to localStorage
   */
  static save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.prefs));
    } catch (e) {
      console.warn('Failed to save accessibility preferences:', e);
    }
  }

  /**
   * Get a specific preference value
   * @param {string} key
   * @returns {any}
   */
  static get(key) {
    return this.prefs[key];
  }

  /**
   * Set a specific preference value
   * @param {string} key
   * @param {any} value
   */
  static set(key, value) {
    this.prefs[key] = value;
    this.save();
    this.apply();
  }

  /**
   * Update multiple preferences at once
   * @param {Partial<typeof DEFAULT_PREFS>} updates
   */
  static update(updates) {
    Object.assign(this.prefs, updates);
    this.save();
    this.apply();
  }

  /**
   * Apply all preferences to the DOM
   */
  static apply() {
    const html = document.documentElement;
    const body = document.body;

    // Reduced motion
    const shouldReduceMotion = this.shouldReduceMotion();
    body.classList.toggle('reduce-motion', shouldReduceMotion);

    // High contrast
    body.classList.toggle('high-contrast', this.prefs.highContrast);
    html.classList.toggle('high-contrast', this.prefs.highContrast);

    // Large targets
    body.classList.toggle('large-targets', this.prefs.largeTargets);

    // Breadcrumbs visibility
    const breadcrumb = document.getElementById('breadcrumb');
    if (breadcrumb) {
      breadcrumb.classList.toggle('hidden', !this.prefs.showBreadcrumbs);
    }
  }

  /**
   * Determine if motion should be reduced based on preference and system setting
   * @returns {boolean}
   */
  static shouldReduceMotion() {
    if (this.prefs.reducedMotion === 'on') return true;
    if (this.prefs.reducedMotion === 'off') return false;
    // 'system' - check prefers-reduced-motion
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Watch for system preference changes
   */
  static watchSystemPreferences() {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    mediaQuery.addEventListener('change', () => {
      if (this.prefs.reducedMotion === 'system') {
        this.apply();
      }
    });
  }

  /**
   * Reset all preferences to defaults
   */
  static reset() {
    this.prefs = { ...DEFAULT_PREFS };
    this.save();
    this.apply();
  }
}
