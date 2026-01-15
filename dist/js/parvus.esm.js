/**
 * Parvus
 *
 * @author Benjamin de Oostfrees
 * @version 3.1.0
 * @url https://github.com/deoostfrees/parvus
 *
 * MIT license
 */

const BROWSER_WINDOW = window;

/**
 * Get scrollbar width
 *
 * @return {Number} - The scrollbar width
 */
const getScrollbarWidth = () => {
  return BROWSER_WINDOW.innerWidth - document.documentElement.clientWidth;
};
const FOCUSABLE_ELEMENTS = ['a:not([inert]):not([tabindex^="-"])', 'button:not([inert]):not([tabindex^="-"]):not(:disabled)', '[tabindex]:not([inert]):not([tabindex^="-"])'];

/**
 * Get the focusable children of the given element
 *
 * @return {Array<Element>} - An array of focusable children
 */
const getFocusableChildren = targetEl => {
  return Array.from(targetEl.querySelectorAll(FOCUSABLE_ELEMENTS.join(', '))).filter(child => child.offsetParent !== null);
};

var en = {
  lightboxLabel: 'This is a dialog window that overlays the main content of the page. The modal displays the enlarged image. Pressing the Escape key will close the modal and bring you back to where you were on the page.',
  lightboxLoadingIndicatorLabel: 'Image loading',
  lightboxLoadingError: 'The requested image cannot be loaded.',
  controlsLabel: 'Controls',
  previousButtonLabel: 'Previous image',
  nextButtonLabel: 'Next image',
  closeButtonLabel: 'Close dialog window',
  sliderLabel: 'Images',
  slideLabel: 'Image'
};

/**
 * Default configuration options
 */
const DEFAULT_OPTIONS = {
  selector: '.lightbox',
  gallerySelector: null,
  zoomIndicator: true,
  captions: true,
  captionsSelector: 'self',
  captionsAttribute: 'data-caption',
  docClose: true,
  swipeClose: true,
  simulateTouch: true,
  threshold: 50,
  hideScrollbar: true,
  lightboxIndicatorIcon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" stroke="currentColor"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>',
  previousButtonIcon: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" stroke="currentColor"><path stroke="none" d="M0 0h24v24H0z"/><polyline points="15 6 9 12 15 18" /></svg>',
  nextButtonIcon: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" stroke="currentColor"><path stroke="none" d="M0 0h24v24H0z"/><polyline points="9 6 15 12 9 18" /></svg>',
  closeButtonIcon: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" stroke="currentColor"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  l10n: en
};

/**
 * Merge default options with user-provided options
 *
 * @param {Object} userOptions - User-provided options
 * @returns {Object} - Merged options object
 */
const mergeOptions = userOptions => {
  const MERGED_OPTIONS = {
    ...DEFAULT_OPTIONS,
    ...userOptions
  };
  if (userOptions && userOptions.l10n) {
    MERGED_OPTIONS.l10n = {
      ...DEFAULT_OPTIONS.l10n,
      ...userOptions.l10n
    };
  }
  return MERGED_OPTIONS;
};

/**
 * State management for Parvus
 *
 * Centralizes all mutable state variables
 */
class ParvusState {
  constructor() {
    // Group management
    this.GROUP_ATTRIBUTES = {
      triggerElements: [],
      slider: null,
      sliderElements: [],
      contentElements: []
    };
    this.GROUPS = {};
    this.groupIdCounter = 0;
    this.newGroup = null;
    this.activeGroup = null;
    this.currentIndex = 0;

    // Configuration
    this.config = {};

    // DOM elements
    this.lightbox = null;
    this.lightboxOverlay = null;
    this.lightboxOverlayOpacity = 1;
    this.toolbar = null;
    this.toolbarLeft = null;
    this.toolbarRight = null;
    this.controls = null;
    this.previousButton = null;
    this.nextButton = null;
    this.closeButton = null;
    this.counter = null;

    // Drag & interaction state
    this.drag = {};
    this.isDraggingX = false;
    this.isDraggingY = false;
    this.pointerDown = false;
    this.activePointers = new Map();

    // Zoom state
    this.currentScale = 1;
    this.isPinching = false;
    this.isTap = false;
    this.pinchStartDistance = 0;
    this.lastPointersId = null;

    // Offset & animation
    this.offset = null;
    this.offsetTmp = null;
    this.resizeTicking = false;
    this.isReducedMotion = true;
  }

  /**
   * Clear drag state
   */
  clearDrag() {
    this.drag = {
      startX: 0,
      endX: 0,
      startY: 0,
      endY: 0
    };
  }

  /**
   * Get the active group
   *
   * @returns {Object} The active group
   */
  getActiveGroup() {
    return this.GROUPS[this.activeGroup];
  }

  /**
   * Reset zoom state
   */
  resetZoomState() {
    this.isPinching = false;
    this.isTap = false;
    this.currentScale = 1;
    this.pinchStartDistance = 0;
    this.lastPointersId = '';
  }
}

/**
 * Event System Module
 *
 * Handles custom event dispatching and listeners
 */

/**
 * Dispatch a custom event
 *
 * @param {HTMLElement} lightbox - The lightbox element
 * @param {String} type - The type of the event to dispatch
 * @returns {void}
 */
const dispatchCustomEvent = (lightbox, type) => {
  const CUSTOM_EVENT = new CustomEvent(type, {
    cancelable: true
  });
  lightbox.dispatchEvent(CUSTOM_EVENT);
};

/**
 * Bind a specific event listener
 *
 * @param {HTMLElement} lightbox - The lightbox element
 * @param {String} eventName - The name of the event to bind
 * @param {Function} callback - The callback function
 * @returns {void}
 */
const on = (lightbox, eventName, callback) => {
  if (lightbox) {
    lightbox.addEventListener(eventName, callback);
  }
};

/**
 * Unbind a specific event listener
 *
 * @param {HTMLElement} lightbox - The lightbox element
 * @param {String} eventName - The name of the event to unbind
 * @param {Function} callback - The callback function
 * @returns {void}
 */
const off = (lightbox, eventName, callback) => {
  if (lightbox) {
    lightbox.removeEventListener(eventName, callback);
  }
};

/**
 * Navigation Module
 *
 * Handles slide navigation and transitions
 */

/**
 * Update offset
 *
 * @param {Object} state - The application state
 * @returns {void}
 */
const updateOffset = state => {
  state.activeGroup = state.activeGroup !== null ? state.activeGroup : state.newGroup;
  state.offset = -state.currentIndex * state.lightbox.offsetWidth;
  state.GROUPS[state.activeGroup].slider.style.transform = `translate3d(${state.offset}px, 0, 0)`;
  state.offsetTmp = state.offset;
};

/**
 * Load slide with the specified index
 *
 * @param {Object} state - The application state
 * @param {Number} index - The index of the slide to be loaded
 * @returns {void}
 */
const loadSlide = (state, index) => {
  state.GROUPS[state.activeGroup].sliderElements[index].setAttribute('aria-hidden', 'false');
};

/**
 * Leave slide
 *
 * @param {Object} state - The application state
 * @param {Number} index - The index of the slide to leave
 * @returns {void}
 */
const leaveSlide = (state, index) => {
  if (state.GROUPS[state.activeGroup].sliderElements[index] !== undefined) {
    state.GROUPS[state.activeGroup].sliderElements[index].setAttribute('aria-hidden', 'true');
  }
};

/**
 * Preload slide with the specified index
 *
 * @param {Object} state - The application state
 * @param {Function} createSlide - Create slide function
 * @param {Function} createImage - Create image function
 * @param {Function} loadImage - Load image function
 * @param {Number} index - The index of the slide to be preloaded
 * @returns {void}
 */
const preload = (state, createSlide, createImage, loadImage, index) => {
  if (index < 0 || index >= state.GROUPS[state.activeGroup].triggerElements.length || state.GROUPS[state.activeGroup].sliderElements[index] !== undefined) {
    return;
  }
  createSlide(state, index);
  createImage(state, state.GROUPS[state.activeGroup].triggerElements[index], index, () => {
    loadImage(state, index);
  });
};

/**
 * Utils Module
 *
 * Utility functions
 */

/**
 * Check prefers reduced motion
 *
 * @param {Object} state - The application state
 * @param {MediaQueryList} motionQuery - The media query list
 * @returns {void}
 */
const reducedMotionCheck = (state, motionQuery) => {
  if (motionQuery.matches) {
    state.isReducedMotion = true;
  } else {
    state.isReducedMotion = false;
  }
};

/**
 * Retrieves or creates a group identifier for the given element
 *
 * @param {Object} state - The application state
 * @param {HTMLElement} el - DOM element to get or assign a group to
 * @returns {string} The group identifier associated with the element
 */
const getGroup = (state, el) => {
  // Return existing group identifier if already assigned
  if (el.dataset.group) {
    return el.dataset.group;
  }

  // Generate new unique group identifier using counter
  const EL_GROUP = `default-${state.groupIdCounter++}`;

  // Assign the new group identifier to element's dataset
  el.dataset.group = EL_GROUP;
  return EL_GROUP;
};

/**
 * Plugin management for Parvus
 *
 * Provides a system for registering and managing plugins
 */

class PluginManager {
  constructor() {
    this.plugins = [];
    this.hooks = {};
    this.context = null;
    this.isInitialized = false;
  }

  /**
   * Register a plugin
   *
   * @param {Object} plugin - Plugin object with name and install function
   * @param {Object} options - Plugin-specific options
   */
  register(plugin, options = {}) {
    if (!plugin || typeof plugin.install !== 'function') {
      throw new Error('Plugin must have an install function');
    }
    if (!plugin.name) {
      throw new Error('Plugin must have a name');
    }

    // Check if plugin is already registered
    const existingPlugin = this.plugins.find(p => p.name === plugin.name);
    if (existingPlugin) {
      console.warn(`Plugin "${plugin.name}" is already registered`);
      return;
    }
    this.plugins.push({
      plugin,
      options
    });

    // If already initialized, install immediately
    if (this.isInitialized && this.context) {
      this.installPlugin(plugin, options);
    }
  }

  /**
   * Install a single plugin
   *
   * @param {Object} plugin - Plugin object
   * @param {Object} options - Plugin options
   */
  installPlugin(plugin, options) {
    try {
      plugin.install(this.context, options);

      // If lightbox already exists, execute afterInit hook for this plugin immediately
      if (this.context && this.context.state && this.context.state.lightbox) {
        this.executeHook('afterInit', {
          state: this.context.state
        });
      }
    } catch (error) {
      console.error(`Failed to install plugin "${plugin.name}":`, error);
    }
  }

  /**
   * Install all registered plugins
   *
   * @param {Object} context - Parvus instance context
   */
  install(context) {
    this.context = context;
    this.isInitialized = true;
    this.plugins.forEach(({
      plugin,
      options
    }) => {
      this.installPlugin(plugin, options);
    });
  }

  /**
   * Execute a hook
   *
   * @param {String} hookName - Name of the hook
   * @param {*} data - Data to pass to hook callbacks
   */
  executeHook(hookName, data) {
    const callbacks = this.hooks[hookName] || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in hook "${hookName}":`, error);
      }
    });
  }

  /**
   * Register a hook callback
   *
   * @param {String} hookName - Name of the hook
   * @param {Function} callback - Callback function
   */
  addHook(hookName, callback) {
    if (!this.hooks[hookName]) {
      this.hooks[hookName] = [];
    }
    this.hooks[hookName].push(callback);
  }

  /**
   * Remove a hook callback
   *
   * @param {String} hookName - Name of the hook
   * @param {Function} callback - Callback function to remove
   */
  removeHook(hookName, callback) {
    if (!this.hooks[hookName]) return;
    this.hooks[hookName] = this.hooks[hookName].filter(cb => cb !== callback);
  }

  /**
   * Get all registered plugins
   *
   * @returns {Array} Array of plugin names
   */
  getPlugins() {
    return this.plugins.map(p => p.plugin.name);
  }
}

/**
 * UI Components Module
 *
 * Handles creation of lightbox, toolbar, slider and slides
 */

/**
 * Create the lightbox
 *
 * @param {Object} state - The application state
 * @returns {void}
 */
const createLightbox = state => {
  const {
    config
  } = state;

  // Use DocumentFragment to batch DOM operations
  const fragment = document.createDocumentFragment();

  // Create the lightbox container
  state.lightbox = document.createElement('dialog');
  state.lightbox.setAttribute('role', 'dialog');
  state.lightbox.setAttribute('aria-modal', 'true');
  state.lightbox.setAttribute('aria-label', config.l10n.lightboxLabel);
  state.lightbox.classList.add('parvus');

  // Create the lightbox overlay container
  state.lightboxOverlay = document.createElement('div');
  state.lightboxOverlay.classList.add('parvus__overlay');

  // Create the toolbar
  state.toolbar = document.createElement('div');
  state.toolbar.className = 'parvus__toolbar';

  // Create the toolbar items
  state.toolbarLeft = document.createElement('div');
  state.toolbarRight = document.createElement('div');

  // Create the controls
  state.controls = document.createElement('div');
  state.controls.className = 'parvus__controls';
  state.controls.setAttribute('role', 'group');
  state.controls.setAttribute('aria-label', config.l10n.controlsLabel);

  // Create the close button
  state.closeButton = document.createElement('button');
  state.closeButton.className = 'parvus__btn parvus__btn--close';
  state.closeButton.setAttribute('type', 'button');
  state.closeButton.setAttribute('aria-label', config.l10n.closeButtonLabel);
  state.closeButton.innerHTML = config.closeButtonIcon;

  // Create the previous button
  state.previousButton = document.createElement('button');
  state.previousButton.className = 'parvus__btn parvus__btn--previous';
  state.previousButton.setAttribute('type', 'button');
  state.previousButton.setAttribute('aria-label', config.l10n.previousButtonLabel);
  state.previousButton.innerHTML = config.previousButtonIcon;

  // Create the next button
  state.nextButton = document.createElement('button');
  state.nextButton.className = 'parvus__btn parvus__btn--next';
  state.nextButton.setAttribute('type', 'button');
  state.nextButton.setAttribute('aria-label', config.l10n.nextButtonLabel);
  state.nextButton.innerHTML = config.nextButtonIcon;

  // Create the counter
  state.counter = document.createElement('div');
  state.counter.className = 'parvus__counter';

  // Add the control buttons to the controls
  state.controls.append(state.closeButton, state.previousButton, state.nextButton);

  // Add the counter to the left toolbar item
  state.toolbarLeft.appendChild(state.counter);

  // Add the controls to the right toolbar item
  state.toolbarRight.appendChild(state.controls);

  // Add the toolbar items to the toolbar
  state.toolbar.append(state.toolbarLeft, state.toolbarRight);

  // Add the overlay and the toolbar to the lightbox
  state.lightbox.append(state.lightboxOverlay, state.toolbar);
  fragment.appendChild(state.lightbox);

  // Add to document body
  document.body.appendChild(fragment);
};

/**
 * Create a slider
 *
 * @param {Object} state - The application state
 * @returns {void}
 */
const createSlider = state => {
  const SLIDER = document.createElement('div');
  SLIDER.className = 'parvus__slider';

  // Update the slider reference in GROUPS
  state.GROUPS[state.activeGroup].slider = SLIDER;

  // Add the slider to the lightbox container
  state.lightbox.appendChild(SLIDER);
};

/**
 * Get next slide index
 *
 * @param {Object} state - The application state
 * @param {Number} currentIndex - Current slide index
 * @returns {number} Index of the next available slide or -1 if none found
 */
const getNextSlideIndex = (state, currentIndex) => {
  const SLIDE_ELEMENTS = state.GROUPS[state.activeGroup].sliderElements;
  const TOTAL_SLIDE_ELEMENTS = SLIDE_ELEMENTS.length;
  for (let i = currentIndex + 1; i < TOTAL_SLIDE_ELEMENTS; i++) {
    if (SLIDE_ELEMENTS[i] !== undefined) {
      return i;
    }
  }
  return -1;
};

/**
 * Get previous slide index
 *
 * @param {Object} state - The application state
 * @param {number} currentIndex - Current slide index
 * @returns {number} Index of the previous available slide or -1 if none found
 */
const getPreviousSlideIndex = (state, currentIndex) => {
  const SLIDE_ELEMENTS = state.GROUPS[state.activeGroup].sliderElements;
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (SLIDE_ELEMENTS[i] !== undefined) {
      return i;
    }
  }
  return -1;
};

/**
 * Create a slide
 *
 * @param {Object} state - The application state
 * @param {Number} index - The index of the slide
 * @returns {void}
 */
const createSlide = (state, index) => {
  if (state.GROUPS[state.activeGroup].sliderElements[index] !== undefined) {
    return;
  }
  const FRAGMENT = document.createDocumentFragment();
  const SLIDE_ELEMENT = document.createElement('div');
  const SLIDE_ELEMENT_CONTENT = document.createElement('div');
  const GROUP = state.GROUPS[state.activeGroup];
  const TOTAL_TRIGGER_ELEMENTS = GROUP.triggerElements.length;
  SLIDE_ELEMENT.className = 'parvus__slide';
  SLIDE_ELEMENT.style.cssText = `
    position: absolute;
    left: ${index * 100}%;
  `;
  SLIDE_ELEMENT.setAttribute('aria-hidden', 'true');

  // Add accessibility attributes if gallery has multiple slides
  if (TOTAL_TRIGGER_ELEMENTS > 1) {
    SLIDE_ELEMENT.setAttribute('role', 'group');
    SLIDE_ELEMENT.setAttribute('aria-label', `${state.config.l10n.slideLabel} ${index + 1}/${TOTAL_TRIGGER_ELEMENTS}`);
  }
  SLIDE_ELEMENT.appendChild(SLIDE_ELEMENT_CONTENT);
  FRAGMENT.appendChild(SLIDE_ELEMENT);
  GROUP.sliderElements[index] = SLIDE_ELEMENT;

  // Insert the slide element based on index position
  if (index >= state.currentIndex) {
    // Insert the slide element after the current slide
    const NEXT_SLIDE_INDEX = getNextSlideIndex(state, index);
    if (NEXT_SLIDE_INDEX !== -1) {
      GROUP.sliderElements[NEXT_SLIDE_INDEX].before(SLIDE_ELEMENT);
    } else {
      GROUP.slider.appendChild(SLIDE_ELEMENT);
    }
  } else {
    // Insert the slide element before the current slide
    const PREVIOUS_SLIDE_INDEX = getPreviousSlideIndex(state, index);
    if (PREVIOUS_SLIDE_INDEX !== -1) {
      GROUP.sliderElements[PREVIOUS_SLIDE_INDEX].after(SLIDE_ELEMENT);
    } else {
      GROUP.slider.prepend(SLIDE_ELEMENT);
    }
  }
};

/**
 * Update counter
 *
 * @param {Object} state - The application state
 * @returns {void}
 */
const updateCounter = state => {
  state.counter.textContent = `${state.currentIndex + 1}/${state.GROUPS[state.activeGroup].triggerElements.length}`;
};

/**
 * Update Attributes
 *
 * @param {Object} state - The application state
 * @returns {void}
 */
const updateAttributes = state => {
  const TRIGGER_ELEMENTS = state.GROUPS[state.activeGroup].triggerElements;
  const TOTAL_TRIGGER_ELEMENTS = TRIGGER_ELEMENTS.length;
  const SLIDER = state.GROUPS[state.activeGroup].slider;
  const SLIDER_ELEMENTS = state.GROUPS[state.activeGroup].sliderElements;
  const IS_DRAGGABLE = SLIDER.classList.contains('parvus__slider--is-draggable');

  // Add draggable class if necessary
  if (state.config.simulateTouch && state.config.swipeClose && !IS_DRAGGABLE || state.config.simulateTouch && TOTAL_TRIGGER_ELEMENTS > 1 && !IS_DRAGGABLE) {
    SLIDER.classList.add('parvus__slider--is-draggable');
  } else {
    SLIDER.classList.remove('parvus__slider--is-draggable');
  }

  // Add extra output for screen reader if there is more than one slide
  if (TOTAL_TRIGGER_ELEMENTS > 1) {
    SLIDER.setAttribute('role', 'region');
    SLIDER.setAttribute('aria-roledescription', 'carousel');
    SLIDER.setAttribute('aria-label', state.config.l10n.sliderLabel);
    SLIDER_ELEMENTS.forEach((sliderElement, index) => {
      sliderElement.setAttribute('role', 'group');
      sliderElement.setAttribute('aria-label', `${state.config.l10n.slideLabel} ${index + 1}/${TOTAL_TRIGGER_ELEMENTS}`);
    });
  } else {
    SLIDER.removeAttribute('role');
    SLIDER.removeAttribute('aria-roledescription');
    SLIDER.removeAttribute('aria-label');
    SLIDER_ELEMENTS.forEach(sliderElement => {
      sliderElement.removeAttribute('role');
      sliderElement.removeAttribute('aria-label');
    });
  }

  // Show or hide buttons
  if (TOTAL_TRIGGER_ELEMENTS === 1) {
    state.counter.setAttribute('aria-hidden', 'true');
    state.previousButton.setAttribute('aria-hidden', 'true');
    state.nextButton.setAttribute('aria-hidden', 'true');
  } else {
    state.counter.removeAttribute('aria-hidden');
    state.previousButton.removeAttribute('aria-hidden');
    state.nextButton.removeAttribute('aria-hidden');
  }
};

/**
 * Update slider navigation status
 *
 * @param {Object} state - The application state
 * @returns {void}
 */
const updateSliderNavigationStatus = state => {
  const {
    triggerElements
  } = state.GROUPS[state.activeGroup];
  const TOTAL_TRIGGER_ELEMENTS = triggerElements.length;
  if (TOTAL_TRIGGER_ELEMENTS <= 1) {
    return;
  }

  // Determine navigation state
  const FIRST_SLIDE = state.currentIndex === 0;
  const LAST_SLIDE = state.currentIndex === TOTAL_TRIGGER_ELEMENTS - 1;

  // Set previous button state
  const PREV_DISABLED = FIRST_SLIDE ? 'true' : null;
  if (state.previousButton.getAttribute('aria-disabled') === 'true' !== !!PREV_DISABLED) {
    PREV_DISABLED ? state.previousButton.setAttribute('aria-disabled', 'true') : state.previousButton.removeAttribute('aria-disabled');
  }

  // Set next button state
  const NEXT_DISABLED = LAST_SLIDE ? 'true' : null;
  if (state.nextButton.getAttribute('aria-disabled') === 'true' !== !!NEXT_DISABLED) {
    NEXT_DISABLED ? state.nextButton.setAttribute('aria-disabled', 'true') : state.nextButton.removeAttribute('aria-disabled');
  }
};

/**
 * Add zoom indicator to element
 *
 * @param {HTMLElement} el - The element to add the zoom indicator to
 * @param {Object} config - Options object
 */
const addZoomIndicator = (el, config) => {
  if (el.querySelector('img') && el.querySelector('.parvus-zoom__indicator') === null) {
    const LIGHTBOX_INDICATOR_ICON = document.createElement('div');
    LIGHTBOX_INDICATOR_ICON.className = 'parvus-zoom__indicator';
    LIGHTBOX_INDICATOR_ICON.innerHTML = config.lightboxIndicatorIcon;
    el.appendChild(LIGHTBOX_INDICATOR_ICON);
  }
};

/**
 * Remove zoom indicator for element
 *
 * @param {HTMLElement} el - The element to remove the zoom indicator to
 */
const removeZoomIndicator = el => {
  if (el.querySelector('img') && el.querySelector('.parvus-zoom__indicator') !== null) {
    const LIGHTBOX_INDICATOR_ICON = el.querySelector('.parvus-zoom__indicator');
    el.removeChild(LIGHTBOX_INDICATOR_ICON);
  }
};

/**
 * Keyboard Event Handler Module
 *
 * Handles all keyboard interactions
 */


/**
 * Create keyboard event handler
 *
 * @param {Object} state - The application state
 * @param {Object} actions - Actions object with navigation functions
 * @returns {Function} Keyboard event handler
 */
const createKeydownHandler = (state, actions) => {
  return event => {
    const FOCUSABLE_CHILDREN = getFocusableChildren(state.lightbox);
    const FOCUSED_ITEM_INDEX = FOCUSABLE_CHILDREN.indexOf(document.activeElement);
    const lastIndex = FOCUSABLE_CHILDREN.length - 1;
    switch (event.code) {
      case 'Tab':
        {
          // Use the TAB key to navigate backwards and forwards
          if (event.shiftKey) {
            // Navigate backwards
            if (FOCUSED_ITEM_INDEX === 0) {
              FOCUSABLE_CHILDREN[lastIndex].focus();
              event.preventDefault();
            }
          } else {
            // Navigate forwards
            if (FOCUSED_ITEM_INDEX === lastIndex) {
              FOCUSABLE_CHILDREN[0].focus();
              event.preventDefault();
            }
          }
          break;
        }
      case 'Escape':
        {
          // Close Parvus when the ESC key is pressed
          actions.close();
          event.preventDefault();
          break;
        }
      case 'ArrowLeft':
        {
          // Show the previous slide when the PREV key is pressed
          actions.previous();
          event.preventDefault();
          break;
        }
      case 'ArrowRight':
        {
          // Show the next slide when the NEXT key is pressed
          actions.next();
          event.preventDefault();
          break;
        }
    }
  };
};

/**
 * Pointer Event Handler Module
 *
 * Handles all pointer interactions (mouse, touch, pen)
 */

/**
 * Create pointerdown event handler
 *
 * @param {Object} state - The application state
 * @returns {Function} Pointerdown event handler
 */
const createPointerdownHandler = state => {
  return event => {
    event.preventDefault();
    event.stopPropagation();
    state.isDraggingX = false;
    state.isDraggingY = false;
    state.pointerDown = true;
    state.activePointers.set(event.pointerId, event);
    state.drag.startX = event.pageX;
    state.drag.startY = event.pageY;
    state.drag.endX = event.pageX;
    state.drag.endY = event.pageY;
    const {
      slider
    } = state.GROUPS[state.activeGroup];
    slider.classList.add('parvus__slider--is-dragging');
    slider.style.willChange = 'transform';
    state.isTap = state.activePointers.size === 1;
    if (state.config.swipeClose) {
      state.lightboxOverlayOpacity = getComputedStyle(state.lightboxOverlay).opacity;
    }
  };
};

/**
 * Create pointermove event handler
 *
 * @param {Object} state - The application state
 * @param {Function} pinchZoom - Pinch zoom function
 * @param {Function} doSwipe - Swipe function
 * @returns {Function} Pointermove event handler
 */
const createPointermoveHandler = (state, pinchZoom, doSwipe) => {
  return event => {
    event.preventDefault();
    if (!state.pointerDown) {
      return;
    }
    const CURRENT_IMAGE = state.GROUPS[state.activeGroup].contentElements[state.currentIndex];

    // Update pointer position
    state.activePointers.set(event.pointerId, event);

    // Zoom
    if (CURRENT_IMAGE && CURRENT_IMAGE.tagName === 'IMG') {
      if (state.activePointers.size === 2) {
        pinchZoom(CURRENT_IMAGE);
        return;
      }
      if (state.currentScale > 1) {
        return;
      }
    }
    state.drag.endX = event.pageX;
    state.drag.endY = event.pageY;
    doSwipe();
  };
};

/**
 * Create pointerup event handler
 *
 * @param {Object} state - The application state
 * @param {Function} resetZoom - Reset zoom function
 * @param {Function} updateAfterDrag - Update after drag function
 * @returns {Function} Pointerup event handler
 */
const createPointerupHandler = (state, resetZoom, updateAfterDrag) => {
  return event => {
    event.stopPropagation();
    const {
      slider
    } = state.GROUPS[state.activeGroup];
    state.activePointers.delete(event.pointerId);
    if (state.activePointers.size > 0) {
      return;
    }
    state.pointerDown = false;
    const CURRENT_IMAGE = state.GROUPS[state.activeGroup].contentElements[state.currentIndex];

    // Reset zoom state by one tap
    const MOVEMENT_X = Math.abs(state.drag.endX - state.drag.startX);
    const MOVEMENT_Y = Math.abs(state.drag.endY - state.drag.startY);
    const IS_TAP = MOVEMENT_X < 8 && MOVEMENT_Y < 8 && !state.isDraggingX && !state.isDraggingY && state.isTap;
    slider.classList.remove('parvus__slider--is-dragging');
    slider.style.willChange = '';
    if (state.currentScale > 1) {
      if (IS_TAP) {
        resetZoom(CURRENT_IMAGE);
      } else {
        CURRENT_IMAGE.style.transform = `
          scale(${state.currentScale})
        `;
      }
    } else {
      if (state.isPinching) {
        resetZoom(CURRENT_IMAGE);
      }
      if (state.drag.endX || state.drag.endY) {
        updateAfterDrag();
      }
    }
    state.clearDrag();
  };
};

/**
 * Create click event handler
 *
 * @param {Object} state - The application state
 * @param {Object} actions - Actions object with navigation functions
 * @returns {Function} Click event handler
 */
const createClickHandler = (state, actions) => {
  return event => {
    const {
      target
    } = event;
    if (target === state.previousButton) {
      actions.previous();
    } else if (target === state.nextButton) {
      actions.next();
    } else if (target === state.closeButton || state.config.docClose && !state.isDraggingY && !state.isDraggingX && target.classList.contains('parvus__slide')) {
      actions.close();
    }
    event.stopPropagation();
  };
};

/**
 * Gesture Handler Module
 *
 * Handles gestures like pinch-to-zoom and swipe
 */

/**
 * Reset image zoom
 *
 * @param {Object} state - The application state
 * @param {HTMLImageElement} currentImg - The image
 * @returns {void}
 */
const resetZoom = (state, currentImg) => {
  currentImg.style.transition = 'transform 0.3s ease';
  currentImg.style.transform = '';
  setTimeout(() => {
    currentImg.style.transition = '';
    currentImg.style.transformOrigin = '';
  }, 300);
  state.resetZoomState();
  state.lightbox.classList.remove('parvus--is-zooming');
};

/**
 * Pinch zoom gesture
 *
 * @param {Object} state - The application state
 * @param {HTMLImageElement} currentImg - The image to zoom
 * @returns {void}
 */
const pinchZoom = (state, currentImg) => {
  // Determine current finger positions
  const POINTS = Array.from(state.activePointers.values());

  // Calculate current distance between fingers
  const CURRENT_DISTANCE = Math.hypot(POINTS[1].clientX - POINTS[0].clientX, POINTS[1].clientY - POINTS[0].clientY);

  // Calculate the midpoint between the two points
  const MIDPOINT_X = (POINTS[0].clientX + POINTS[1].clientX) / 2;
  const MIDPOINT_Y = (POINTS[0].clientY + POINTS[1].clientY) / 2;

  // Convert midpoint to relative position within the image
  const IMG_RECT = currentImg.getBoundingClientRect();
  const RELATIVE_X = (MIDPOINT_X - IMG_RECT.left) / IMG_RECT.width;
  const RELATIVE_Y = (MIDPOINT_Y - IMG_RECT.top) / IMG_RECT.height;

  // When pinch gesture is about to start or the finger IDs have changed
  // Use a unique ID based on the pointer IDs to recognize changes
  const CURRENT_POINTERS_ID = POINTS.map(p => p.pointerId).sort().join('-');
  const IS_NEW_POINTER_COMBINATION = state.lastPointersId !== CURRENT_POINTERS_ID;
  if (!state.isPinching || IS_NEW_POINTER_COMBINATION) {
    state.isPinching = true;
    state.lastPointersId = CURRENT_POINTERS_ID;

    // Save the start distance and current scaling as a basis
    state.pinchStartDistance = CURRENT_DISTANCE / state.currentScale;

    // Store initial pinch position for this gesture
    if (!currentImg.style.transformOrigin && state.currentScale === 1 || state.currentScale === 1 && IS_NEW_POINTER_COMBINATION) {
      // Set the transform origin to the pinch midpoint
      currentImg.style.transformOrigin = `${RELATIVE_X * 100}% ${RELATIVE_Y * 100}%`;
    }
    state.lightbox.classList.add('parvus--is-zooming');
  }

  // Calculate scaling factor based on distance change
  const SCALE_FACTOR = CURRENT_DISTANCE / state.pinchStartDistance;

  // Limit scaling to 1 - 3
  state.currentScale = Math.min(Math.max(1, SCALE_FACTOR), 3);
  currentImg.style.willChange = 'transform';
  currentImg.style.transform = `scale(${state.currentScale})`;
};

/**
 * Determine the swipe direction (horizontal or vertical)
 *
 * @param {Object} state - The application state
 * @returns {void}
 */
const doSwipe = state => {
  const MOVEMENT_THRESHOLD = 1.5;
  const MAX_OPACITY_DISTANCE = 100;
  const DIRECTION_BIAS = 1.15;
  const {
    startX,
    endX,
    startY,
    endY
  } = state.drag;
  const MOVEMENT_X = startX - endX;
  const MOVEMENT_Y = endY - startY;
  const MOVEMENT_X_DISTANCE = Math.abs(MOVEMENT_X);
  const MOVEMENT_Y_DISTANCE = Math.abs(MOVEMENT_Y);
  const GROUP = state.GROUPS[state.activeGroup];
  const SLIDER = GROUP.slider;
  const TOTAL_SLIDES = GROUP.triggerElements.length;
  const handleHorizontalSwipe = (movementX, distance) => {
    const IS_FIRST_SLIDE = state.currentIndex === 0;
    const IS_LAST_SLIDE = state.currentIndex === TOTAL_SLIDES - 1;
    const IS_LEFT_SWIPE = movementX > 0;
    const IS_RIGHT_SWIPE = movementX < 0;
    if (IS_FIRST_SLIDE && IS_RIGHT_SWIPE || IS_LAST_SLIDE && IS_LEFT_SWIPE) {
      const DAMPING_FACTOR = 1 / (1 + Math.pow(distance / 100, 0.15));
      const REDUCED_MOVEMENT = movementX * DAMPING_FACTOR;
      SLIDER.style.transform = `
        translate3d(${state.offsetTmp - Math.round(REDUCED_MOVEMENT)}px, 0, 0)
      `;
    } else {
      SLIDER.style.transform = `
        translate3d(${state.offsetTmp - Math.round(movementX)}px, 0, 0)
      `;
    }
  };
  const handleVerticalSwipe = (movementY, distance) => {
    if (!state.isReducedMotion && distance <= 100) {
      const NEW_OVERLAY_OPACITY = Math.max(0, state.lightboxOverlayOpacity - distance / MAX_OPACITY_DISTANCE);
      state.lightboxOverlay.style.opacity = NEW_OVERLAY_OPACITY;
    }
    state.lightbox.classList.add('parvus--is-vertical-closing');
    SLIDER.style.transform = `
      translate3d(${state.offsetTmp}px, ${Math.round(movementY)}px, 0)
    `;
  };
  if (state.isDraggingX || state.isDraggingY) {
    if (state.isDraggingX) {
      handleHorizontalSwipe(MOVEMENT_X, MOVEMENT_X_DISTANCE);
    } else if (state.isDraggingY) {
      handleVerticalSwipe(MOVEMENT_Y, MOVEMENT_Y_DISTANCE);
    }
    return;
  }

  // Direction detection based on the relative ratio of movements
  if (MOVEMENT_X_DISTANCE > MOVEMENT_THRESHOLD || MOVEMENT_Y_DISTANCE > MOVEMENT_THRESHOLD) {
    // Horizontal swipe if X-movement is stronger than Y-movement * DIRECTION_BIAS
    if (MOVEMENT_X_DISTANCE > MOVEMENT_Y_DISTANCE * DIRECTION_BIAS && TOTAL_SLIDES > 1) {
      state.isDraggingX = true;
      state.isDraggingY = false;
      handleHorizontalSwipe(MOVEMENT_X, MOVEMENT_X_DISTANCE);
    } else if (MOVEMENT_Y_DISTANCE > MOVEMENT_X_DISTANCE * DIRECTION_BIAS && state.config.swipeClose) {
      // Vertical swipe if Y-movement is stronger than X-movement * DIRECTION_BIAS
      state.isDraggingX = false;
      state.isDraggingY = true;
      handleVerticalSwipe(MOVEMENT_Y, MOVEMENT_Y_DISTANCE);
    }
  }
};

/**
 * Recalculate drag/swipe event after pointerup
 *
 * @param {Object} state - The application state
 * @param {Object} actions - Navigation actions
 * @returns {void}
 */
const updateAfterDrag = (state, actions) => {
  const {
    startX,
    startY,
    endX,
    endY
  } = state.drag;
  const MOVEMENT_X = endX - startX;
  const MOVEMENT_Y = endY - startY;
  const MOVEMENT_X_DISTANCE = Math.abs(MOVEMENT_X);
  const MOVEMENT_Y_DISTANCE = Math.abs(MOVEMENT_Y);
  const {
    triggerElements
  } = state.GROUPS[state.activeGroup];
  const TOTAL_TRIGGER_ELEMENTS = triggerElements.length;
  if (state.isDraggingX) {
    const IS_RIGHT_SWIPE = MOVEMENT_X > 0;
    if (MOVEMENT_X_DISTANCE >= state.config.threshold) {
      if (IS_RIGHT_SWIPE && state.currentIndex > 0) {
        actions.previous();
      } else if (!IS_RIGHT_SWIPE && state.currentIndex < TOTAL_TRIGGER_ELEMENTS - 1) {
        actions.next();
      }
    }
    actions.updateOffset();
  } else if (state.isDraggingY) {
    if (MOVEMENT_Y_DISTANCE >= state.config.threshold && state.config.swipeClose) {
      actions.close();
    } else {
      state.lightbox.classList.remove('parvus--is-vertical-closing');
      actions.updateOffset();
    }
    state.lightboxOverlay.style.opacity = '';
  } else {
    actions.updateOffset();
  }
};

/**
 * Image Handler Module
 *
 * Handles image loading, captions, and dimensions
 */

/**
 * Add caption to the container element
 *
 * @param {Object} config - Configuration object
 * @param {HTMLElement} containerEl - The container element to which the caption will be added
 * @param {HTMLElement} imageEl - The image the caption is linked to
 * @param {HTMLElement} el - The trigger element associated with the caption
 * @param {Number} index - The index of the caption
 * @returns {void}
 */
const addCaption = (config, containerEl, imageEl, el, index) => {
  const getCaptionData = triggerEl => {
    const {
      captionsAttribute,
      captionsSelector,
      captionsIdAttribute = 'data-caption-id'
    } = config;

    // Check for an ID reference on the trigger element
    // This allows the caption to be anywhere on the page
    const CAPTION_ID = triggerEl.getAttribute(captionsIdAttribute);
    if (CAPTION_ID) {
      const CAPTION_EL = document.getElementById(CAPTION_ID);
      if (CAPTION_EL) {
        return CAPTION_EL.innerHTML;
      }
    }

    // Check for a direct caption attribute on the trigger element
    const DIRECT_CAPTION = triggerEl.getAttribute(captionsAttribute);
    if (DIRECT_CAPTION) {
      return DIRECT_CAPTION;
    }

    // Query for a selector inside the trigger element
    if (captionsSelector !== 'self') {
      const CAPTION_EL = triggerEl.querySelector(captionsSelector);
      if (CAPTION_EL) {
        // Prefer a direct attribute on the found element, otherwise use its content
        return CAPTION_EL.getAttribute(captionsAttribute) || CAPTION_EL.innerHTML;
      }
    }
    return null;
  };
  const CAPTION_DATA = getCaptionData(el);
  if (CAPTION_DATA) {
    const CAPTION_CONTAINER = document.createElement('div');
    const CAPTION_ID = `parvus__caption-${index}`;
    CAPTION_CONTAINER.className = 'parvus__caption';
    CAPTION_CONTAINER.id = CAPTION_ID;
    CAPTION_CONTAINER.innerHTML = `<p>${CAPTION_DATA}</p>`;
    containerEl.appendChild(CAPTION_CONTAINER);
    imageEl.setAttribute('aria-describedby', CAPTION_ID);
  }
};

/**
 * Create image
 *
 * @param {Object} state - The application state
 * @param {HTMLElement} el - The trigger element
 * @param {Number} index - The index
 * @param {Function} callback - Callback function
 * @returns {void}
 */
const createImage = (state, el, index, callback) => {
  const {
    contentElements,
    sliderElements
  } = state.GROUPS[state.activeGroup];
  if (contentElements[index] !== undefined) {
    if (callback && typeof callback === 'function') {
      callback();
    }
    return;
  }
  const CONTENT_CONTAINER_EL = sliderElements[index].querySelector('div');
  const IMAGE = new Image();
  const IMAGE_CONTAINER = document.createElement('div');
  const THUMBNAIL = el.querySelector('img');
  const LOADING_INDICATOR = document.createElement('div');
  IMAGE_CONTAINER.className = 'parvus__content';

  // Create loading indicator
  LOADING_INDICATOR.className = 'parvus__loader';
  LOADING_INDICATOR.setAttribute('role', 'progressbar');
  LOADING_INDICATOR.setAttribute('aria-label', state.config.l10n.lightboxLoadingIndicatorLabel);

  // Add loading indicator to content container
  CONTENT_CONTAINER_EL.appendChild(LOADING_INDICATOR);
  const checkImagePromise = new Promise((resolve, reject) => {
    IMAGE.onload = () => resolve(IMAGE);
    IMAGE.onerror = error => reject(error);
  });
  checkImagePromise.then(loadedImage => {
    loadedImage.style.opacity = 0;
    IMAGE_CONTAINER.appendChild(loadedImage);
    CONTENT_CONTAINER_EL.appendChild(IMAGE_CONTAINER);

    // Add caption if available
    if (state.config.captions) {
      addCaption(state.config, CONTENT_CONTAINER_EL, IMAGE, el, index);
    }
    contentElements[index] = loadedImage;

    // Set image width and height
    loadedImage.setAttribute('width', loadedImage.naturalWidth);
    loadedImage.setAttribute('height', loadedImage.naturalHeight);

    // Set image dimension
    setImageDimension(sliderElements[index], loadedImage);
  }).catch(() => {
    const ERROR_CONTAINER = document.createElement('div');
    ERROR_CONTAINER.classList.add('parvus__content');
    ERROR_CONTAINER.classList.add('parvus__content--error');
    ERROR_CONTAINER.textContent = state.config.l10n.lightboxLoadingError;
    CONTENT_CONTAINER_EL.appendChild(ERROR_CONTAINER);
    contentElements[index] = ERROR_CONTAINER;
  }).finally(() => {
    CONTENT_CONTAINER_EL.removeChild(LOADING_INDICATOR);
    if (callback && typeof callback === 'function') {
      callback();
    }
  });

  // Add `sizes` attribute
  if (el.hasAttribute('data-sizes') && el.getAttribute('data-sizes') !== '') {
    IMAGE.setAttribute('sizes', el.getAttribute('data-sizes'));
  }

  // Add `srcset` attribute
  if (el.hasAttribute('data-srcset') && el.getAttribute('data-srcset') !== '') {
    IMAGE.setAttribute('srcset', el.getAttribute('data-srcset'));
  }

  // Add `src` attribute
  if (el.tagName === 'A') {
    IMAGE.setAttribute('src', el.href);
  } else {
    IMAGE.setAttribute('src', el.getAttribute('data-target'));
  }

  // `alt` attribute
  if (THUMBNAIL && THUMBNAIL.hasAttribute('alt') && THUMBNAIL.getAttribute('alt') !== '') {
    IMAGE.alt = THUMBNAIL.alt;
  } else if (el.hasAttribute('data-alt') && el.getAttribute('data-alt') !== '') {
    IMAGE.alt = el.getAttribute('data-alt');
  } else {
    IMAGE.alt = '';
  }
};

/**
 * Load Image
 *
 * @param {Object} state - The application state
 * @param {Number} index - The index of the image to load
 * @param {Boolean} animate - Whether to animate the image
 * @returns {void}
 */
const loadImage = (state, index, animate) => {
  const IMAGE = state.GROUPS[state.activeGroup].contentElements[index];
  if (IMAGE && IMAGE.tagName === 'IMG') {
    const THUMBNAIL = state.GROUPS[state.activeGroup].triggerElements[index];
    if (animate && document.startViewTransition) {
      THUMBNAIL.style.viewTransitionName = 'lightboximage';
      const transition = document.startViewTransition(() => {
        IMAGE.style.opacity = '';
        THUMBNAIL.style.viewTransitionName = null;
        IMAGE.style.viewTransitionName = 'lightboximage';
      });
      transition.finished.finally(() => {
        IMAGE.style.viewTransitionName = null;
      });
    } else {
      IMAGE.style.opacity = '';
    }
  } else {
    IMAGE.style.opacity = '';
  }
};

/**
 * Set image dimension
 *
 * @param {HTMLElement} slideEl - The slide element
 * @param {HTMLElement} contentEl - The content element
 * @returns {void}
 */
const setImageDimension = (slideEl, contentEl) => {
  if (contentEl.tagName !== 'IMG') {
    return;
  }
  const SRC_HEIGHT = contentEl.getAttribute('height');
  const SRC_WIDTH = contentEl.getAttribute('width');
  if (!SRC_HEIGHT || !SRC_WIDTH) {
    return;
  }
  const SLIDE_EL_STYLES = getComputedStyle(slideEl);
  const HORIZONTAL_PADDING = parseFloat(SLIDE_EL_STYLES.paddingLeft) + parseFloat(SLIDE_EL_STYLES.paddingRight);
  const VERTICAL_PADDING = parseFloat(SLIDE_EL_STYLES.paddingTop) + parseFloat(SLIDE_EL_STYLES.paddingBottom);
  const CAPTION_EL = slideEl.querySelector('.parvus__caption');
  const CAPTION_HEIGHT = CAPTION_EL ? CAPTION_EL.getBoundingClientRect().height : 0;
  const MAX_WIDTH = slideEl.offsetWidth - HORIZONTAL_PADDING;
  const MAX_HEIGHT = slideEl.offsetHeight - VERTICAL_PADDING - CAPTION_HEIGHT;
  const RATIO = Math.min(MAX_WIDTH / SRC_WIDTH || 0, MAX_HEIGHT / SRC_HEIGHT || 0);
  const NEW_WIDTH = SRC_WIDTH * RATIO;
  const NEW_HEIGHT = SRC_HEIGHT * RATIO;
  const USE_ORIGINAL_SIZE = SRC_WIDTH <= MAX_WIDTH && SRC_HEIGHT <= MAX_HEIGHT;
  contentEl.style.width = USE_ORIGINAL_SIZE ? '' : `${NEW_WIDTH}px`;
  contentEl.style.height = USE_ORIGINAL_SIZE ? '' : `${NEW_HEIGHT}px`;
};

/**
 * Create resize handler
 *
 * @param {Object} state - The application state
 * @param {Function} updateOffset - Update offset function
 * @returns {Function} Resize event handler
 */
const createResizeHandler = (state, updateOffset) => {
  return () => {
    if (!state.resizeTicking) {
      state.resizeTicking = true;
      window.requestAnimationFrame(() => {
        state.GROUPS[state.activeGroup].sliderElements.forEach((slide, index) => {
          setImageDimension(slide, state.GROUPS[state.activeGroup].contentElements[index]);
        });
        updateOffset();
        state.resizeTicking = false;
      });
    }
  };
};

// Helper modules

/**
 * Parvus Lightbox
 *
 * @param {Object} userOptions - User configuration options
 * @returns {Object} Parvus instance
 */
function Parvus(userOptions) {
  const BROWSER_WINDOW = window;
  const STATE = new ParvusState();
  const MOTIONQUERY = BROWSER_WINDOW.matchMedia('(prefers-reduced-motion)');
  const PLUGIN_MANAGER = new PluginManager();

  // Event handlers will be created after actions are defined
  let keydownHandler, clickHandler, pointerdownHandler, pointermoveHandler, pointerupHandler, resizeHandler;

  /**
   * Click event handler to trigger Parvus
   *
   * @param {Event} event - The click event object
   */
  const triggerParvus = function triggerParvus(event) {
    event.preventDefault();
    open(this);
  };

  /**
   * Add an element
   *
   * @param {HTMLElement} el - The element to be added
   */
  const add = el => {
    // Check element type and attributes
    const IS_VALID_LINK = el.tagName === 'A' && el.hasAttribute('href');
    const IS_VALID_BUTTON = el.tagName === 'BUTTON' && el.hasAttribute('data-target');
    if (!IS_VALID_LINK && !IS_VALID_BUTTON) {
      throw new Error('Use a link with the \'href\' attribute or a button with the \'data-target\' attribute. Both attributes must contain a path to the image file.');
    }

    // Check if the lightbox already exists
    if (!STATE.lightbox) {
      createLightbox(STATE);

      // Execute afterInit hook when lightbox is first created
      PLUGIN_MANAGER.executeHook('afterInit', {
        state: STATE
      });
    }
    STATE.newGroup = getGroup(STATE, el);
    if (!STATE.GROUPS[STATE.newGroup]) {
      STATE.GROUPS[STATE.newGroup] = structuredClone(STATE.GROUP_ATTRIBUTES);
    }
    if (STATE.GROUPS[STATE.newGroup].triggerElements.includes(el)) {
      throw new Error('Ups, element already added.');
    }
    STATE.GROUPS[STATE.newGroup].triggerElements.push(el);
    if (STATE.config.zoomIndicator) {
      addZoomIndicator(el, STATE.config);
    }
    el.classList.add('parvus-trigger');
    el.addEventListener('click', triggerParvus);
    if (isOpen() && STATE.newGroup === STATE.activeGroup) {
      const EL_INDEX = STATE.GROUPS[STATE.newGroup].triggerElements.indexOf(el);
      createSlide(STATE, EL_INDEX);
      createImage(STATE, el, EL_INDEX, () => {
        loadImage(STATE, EL_INDEX);
      });
      updateAttributes(STATE);
      updateSliderNavigationStatus(STATE);
      updateCounter(STATE);
    }
  };

  /**
   * Remove an element
   *
   * @param {HTMLElement} el - The element to be removed
   */
  const remove = el => {
    if (!el || !el.hasAttribute('data-group')) {
      return;
    }
    const EL_GROUP = getGroup(STATE, el);
    const GROUP = STATE.GROUPS[EL_GROUP];

    // Check if element exists
    if (!GROUP) {
      return;
    }
    const EL_INDEX = GROUP.triggerElements.indexOf(el);
    if (EL_INDEX === -1) {
      return;
    }
    const IS_CURRENT_EL = isOpen() && EL_GROUP === STATE.activeGroup && EL_INDEX === STATE.currentIndex;

    // Remove group data
    if (GROUP.contentElements[EL_INDEX]) {
      const content = GROUP.contentElements[EL_INDEX];
      if (content.tagName === 'IMG') {
        content.src = '';
        content.srcset = '';
      }
    }

    // Remove DOM element
    const sliderElement = GROUP.sliderElements[EL_INDEX];
    if (sliderElement && sliderElement.parentNode) {
      sliderElement.parentNode.removeChild(sliderElement);
    }

    // Remove all array elements
    GROUP.triggerElements.splice(EL_INDEX, 1);
    GROUP.sliderElements.splice(EL_INDEX, 1);
    GROUP.contentElements.splice(EL_INDEX, 1);
    if (STATE.config.zoomIndicator) {
      removeZoomIndicator(el);
    }
    if (isOpen() && EL_GROUP === STATE.activeGroup) {
      if (IS_CURRENT_EL) {
        if (GROUP.triggerElements.length === 0) {
          close();
        } else if (STATE.currentIndex >= GROUP.triggerElements.length) {
          select(GROUP.triggerElements.length - 1);
        } else {
          updateAttributes(STATE);
          updateSliderNavigationStatus(STATE);
          updateCounter(STATE);
        }
      } else if (EL_INDEX < STATE.currentIndex) {
        STATE.currentIndex--;
        updateAttributes(STATE);
        updateSliderNavigationStatus(STATE);
        updateCounter(STATE);
      } else {
        updateAttributes(STATE);
        updateSliderNavigationStatus(STATE);
        updateCounter(STATE);
      }
    }

    // Unbind click event handler
    el.removeEventListener('click', triggerParvus);
    el.classList.remove('parvus-trigger');
  };

  /**
   * Open Parvus
   *
   * @param {HTMLElement} el
   */
  const open = el => {
    if (!STATE.lightbox || !el || !el.classList.contains('parvus-trigger') || isOpen()) {
      return;
    }
    STATE.activeGroup = getGroup(STATE, el);
    const GROUP = STATE.GROUPS[STATE.activeGroup];
    const EL_INDEX = GROUP.triggerElements.indexOf(el);
    if (EL_INDEX === -1) {
      throw new Error('Ups, element not found in group.');
    }
    STATE.currentIndex = EL_INDEX;
    history.pushState({
      parvus: 'close'
    }, 'Image', window.location.href);
    bindEvents();
    if (STATE.config.hideScrollbar) {
      document.body.style.marginInlineEnd = `${getScrollbarWidth()}px`;
      document.body.style.overflow = 'hidden';
    }
    STATE.lightbox.classList.add('parvus--is-opening');
    STATE.lightbox.showModal();
    createSlider(STATE);
    createSlide(STATE, STATE.currentIndex);
    updateOffset(STATE);
    updateAttributes(STATE);
    updateSliderNavigationStatus(STATE);
    updateCounter(STATE);
    loadSlide(STATE, STATE.currentIndex);
    createImage(STATE, el, STATE.currentIndex, () => {
      loadImage(STATE, STATE.currentIndex, true);
      STATE.lightbox.classList.remove('parvus--is-opening');
      GROUP.slider.classList.add('parvus__slider--animate');
    });
    preload(STATE, createSlide, createImage, loadImage, STATE.currentIndex + 1);
    preload(STATE, createSlide, createImage, loadImage, STATE.currentIndex - 1);

    // Execute afterOpen hook
    PLUGIN_MANAGER.executeHook('afterOpen', {
      element: el,
      state: STATE
    });

    // Create and dispatch a new event
    dispatchCustomEvent(STATE.lightbox, 'open');
  };

  /**
   * Close Parvus
   */
  const close = () => {
    if (!isOpen()) {
      return;
    }
    const IMAGE = STATE.GROUPS[STATE.activeGroup].contentElements[STATE.currentIndex];
    const THUMBNAIL = STATE.GROUPS[STATE.activeGroup].triggerElements[STATE.currentIndex];
    unbindEvents();
    STATE.clearDrag();
    if (history.state?.parvus === 'close') {
      history.back();
    }
    STATE.lightbox.classList.add('parvus--is-closing');
    const transitionendHandler = () => {
      // Reset the image zoom (if ESC was pressed or went back in the browser history)
      // after the ViewTransition (otherwise it looks bad)
      if (STATE.isPinching) {
        resetZoom(STATE, IMAGE);
      }
      leaveSlide(STATE, STATE.currentIndex);
      STATE.lightbox.close();
      STATE.lightbox.classList.remove('parvus--is-closing');
      STATE.lightbox.classList.remove('parvus--is-vertical-closing');
      STATE.GROUPS[STATE.activeGroup].slider.remove();
      STATE.GROUPS[STATE.activeGroup].slider = null;
      STATE.GROUPS[STATE.activeGroup].sliderElements = [];
      STATE.GROUPS[STATE.activeGroup].contentElements = [];
      STATE.counter.removeAttribute('aria-hidden');
      STATE.previousButton.removeAttribute('aria-hidden');
      STATE.previousButton.removeAttribute('aria-disabled');
      STATE.nextButton.removeAttribute('aria-hidden');
      STATE.nextButton.removeAttribute('aria-disabled');
      if (STATE.config.hideScrollbar) {
        document.body.style.marginInlineEnd = '';
        document.body.style.overflow = '';
      }

      // Execute afterClose hook
      PLUGIN_MANAGER.executeHook('afterClose', {
        state: STATE
      });
    };
    if (IMAGE && IMAGE.tagName === 'IMG') {
      if (document.startViewTransition) {
        IMAGE.style.viewTransitionName = 'lightboximage';
        const transition = document.startViewTransition(() => {
          IMAGE.style.opacity = '0';
          IMAGE.style.viewTransitionName = null;
          THUMBNAIL.style.viewTransitionName = 'lightboximage';
        });
        transition.finished.finally(() => {
          transitionendHandler();
          THUMBNAIL.style.viewTransitionName = null;
        });
      } else {
        IMAGE.style.opacity = '0';
        requestAnimationFrame(transitionendHandler);
      }
    } else {
      transitionendHandler();
    }
  };

  /**
   * Select a specific slide by index
   *
   * @param {number} index - Index of the slide to select
   */
  const select = index => {
    if (!isOpen()) {
      throw new Error("Oops, I'm closed.");
    }
    if (typeof index !== 'number' || isNaN(index)) {
      throw new Error('Oops, no slide specified.');
    }
    const GROUP = STATE.GROUPS[STATE.activeGroup];
    const triggerElements = GROUP.triggerElements;
    if (index === STATE.currentIndex) {
      throw new Error(`Oops, slide ${index} is already selected.`);
    }
    if (index < 0 || index >= triggerElements.length) {
      throw new Error(`Oops, I can't find slide ${index}.`);
    }
    const OLD_INDEX = STATE.currentIndex;
    STATE.currentIndex = index;
    if (GROUP.sliderElements[index]) {
      loadSlide(STATE, index);
    } else {
      createSlide(STATE, index);
      createImage(STATE, GROUP.triggerElements[index], index, () => {
        loadImage(STATE, index);
      });
      loadSlide(STATE, index);
    }
    updateOffset(STATE);
    updateSliderNavigationStatus(STATE);
    updateCounter(STATE);

    // Execute slideChange hook
    PLUGIN_MANAGER.executeHook('slideChange', {
      index,
      oldIndex: OLD_INDEX,
      state: STATE
    });
    if (index < OLD_INDEX) {
      preload(STATE, createSlide, createImage, loadImage, index - 1);
    } else {
      preload(STATE, createSlide, createImage, loadImage, index + 1);
    }
    leaveSlide(STATE, OLD_INDEX);

    // Create and dispatch a new event
    dispatchCustomEvent(STATE.lightbox, 'select');
  };

  /**
   * Select the previous slide
   */
  const previous = () => {
    if (STATE.currentIndex > 0) {
      select(STATE.currentIndex - 1);
    }
  };

  /**
   * Select the next slide
   */
  const next = () => {
    const {
      triggerElements
    } = STATE.GROUPS[STATE.activeGroup];
    if (STATE.currentIndex < triggerElements.length - 1) {
      select(STATE.currentIndex + 1);
    }
  };

  /**
   * Bind specified events
   */
  const bindEvents = () => {
    const actions = {
      close,
      previous,
      next,
      updateOffset: () => updateOffset(STATE)
    };

    // Create handlers with state and actions
    keydownHandler = createKeydownHandler(STATE, actions);
    clickHandler = createClickHandler(STATE, actions);
    resizeHandler = createResizeHandler(STATE, () => updateOffset(STATE));
    const updateAfterDragHandler = () => updateAfterDrag(STATE, actions);
    const pinchZoomHandler = img => pinchZoom(STATE, img);
    const doSwipeHandler = () => doSwipe(STATE);
    const resetZoomHandler = img => resetZoom(STATE, img);
    pointerdownHandler = createPointerdownHandler(STATE);
    pointermoveHandler = createPointermoveHandler(STATE, pinchZoomHandler, doSwipeHandler);
    pointerupHandler = createPointerupHandler(STATE, resetZoomHandler, updateAfterDragHandler);
    BROWSER_WINDOW.addEventListener('keydown', keydownHandler);
    BROWSER_WINDOW.addEventListener('resize', resizeHandler);

    // Popstate event
    BROWSER_WINDOW.addEventListener('popstate', close);

    // Check for any OS level changes to the prefers reduced motion preference
    MOTIONQUERY.addEventListener('change', () => reducedMotionCheck(STATE, MOTIONQUERY));

    // Click event
    STATE.lightbox.addEventListener('click', clickHandler);

    // Pointer events
    STATE.lightbox.addEventListener('pointerdown', pointerdownHandler, {
      passive: false
    });
    STATE.lightbox.addEventListener('pointerup', pointerupHandler, {
      passive: true
    });
    STATE.lightbox.addEventListener('pointermove', pointermoveHandler, {
      passive: false
    });
  };

  /**
   * Unbind specified events
   */
  const unbindEvents = () => {
    BROWSER_WINDOW.removeEventListener('keydown', keydownHandler);
    BROWSER_WINDOW.removeEventListener('resize', resizeHandler);

    // Popstate event
    BROWSER_WINDOW.removeEventListener('popstate', close);

    // Check for any OS level changes to the prefers reduced motion preference
    MOTIONQUERY.removeEventListener('change', () => reducedMotionCheck(STATE, MOTIONQUERY));

    // Click event
    STATE.lightbox.removeEventListener('click', clickHandler);

    // Pointer events
    STATE.lightbox.removeEventListener('pointerdown', pointerdownHandler);
    STATE.lightbox.removeEventListener('pointerup', pointerupHandler);
    STATE.lightbox.removeEventListener('pointermove', pointermoveHandler);
  };

  /**
   * Destroy Parvus
   */
  const destroy = () => {
    if (!STATE.lightbox) {
      return;
    }
    if (isOpen()) {
      close();
    }

    // Add setTimeout to ensure all possible close transitions are completed
    setTimeout(() => {
      unbindEvents();

      // Remove all registered event listeners for custom events
      const eventTypes = ['open', 'close', 'select', 'destroy'];
      eventTypes.forEach(eventType => {
        const listeners = STATE.lightbox._listeners?.[eventType] || [];
        listeners.forEach(listener => {
          STATE.lightbox.removeEventListener(eventType, listener);
        });
      });

      // Remove event listeners from trigger elements
      const LIGHTBOX_TRIGGER_ELS = document.querySelectorAll('.parvus-trigger');
      LIGHTBOX_TRIGGER_ELS.forEach(el => {
        el.removeEventListener('click', triggerParvus);
        el.classList.remove('parvus-trigger');
        if (STATE.config.zoomIndicator) {
          removeZoomIndicator(el);
        }
        if (el.dataset.group) {
          delete el.dataset.group;
        }
      });

      // Create and dispatch a new event
      dispatchCustomEvent(STATE.lightbox, 'destroy');
      STATE.lightbox.remove();

      // Remove references
      STATE.lightbox = null;
      STATE.lightboxOverlay = null;
      STATE.toolbar = null;
      STATE.toolbarLeft = null;
      STATE.toolbarRight = null;
      STATE.controls = null;
      STATE.previousButton = null;
      STATE.nextButton = null;
      STATE.closeButton = null;
      STATE.counter = null;

      // Remove group data
      Object.keys(STATE.GROUPS).forEach(groupKey => {
        const group = STATE.GROUPS[groupKey];
        if (group && group.contentElements) {
          group.contentElements.forEach(content => {
            if (content && content.tagName === 'IMG') {
              content.src = '';
              content.srcset = '';
            }
          });
        }
        delete STATE.GROUPS[groupKey];
      });

      // Reset variables
      STATE.groupIdCounter = 0;
      STATE.newGroup = null;
      STATE.activeGroup = null;
      STATE.currentIndex = 0;
    }, 1000);
  };

  /**
   * Check if Parvus is open
   *
   * @returns {boolean} - True if Parvus is open, otherwise false
   */
  const isOpen = () => {
    return STATE.lightbox?.hasAttribute('open');
  };

  /**
   * Get the current index
   *
   * @returns {number} - The current index
   */
  const getCurrentIndex = () => {
    return STATE.currentIndex;
  };

  /**
   * Bind a specific event listener
   *
   * @param {String} eventName - The name of the event to bind
   * @param {Function} callback - The callback function
   */
  const on$1 = (eventName, callback) => {
    on(STATE.lightbox, eventName, callback);
  };

  /**
   * Unbind a specific event listener
   *
   * @param {String} eventName - The name of the event to unbind
   * @param {Function} callback - The callback function
   */
  const off$1 = (eventName, callback) => {
    off(STATE.lightbox, eventName, callback);
  };

  /**
   * Use a plugin
   *
   * @param {Object} plugin - Plugin object
   * @param {Object} options - Plugin options
   */
  const use = (plugin, options = {}) => {
    PLUGIN_MANAGER.register(plugin, options);
  };

  /**
   * Add a hook callback
   *
   * @param {String} hookName - Hook name
   * @param {Function} callback - Callback function
   */
  const addHook = (hookName, callback) => {
    PLUGIN_MANAGER.addHook(hookName, callback);
  };

  /**
   * Get registered plugins
   *
   * @returns {Array} Array of plugin names
   */
  const getPlugins = () => {
    return PLUGIN_MANAGER.getPlugins();
  };

  /**
   * Init
   */
  const init = () => {
    // Merge user options into defaults
    STATE.config = mergeOptions(userOptions);
    reducedMotionCheck(STATE, MOTIONQUERY);

    // Install plugins with context
    const pluginContext = {
      state: STATE,
      on: on,
      addHook: PLUGIN_MANAGER.addHook.bind(PLUGIN_MANAGER),
      config: STATE.config
    };
    PLUGIN_MANAGER.install(pluginContext);
    if (STATE.config.gallerySelector !== null) {
      // Get a list of all `gallerySelector` elements within the document
      const GALLERY_ELS = document.querySelectorAll(STATE.config.gallerySelector);

      // Execute a few things once per element
      GALLERY_ELS.forEach((galleryEl, index) => {
        const GALLERY_INDEX = index;
        // Get a list of all `selector` elements within the `gallerySelector`
        const LIGHTBOX_TRIGGER_GALLERY_ELS = galleryEl.querySelectorAll(STATE.config.selector);

        // Execute a few things once per element
        LIGHTBOX_TRIGGER_GALLERY_ELS.forEach(lightboxTriggerEl => {
          lightboxTriggerEl.setAttribute('data-group', `parvus-gallery-${GALLERY_INDEX}`);
          add(lightboxTriggerEl);
        });
      });
    }

    // Get a list of all `selector` elements outside or without the `gallerySelector`
    const LIGHTBOX_TRIGGER_ELS = document.querySelectorAll(`${STATE.config.selector}:not(.parvus-trigger)`);
    LIGHTBOX_TRIGGER_ELS.forEach(add);
  };
  init();
  return {
    init,
    open,
    close,
    select,
    previous,
    next,
    currentIndex: getCurrentIndex,
    add,
    remove,
    destroy,
    isOpen,
    on: on$1,
    off: off$1,
    use,
    addHook,
    getPlugins
  };
}

export { Parvus as default };
