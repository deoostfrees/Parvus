/**
 * Parvus
 *
 * @author Benjamin de Oostfrees
 * @version 2.2.0
 * @url https://github.com/deoostfrees/parvus
 *
 * MIT license
 */

var en = {
  lightboxLabel: 'This is a dialog window which overlays the main content of the page. The modal shows the enlarged image. Pressing the Escape key will close the modal and bring you back to where you were on the page.',
  lightboxLoadingIndicatorLabel: 'Image loading',
  previousButtonLabel: 'Previous image',
  nextButtonLabel: 'Next image',
  closeButtonLabel: 'Close dialog window'
};

// Default language
function Parvus(userOptions) {
  /**
   * Global variables
   *
   */
  const BROWSER_WINDOW = window;
  const FOCUSABLE_ELEMENTS = ['button:not([disabled]):not([inert])', '[tabindex]:not([tabindex^="-"]):not([inert])'];
  const GROUP_ATTS = {
    gallery: [],
    slider: null,
    sliderElements: [],
    images: []
  };
  const GROUPS = {};
  let newGroup = null;
  let activeGroup = null;
  let currentIndex = 0;
  let config = {};
  let lightbox = null;
  let lightboxOverlay = null;
  let lightboxOverlayOpacity = 1;
  let toolbar = null;
  let toolbarLeft = null;
  let toolbarRight = null;
  let previousButton = null;
  let nextButton = null;
  let closeButton = null;
  let counter = null;
  let widthDifference = 0;
  let heightDifference = 0;
  let xDifference = 0;
  let yDifference = 0;
  let drag = {};
  let isDraggingX = false;
  let isDraggingY = false;
  let pointerDown = false;
  let lastFocus = null;
  let offset = null;
  let offsetTmp = null;
  let resizeTicking = false;
  let transitionDuration = null;
  let isReducedMotion = true;

  /**
   * Merge default options with user options
   *
   * @param {Object} userOptions
   * @returns {Object}
   */
  const mergeOptions = userOptions => {
    // Default options
    const OPTIONS = {
      selector: '.lightbox',
      gallerySelector: null,
      captions: true,
      captionsSelector: 'self',
      captionsAttribute: 'data-caption',
      docClose: true,
      scrollClose: false,
      swipeClose: true,
      simulateTouch: true,
      threshold: 50,
      backFocus: true,
      transitionDuration: 300,
      reducedTransitionDuration: 0.1,
      transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.22, 1)',
      lightboxIndicatorIcon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>',
      previousButtonIcon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path stroke="none" d="M0 0h24v24H0z"/><polyline points="15 6 9 12 15 18" /></svg>',
      nextButtonIcon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path stroke="none" d="M0 0h24v24H0z"/><polyline points="9 6 15 12 9 18" /></svg>',
      closeButtonIcon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 6L6 18M6 6l12 12"/></svg>',
      l10n: en,
      fileTypes: /\.(png|jpe?g|webp|avif|svg)(\?.*)?$/i
    };
    return {
      ...OPTIONS,
      ...userOptions
    };
  };

  /**
   * Check prefers reduced motion
   * https://developer.mozilla.org/en-US/docs/Web/API/MediaQueryList
   *
   */
  const MOTIONQUERY = window.matchMedia('(prefers-reduced-motion)');
  const reducedMotionCheck = () => {
    if (MOTIONQUERY.matches) {
      isReducedMotion = true;
      transitionDuration = config.reducedTransitionDuration;
    } else {
      isReducedMotion = false;
      transitionDuration = config.transitionDuration;
    }
  };

  // Check for any OS level changes to the preference
  MOTIONQUERY.addEventListener('change', reducedMotionCheck);

  /**
   * Init
   *
   */
  const init = userOptions => {
    // Merge user options into defaults
    config = mergeOptions(userOptions);

    // Check if an lightbox element is present
    const LIGHTBOX_TRIGGER_ELS = document.querySelectorAll(config.selector);
    if (!LIGHTBOX_TRIGGER_ELS.length) {
      return; // No elements for the lightbox available
    }

    reducedMotionCheck();

    // Check if the lightbox already exists
    if (!lightbox) {
      createLightbox();
    }
    if (config.gallerySelector !== null) {
      // Get a list of all `gallerySelector` elements within the document
      const GALLERY_ELS = document.querySelectorAll(config.gallerySelector);

      // Execute a few things once per element
      GALLERY_ELS.forEach((galleryEl, index) => {
        const GALLERY_INDEX = index;
        // Get a list of all `selector` elements within the `gallerySelector`
        const LIGHTBOX_TRIGGER_ELS = galleryEl.querySelectorAll(config.selector);

        // Execute a few things once per element
        LIGHTBOX_TRIGGER_ELS.forEach(lightboxTriggerEl => {
          lightboxTriggerEl.setAttribute('data-group', `parvus-gallery-${GALLERY_INDEX}`);
          add(lightboxTriggerEl);
        });
      });

      // Get a list of the rest of the `selector` elements within the document
      const LIGHTBOX_TRIGGER_ELS = document.querySelectorAll(`${config.selector}:not(.parvus-trigger)`);
      LIGHTBOX_TRIGGER_ELS.forEach(lightboxTriggerEl => {
        add(lightboxTriggerEl);
      });
    } else {
      // Get a list of all `selector` elements within the document
      const LIGHTBOX_TRIGGER_ELS = document.querySelectorAll(config.selector);

      // Execute a few things once per element
      LIGHTBOX_TRIGGER_ELS.forEach(lightboxTriggerEl => {
        add(lightboxTriggerEl);
      });
    }
  };

  /**
   * Get group from element
   *
   * @param {HTMLElement} el
   * @return {String}
   */
  const getGroup = el => {
    // Create a unique ID
    const GROUP_ID = Math.floor(Math.random() * 10000);
    if (!el.hasAttribute('data-group') || el.getAttribute('data-group') === '') {
      el.setAttribute('data-group', `default-${GROUP_ID}`);
    }
    return el.getAttribute('data-group');
  };

  /**
   * Copy an object. (The secure way)
   *
   * @param {Object} object
   * @return {Object}
   */
  const copyObject = object => {
    return JSON.parse(JSON.stringify(object));
  };

  /**
   * Add element
   *
   * @param {HTMLElement} el
   */
  const add = el => {
    if (!(el.tagName === 'A' && el.hasAttribute('href') && el.href.match(config.fileTypes)) && !(el.tagName === 'BUTTON' && el.hasAttribute('data-target') && el.getAttribute('data-target').match(config.fileTypes))) {
      throw new Error(el, `Use a link with the 'href' attribute or a button with the 'data-target' attribute. Both attributes must have a path to the image file. Supported image file types: ${config.fileTypes}.`);
    }
    newGroup = getGroup(el);
    if (!Object.prototype.hasOwnProperty.call(GROUPS, newGroup)) {
      GROUPS[newGroup] = copyObject(GROUP_ATTS);
    }

    // Check if element already exists
    if (!GROUPS[newGroup].gallery.includes(el)) {
      GROUPS[newGroup].gallery.push(el);
      if (el.querySelector('img') !== null) {
        const LIGHTBOX_INDICATOR_ICON = document.createElement('div');
        el.classList.add('parvus-zoom');
        LIGHTBOX_INDICATOR_ICON.className = 'parvus-zoom__indicator';
        LIGHTBOX_INDICATOR_ICON.innerHTML = config.lightboxIndicatorIcon;
        el.appendChild(LIGHTBOX_INDICATOR_ICON);
      }
      el.classList.add('parvus-trigger');

      // Bind click event handler
      el.addEventListener('click', triggerParvus);
      if (isOpen() && newGroup === activeGroup) {
        createSlide(GROUPS[newGroup].gallery.indexOf(el));
        createImage(el, GROUPS[newGroup].gallery.indexOf(el), () => {
          loadImage(GROUPS[newGroup].gallery.indexOf(el));
        });
        updateConfig();
        updateFocus();
        updateCounter();
      }
    } else {
      throw new Error('Ups, element already added.');
    }
  };

  /**
   * Remove element
   *
   * @param {HTMLElement} el
   */
  const remove = el => {
    if (isOpen() || !lightbox || !el || !el.hasAttribute('data-group')) {
      return;
    }
    const GROUP = getGroup(el);

    // Check if element exists
    if (!GROUPS[GROUP].gallery.includes(el)) {
      throw new Error('Ups, I can\'t find the element.');
    }

    // TODO: Remove elements dynamically

    GROUPS[GROUP].gallery.splice(GROUPS[GROUP].gallery.indexOf(el), 1);
    GROUPS[GROUP].sliderElements.splice(GROUPS[GROUP].gallery.indexOf(el), 1);

    // Remove lightbox indicator icon if necessary
    if (el.classList.contains('parvus-zoom')) {
      const LIGHTBOX_INDICATOR_ICON = el.querySelector('.parvus-zoom__indicator');
      el.classList.remove('parvus-zoom');
      el.removeChild(LIGHTBOX_INDICATOR_ICON);
    }
    if (isOpen() && GROUP === activeGroup) {
      updateConfig();
      updateFocus();
      updateCounter();
    }

    // Unbind click event handler
    el.removeEventListener('click', triggerParvus);
    el.classList.remove('parvus-trigger');
  };

  /**
   * Create the lightbox
   *
   */
  const createLightbox = () => {
    // Create the lightbox container
    lightbox = document.createElement('div');
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-hidden', 'true');
    lightbox.setAttribute('tabindex', '-1');
    lightbox.setAttribute('aria-label', config.l10n.lightboxLabel);
    lightbox.classList.add('parvus');

    // Create the lightbox overlay container
    lightboxOverlay = document.createElement('div');
    lightboxOverlay.classList.add('parvus__overlay');
    lightboxOverlay.style.opacity = 0;

    // Add lightbox overlay container to lightbox container
    lightbox.appendChild(lightboxOverlay);

    // Create the toolbar
    toolbar = document.createElement('div');
    toolbar.className = 'parvus__toolbar';
    toolbarLeft = document.createElement('div');
    toolbarRight = document.createElement('div');

    // Create the close button
    closeButton = document.createElement('button');
    closeButton.className = 'parvus__btn parvus__btn--close';
    closeButton.setAttribute('type', 'button');
    closeButton.setAttribute('aria-label', config.l10n.closeButtonLabel);
    closeButton.innerHTML = config.closeButtonIcon;

    // Add close button to right toolbar item
    toolbarRight.appendChild(closeButton);

    // Create the previous button
    previousButton = document.createElement('button');
    previousButton.className = 'parvus__btn parvus__btn--previous';
    previousButton.setAttribute('type', 'button');
    previousButton.setAttribute('aria-label', config.l10n.previousButtonLabel);
    previousButton.innerHTML = config.previousButtonIcon;

    // Add previous button to lightbox container
    lightbox.appendChild(previousButton);

    // Create the next button
    nextButton = document.createElement('button');
    nextButton.className = 'parvus__btn parvus__btn--next';
    nextButton.setAttribute('type', 'button');
    nextButton.setAttribute('aria-label', config.l10n.nextButtonLabel);
    nextButton.innerHTML = config.nextButtonIcon;

    // Add next button to lightbox container
    lightbox.appendChild(nextButton);

    // Create the counter
    counter = document.createElement('div');
    counter.className = 'parvus__counter';

    // Add counter to left toolbar item
    toolbarLeft.appendChild(counter);

    // Add toolbar items to toolbar
    toolbar.appendChild(toolbarLeft);
    toolbar.appendChild(toolbarRight);

    // Add toolbar to lightbox container
    lightbox.appendChild(toolbar);

    // Add lightbox container to body
    document.body.appendChild(lightbox);
  };

  /**
   * Create a slider
   *
   */
  const createSlider = () => {
    GROUPS[activeGroup].slider = document.createElement('div');
    GROUPS[activeGroup].slider.className = 'parvus__slider';

    // Hide slider
    GROUPS[activeGroup].slider.setAttribute('aria-hidden', 'true');
    lightbox.appendChild(GROUPS[activeGroup].slider);
  };

  /**
   * Create a slide
   *
   * @param {HTMLElement} el
   */
  const createSlide = index => {
    if (GROUPS[activeGroup].sliderElements[index] !== undefined) ; else {
      const SLIDER_ELEMENT = document.createElement('div');
      const SLIDER_ELEMENT_CONTENT = document.createElement('div');
      SLIDER_ELEMENT.className = 'parvus__slide';
      SLIDER_ELEMENT.style.position = 'absolute';
      SLIDER_ELEMENT.style.insetInlineStart = `${index * 100}%`;

      // Hide slide
      SLIDER_ELEMENT.setAttribute('aria-hidden', 'true');

      // Add slide content container to slider element
      SLIDER_ELEMENT.appendChild(SLIDER_ELEMENT_CONTENT);
      GROUPS[activeGroup].sliderElements[index] = SLIDER_ELEMENT;

      // Add slider element to slider
      if (index === currentIndex) {
        GROUPS[activeGroup].slider.appendChild(SLIDER_ELEMENT);
      }
      if (index > currentIndex) {
        GROUPS[activeGroup].sliderElements[currentIndex].after(SLIDER_ELEMENT);
      } else {
        GROUPS[activeGroup].sliderElements[currentIndex].before(SLIDER_ELEMENT);
      }
    }
  };

  /**
   * Open Parvus
   *
   * @param {HTMLElement} el
   */
  const open = el => {
    if (!lightbox || !el || !el.classList.contains('parvus-trigger') || isOpen()) {
      return;
    }
    activeGroup = getGroup(el);

    // Check if element exists
    if (!GROUPS[activeGroup].gallery.includes(el)) {
      throw new Error('Ups, I can\'t find the element.');
    }
    currentIndex = GROUPS[activeGroup].gallery.indexOf(el);

    // Save user’s focus
    lastFocus = document.activeElement;

    // Use `history.pushState()` to make sure the 'Back' button behavior
    // that aligns with the user's expectations
    const STATE_OBJ = {
      parvus: 'close'
    };
    const URL = window.location.href;
    history.pushState(STATE_OBJ, 'Image', URL);
    bindEvents();

    // Hide all non lightbox elements from assistive technology
    const nonLightboxEls = document.querySelectorAll('body > *:not([aria-hidden="true"])');
    nonLightboxEls.forEach(nonLightboxEl => {
      nonLightboxEl.setAttribute('aria-hidden', 'true');
      nonLightboxEl.classList.add('parvus-hidden');
    });
    lightbox.classList.add('parvus--is-opening');

    // Show lightbox
    lightbox.setAttribute('aria-hidden', 'false');
    createSlider();
    createSlide(currentIndex);

    // Show slider
    GROUPS[activeGroup].slider.setAttribute('aria-hidden', 'false');
    updateOffset();
    updateConfig();
    updateCounter();
    setFocusToFirstItem();
    loadSlide(currentIndex);
    createImage(el, currentIndex, () => {
      loadImage(currentIndex);
      requestAnimationFrame(() => {
        lightbox.classList.remove('parvus--is-opening');
        lightboxOverlay.style.opacity = 1;
        lightboxOverlay.style.transition = `opacity ${transitionDuration}ms ${config.transitionTimingFunction}`;
        lightboxOverlay.style.willChange = 'opacity';
      });
      lightboxOverlay.addEventListener('transitionend', () => {
        // Preload previous and next slide
        preload(currentIndex + 1);
        preload(currentIndex - 1);
      });

      // Add class for slider animation
      GROUPS[activeGroup].slider.classList.add('parvus__slider--animate');
    });

    // Create and dispatch a new event
    const OPEN_EVENT = new CustomEvent('open', {
      detail: {
        source: el
      }
    });
    lightbox.dispatchEvent(OPEN_EVENT);
    document.body.classList.add('parvus-is-open');
  };

  /**
   * Close Parvus
   *
   */
  const close = () => {
    if (!isOpen()) {
      throw new Error('Ups, I\'m already closed.');
    }
    const IMAGE = GROUPS[activeGroup].images[currentIndex];
    const IMAGE_SIZE = IMAGE.getBoundingClientRect();
    const THUMBNAIL = config.backFocus ? GROUPS[activeGroup].gallery[currentIndex] : lastFocus;
    const THUMBNAIL_SIZE = THUMBNAIL.getBoundingClientRect();
    unbindEvents();
    clearDrag();

    // Remove entry in browser history
    if (history.state !== null) {
      if (history.state.parvus === 'close') {
        history.back();
      }
    }

    // Show all non lightbox elements from assistive technology
    const nonLightboxEls = document.querySelectorAll('.parvus-hidden');
    nonLightboxEls.forEach(nonLightboxEl => {
      nonLightboxEl.removeAttribute('aria-hidden');
      nonLightboxEl.classList.remove('parvus-hidden');
    });
    lightbox.classList.add('parvus--is-closing');
    requestAnimationFrame(() => {
      widthDifference = THUMBNAIL_SIZE.width / IMAGE_SIZE.width;
      heightDifference = THUMBNAIL_SIZE.height / IMAGE_SIZE.height;
      xDifference = THUMBNAIL_SIZE.left - IMAGE_SIZE.left;
      yDifference = THUMBNAIL_SIZE.top - IMAGE_SIZE.top;
      IMAGE.style.transform = `translate(${xDifference}px, ${yDifference}px) scale(${widthDifference}, ${heightDifference})`;
      IMAGE.style.opacity = 0;
      IMAGE.style.transition = `transform ${transitionDuration}ms ${config.transitionTimingFunction}, opacity ${transitionDuration}ms ${config.transitionTimingFunction} ${transitionDuration / 2}ms`;
      lightboxOverlay.style.opacity = 0;
      lightboxOverlay.style.transition = `opacity ${transitionDuration}ms ${config.transitionTimingFunction}`;
      lightboxOverlay.style.willChange = 'auto';
    });
    lightboxOverlay.addEventListener('transitionend', () => {
      // Don't forget to cleanup our current element
      leaveSlide(currentIndex);

      // Reenable the user’s focus
      lastFocus = config.backFocus ? GROUPS[activeGroup].gallery[currentIndex] : lastFocus;
      lastFocus.focus({
        preventScroll: true
      });

      // Hide lightbox
      lightbox.setAttribute('aria-hidden', 'true');
      lightbox.classList.remove('parvus--is-closing');
      lightbox.classList.remove('parvus--is-vertical-closing');
      IMAGE.style.transform = '';

      // Reset GROUPS
      GROUPS[activeGroup].slider.remove();
      GROUPS[activeGroup].slider = null;
      GROUPS[activeGroup].sliderElements = [];
      GROUPS[activeGroup].images = [];
    }, {
      once: true
    });

    // Create and dispatch a new event
    const CLOSE_EVENT = new CustomEvent('close', {
      detail: {
        source: GROUPS[activeGroup].gallery[currentIndex]
      }
    });
    lightbox.dispatchEvent(CLOSE_EVENT);
    document.body.classList.remove('parvus-is-open');
  };

  /**
   * Preload slide
   *
   * @param {Number} index
   */
  const preload = index => {
    if (GROUPS[activeGroup].gallery[index] === undefined) {
      return;
    }
    createSlide(index);
    createImage(GROUPS[activeGroup].gallery[index], index, () => {
      loadImage(index);
    });
  };

  /**
   * Load slide
   *
   * @param {Number} index
   */
  const loadSlide = index => {
    GROUPS[activeGroup].sliderElements[index].classList.add('parvus__slide--is-active');
    GROUPS[activeGroup].sliderElements[index].setAttribute('aria-hidden', 'false');
  };

  /**
   * Create Image
   *
   * @param {HTMLElement} el
   * @param {Number} index
   * @param {Function} callback
   */
  const createImage = (el, index, callback) => {
    if (GROUPS[activeGroup].images[index] !== undefined) ; else {
      const container = GROUPS[activeGroup].sliderElements[index].querySelector('div');
      const IMAGE = document.createElement('img');
      const IMAGE_CONTAINER = document.createElement('div');
      const CAPTION_CONTAINER = document.createElement('div');
      const THUMBNAIL = el.querySelector('img');
      const LOADING_INDICATOR = document.createElement('div');
      IMAGE_CONTAINER.className = 'parvus__content';
      CAPTION_CONTAINER.className = 'parvus__caption';

      // Create loading indicator
      LOADING_INDICATOR.className = 'parvus__loader';
      LOADING_INDICATOR.setAttribute('role', 'progressbar');
      LOADING_INDICATOR.setAttribute('aria-label', config.l10n.lightboxLoadingIndicatorLabel);

      // Add loading indicator to container
      container.appendChild(LOADING_INDICATOR);
      IMAGE.onload = () => {
        container.removeChild(LOADING_INDICATOR);

        // Set image width and height
        IMAGE.setAttribute('width', IMAGE.naturalWidth);
        IMAGE.setAttribute('height', IMAGE.naturalHeight);
        setImageDimension(GROUPS[activeGroup].sliderElements[index], IMAGE);
        if (callback && typeof callback === 'function') {
          callback();
        }
      };
      if (el.tagName === 'A') {
        IMAGE.setAttribute('src', el.href);
        if (THUMBNAIL) {
          IMAGE.alt = THUMBNAIL.alt || '';
        } else {
          IMAGE.alt = el.getAttribute('data-alt') || '';
        }
      } else {
        IMAGE.alt = el.getAttribute('data-alt') || '';
        IMAGE.setAttribute('src', el.getAttribute('data-target'));
      }

      // Add srcset if available
      if (el.hasAttribute('data-srcset') && el.getAttribute('data-srcset') !== '') {
        IMAGE.setAttribute('srcset', el.getAttribute('data-srcset'));
      }
      IMAGE.style.opacity = 0;
      IMAGE_CONTAINER.appendChild(IMAGE);
      GROUPS[activeGroup].images[index] = IMAGE;
      container.appendChild(IMAGE_CONTAINER);

      // Add caption if available
      if (config.captions) {
        let captionData = null;
        if (config.captionsSelector === 'self') {
          if (el.hasAttribute(config.captionsAttribute) && el.getAttribute(config.captionsAttribute) !== '') {
            captionData = el.getAttribute(config.captionsAttribute);
          }
        } else {
          if (el.querySelector(config.captionsSelector) !== null) {
            const CAPTION_SELECTOR = el.querySelector(config.captionsSelector);
            if (CAPTION_SELECTOR.hasAttribute(config.captionsAttribute) && CAPTION_SELECTOR.getAttribute(config.captionsAttribute) !== '') {
              captionData = CAPTION_SELECTOR.getAttribute(config.captionsAttribute);
            } else {
              captionData = CAPTION_SELECTOR.innerHTML;
            }
          }
        }
        if (captionData !== null) {
          GROUPS[activeGroup].sliderElements[index].setAttribute('aria-labelledby', `parvus__caption-${index}`);
          CAPTION_CONTAINER.id = `parvus__caption-${index}`;
          CAPTION_CONTAINER.innerHTML = `<p>${captionData}</p>`;
          container.appendChild(CAPTION_CONTAINER);
        }
      }
    }
  };

  /**
   * Load Image
   *
   * @param {Number} index
   */
  const loadImage = index => {
    const IMAGE = GROUPS[activeGroup].images[index];
    const IMAGE_SIZE = IMAGE.getBoundingClientRect();
    const THUMBNAIL = GROUPS[activeGroup].gallery[index];
    const THUMBNAIL_SIZE = THUMBNAIL.getBoundingClientRect();
    if (lightbox.classList.contains('parvus--is-opening')) {
      widthDifference = THUMBNAIL_SIZE.width / IMAGE_SIZE.width;
      heightDifference = THUMBNAIL_SIZE.height / IMAGE_SIZE.height;
      xDifference = THUMBNAIL_SIZE.left - IMAGE_SIZE.left;
      yDifference = THUMBNAIL_SIZE.top - IMAGE_SIZE.top;
      requestAnimationFrame(() => {
        IMAGE.style.transform = `translate(${xDifference}px, ${yDifference}px) scale(${widthDifference}, ${heightDifference})`;
        IMAGE.style.transition = 'transform 0s, opacity 0s';

        // Animate the difference reversal on the next tick
        requestAnimationFrame(() => {
          IMAGE.style.transform = '';
          IMAGE.style.opacity = 1;
          IMAGE.style.transition = `transform ${transitionDuration}ms ${config.transitionTimingFunction}, opacity ${transitionDuration / 2}ms ${config.transitionTimingFunction}`;
        });
      });
    } else {
      IMAGE.style.opacity = 1;
    }
  };

  /**
   * Select a slide
   *
   * @param {Number} index
   */
  const select = index => {
    const OLD_INDEX = currentIndex;
    if (!isOpen()) {
      throw new Error('Ups, I\'m closed.');
    } else {
      if (!index && index !== 0) {
        throw new Error('Ups, no slide specified.');
      }
      if (index === currentIndex) {
        throw new Error(`Ups, slide ${index} is already selected.`);
      }
      if (index === -1 || index >= GROUPS[activeGroup].gallery.length) {
        throw new Error(`Ups, I can't find slide ${index}.`);
      }
    }
    leaveSlide(OLD_INDEX);
    loadSlide(index);
    loadImage(index);
    if (index < OLD_INDEX) {
      currentIndex--;
      updateOffset();
      updateConfig();
      updateFocus('left');
      preload(index - 1);
    }
    if (index > OLD_INDEX) {
      currentIndex++;
      updateOffset();
      updateConfig();
      updateFocus('right');
      preload(index + 1);
    }
    updateCounter();

    // Create and dispatch a new event
    const SELECT_EVENT = new CustomEvent('select', {
      detail: {
        source: GROUPS[activeGroup].gallery[currentIndex]
      }
    });
    lightbox.dispatchEvent(SELECT_EVENT);
  };

  /**
   * Select the previous slide
   *
   */
  const previous = () => {
    if (currentIndex > 0) {
      select(currentIndex - 1);
    }
  };

  /**
   * Select the next slide
   *
   */
  const next = () => {
    if (currentIndex < GROUPS[activeGroup].gallery.length - 1) {
      select(currentIndex + 1);
    }
  };

  /**
   * Leave slide
   * Will be called before moving index
   *
   * @param {Number} index
   */
  const leaveSlide = index => {
    GROUPS[activeGroup].sliderElements[index].classList.remove('parvus__slide--is-active');
    GROUPS[activeGroup].sliderElements[index].setAttribute('aria-hidden', 'true');
  };

  /**
   * Update offset
   *
   */
  const updateOffset = () => {
    activeGroup = activeGroup !== null ? activeGroup : newGroup;
    offset = currentIndex * lightbox.offsetWidth * -1;
    GROUPS[activeGroup].slider.style.transform = `translate3d(${offset}px, 0, 0)`;
    offsetTmp = offset;
  };

  /**
   * Update focus
   *
   * @param {String} dir
   */
  const updateFocus = dir => {
    if (GROUPS[activeGroup].gallery.length === 1) {
      closeButton.focus();
    } else {
      // If the first slide is displayed
      if (currentIndex === 0) {
        nextButton.focus();
        // If the last slide is displayed
      } else if (currentIndex === GROUPS[activeGroup].gallery.length - 1) {
        previousButton.focus();
      } else {
        if (dir === 'left') {
          previousButton.focus();
        } else {
          nextButton.focus();
        }
      }
    }
  };

  /**
   * Update counter
   *
   */
  const updateCounter = () => {
    counter.textContent = `${currentIndex + 1}/${GROUPS[activeGroup].gallery.length}`;
  };

  /**
   * Clear drag after touchend event
   *
   */
  const clearDrag = () => {
    drag = {
      startX: 0,
      endX: 0,
      startY: 0,
      endY: 0
    };
  };

  /**
   * Recalculate drag / swipe event
   *
   */
  const updateAfterDrag = () => {
    const MOVEMENT_X = drag.endX - drag.startX;
    const MOVEMENT_Y = drag.endY - drag.startY;
    const MOVEMENT_X_DISTANCE = Math.abs(MOVEMENT_X);
    const MOVEMENT_Y_DISTANCE = Math.abs(MOVEMENT_Y);
    if (isDraggingX && MOVEMENT_X > 2) {
      if (MOVEMENT_X_DISTANCE >= config.threshold && currentIndex > 0) {
        previous();
      } else {
        updateOffset();
      }
    } else if (isDraggingX && MOVEMENT_X < 2) {
      if (MOVEMENT_X_DISTANCE >= config.threshold && currentIndex !== GROUPS[activeGroup].gallery.length - 1) {
        next();
      } else {
        updateOffset();
      }
    } else if (isDraggingY && MOVEMENT_Y_DISTANCE > 2 && config.swipeClose) {
      if (MOVEMENT_Y_DISTANCE >= config.threshold) {
        close();
      } else {
        lightboxOverlay.style.opacity = 1;
        lightbox.classList.remove('parvus--is-vertical-closing');
        updateOffset();
      }
    }
  };

  /**
   * Update Config
   *
   */
  const updateConfig = () => {
    if ((config.simulateTouch || isTouchDevice()) && config.swipeClose && !GROUPS[activeGroup].slider.classList.contains('parvus__slider--is-draggable') || (config.simulateTouch || isTouchDevice()) && GROUPS[activeGroup].gallery.length > 1 && !GROUPS[activeGroup].slider.classList.contains('parvus__slider--is-draggable')) {
      GROUPS[activeGroup].slider.classList.add('parvus__slider--is-draggable');
    }

    // Hide buttons if necessary
    if (GROUPS[activeGroup].gallery.length === 1) {
      previousButton.setAttribute('aria-hidden', 'true');
      previousButton.disabled = true;
      nextButton.setAttribute('aria-hidden', 'true');
      nextButton.disabled = true;
    } else {
      // If the first slide is displayed
      if (currentIndex === 0) {
        previousButton.setAttribute('aria-hidden', 'true');
        previousButton.disabled = true;
        nextButton.setAttribute('aria-hidden', 'false');
        nextButton.disabled = false;
        // If the last slide is displayed
      } else if (currentIndex === GROUPS[activeGroup].gallery.length - 1) {
        previousButton.setAttribute('aria-hidden', 'false');
        previousButton.disabled = false;
        nextButton.setAttribute('aria-hidden', 'true');
        nextButton.disabled = true;
      } else {
        previousButton.setAttribute('aria-hidden', 'false');
        previousButton.disabled = false;
        nextButton.setAttribute('aria-hidden', 'false');
        nextButton.disabled = false;
      }
    }

    // Hide counter if necessary
    if (GROUPS[activeGroup].gallery.length === 1) {
      counter.setAttribute('aria-hidden', 'true');
    } else {
      counter.setAttribute('aria-hidden', 'false');
    }
  };

  /**
   * Resize event
   *
   */
  const resizeHandler = () => {
    if (!resizeTicking) {
      resizeTicking = true;
      BROWSER_WINDOW.requestAnimationFrame(() => {
        GROUPS[activeGroup].sliderElements.forEach((slide, index) => {
          setImageDimension(slide, GROUPS[activeGroup].images[index]);
        });
        updateOffset();
        resizeTicking = false;
      });
    }
  };

  /**
   * Set image with
   *
   * @param {HTMLElement} slideEl
   * @param {HTMLElement} imageEl
   */
  const setImageDimension = (slideEl, imageEl) => {
    const computedStyle = getComputedStyle(slideEl);
    const captionRec = slideEl.querySelector('.parvus__caption') !== null ? slideEl.querySelector('.parvus__caption').getBoundingClientRect().height : 0;
    const srcHeight = imageEl.getAttribute('height');
    const srcWidth = imageEl.getAttribute('width');
    let maxHeight = slideEl.getBoundingClientRect().height;
    let maxWidth = slideEl.getBoundingClientRect().width;
    maxHeight -= parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom) + parseFloat(captionRec);
    maxWidth -= parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight);
    const ratio = Math.min(maxWidth / srcWidth || 0, maxHeight / srcHeight);
    const newWidth = srcWidth * ratio || 0;
    const newHeight = srcHeight * ratio || 0;
    if (srcHeight > newHeight && srcHeight < maxHeight && srcWidth > newWidth && srcWidth < maxWidth || srcHeight < newHeight && srcHeight < maxHeight && srcWidth < newWidth && srcWidth < maxWidth) {
      imageEl.style.width = '';
      imageEl.style.height = '';
    } else {
      imageEl.style.width = `${newWidth}px`;
      imageEl.style.height = `${newHeight}px`;
    }
  };

  /**
   * Click event handler to trigger Parvus
   *
   */
  const triggerParvus = function triggerParvus(event) {
    event.preventDefault();
    open(this);
  };

  /**
   * Click event handler
   *
   */
  const clickHandler = event => {
    if (event.target === previousButton) {
      previous();
    } else if (event.target === nextButton) {
      next();
    } else if (event.target === closeButton || !isDraggingY && !isDraggingX && event.target.classList.contains('parvus__slide') && config.docClose) {
      close();
    }
    event.stopPropagation();
  };

  /**
   * Get the focusable children of the given element
   *
   * @return {Array<Element>}
   */
  const getFocusableChildren = () => {
    return Array.prototype.slice.call(lightbox.querySelectorAll(`${FOCUSABLE_ELEMENTS.join(', ')}`)).filter(child => {
      return !!(child.offsetWidth || child.offsetHeight || child.getClientRects().length);
    });
  };

  /**
   * Set focus to first item
   *
   */
  const setFocusToFirstItem = () => {
    const FOCUSABLE_CHILDREN = getFocusableChildren();
    FOCUSABLE_CHILDREN[0].focus();
  };

  /**
   * Keydown event handler
   *
   */
  const keydownHandler = event => {
    const FOCUSABLE_CHILDREN = getFocusableChildren();
    const FOCUSED_ITEM_INDEX = FOCUSABLE_CHILDREN.indexOf(document.activeElement);
    if (event.code === 'Tab') {
      // If the SHIFT key is being pressed while tabbing (moving backwards) and
      // the currently focused item is the first one, move the focus to the last
      // focusable item
      if (event.shiftKey && FOCUSED_ITEM_INDEX === 0) {
        FOCUSABLE_CHILDREN[FOCUSABLE_CHILDREN.length - 1].focus();
        event.preventDefault();
        // If the SHIFT key is not being pressed (moving forwards) and the currently
        // focused item is the last one, move the focus to the first focusable item
      } else if (!event.shiftKey && FOCUSED_ITEM_INDEX === FOCUSABLE_CHILDREN.length - 1) {
        FOCUSABLE_CHILDREN[0].focus();
        event.preventDefault();
      }
    } else if (event.code === 'Escape') {
      // `ESC` Key: Close Parvus
      event.preventDefault();
      close();
    } else if (event.code === 'ArrowLeft') {
      // `PREV` Key: Show the previous slide
      event.preventDefault();
      previous();
    } else if (event.code === 'ArrowRight') {
      // `NEXT` Key: Show the next slide
      event.preventDefault();
      next();
    }
  };

  /**
   * Wheel event handler
   *
   */
  const wheelHandler = () => {
    close();
  };

  /**
   * Mousedown event handler
   *
   */
  const mousedownHandler = event => {
    event.preventDefault();
    event.stopPropagation();
    isDraggingX = false;
    isDraggingY = false;
    pointerDown = true;
    drag.startX = event.pageX;
    drag.startY = event.pageY;
    GROUPS[activeGroup].slider.classList.add('parvus__slider--is-dragging');
    GROUPS[activeGroup].slider.style.willChange = 'transform';
  };

  /**
   * Mousemove event handler
   *
   */
  const mousemoveHandler = event => {
    event.preventDefault();
    if (pointerDown) {
      drag.endX = event.pageX;
      drag.endY = event.pageY;
      doSwipe();
    }
  };

  /**
   * Mouseup event handler
   *
   */
  const mouseupHandler = event => {
    event.stopPropagation();
    pointerDown = false;
    GROUPS[activeGroup].slider.classList.remove('parvus__slider--is-dragging');
    GROUPS[activeGroup].slider.style.willChange = 'auto';
    if (drag.endX || drag.endY) {
      updateAfterDrag();
    }
    clearDrag();
  };

  /**
   * Touchstart event handler
   *
   */
  const touchstartHandler = event => {
    event.stopPropagation();
    isDraggingX = false;
    isDraggingY = false;
    pointerDown = true;
    drag.startX = event.touches[0].pageX;
    drag.startY = event.touches[0].pageY;
    GROUPS[activeGroup].slider.classList.add('parvus__slider--is-dragging');
    GROUPS[activeGroup].slider.style.willChange = 'transform';
  };

  /**
   * Touchmove event handler
   *
   */
  const touchmoveHandler = event => {
    event.stopPropagation();
    if (pointerDown) {
      event.preventDefault();
      drag.endX = event.touches[0].pageX;
      drag.endY = event.touches[0].pageY;
      doSwipe();
    }
  };

  /**
   * Touchend event handler
   *
   */
  const touchendHandler = event => {
    event.stopPropagation();
    pointerDown = false;
    GROUPS[activeGroup].slider.classList.remove('parvus__slider--is-dragging');
    GROUPS[activeGroup].slider.style.willChange = 'auto';
    if (drag.endX || drag.endY) {
      updateAfterDrag();
    }
    clearDrag();
  };

  /**
   * Decide whether to do horizontal of vertical swipe
   *
   */
  const doSwipe = () => {
    const MOVEMENT_X = drag.startX - drag.endX;
    const MOVEMENT_Y = drag.endY - drag.startY;
    const MOVEMENT_Y_DISTANCE = Math.abs(MOVEMENT_Y);
    if (Math.abs(MOVEMENT_X) > 2 && !isDraggingY && GROUPS[activeGroup].gallery.length > 1) {
      // Horizontal swipe
      GROUPS[activeGroup].slider.style.transform = `translate3d(${offsetTmp - Math.round(MOVEMENT_X)}px, 0, 0)`;
      isDraggingX = true;
      isDraggingY = false;
    } else if (Math.abs(MOVEMENT_Y) > 2 && !isDraggingX && config.swipeClose) {
      // Vertical swipe
      if (MOVEMENT_Y_DISTANCE <= 96 && !isReducedMotion) {
        // Set to 96 because otherwise event listener 'transitionend' does not fire if is vertical dragging
        lightboxOverlayOpacity = 1 - MOVEMENT_Y_DISTANCE / 100;
      }
      lightbox.classList.add('parvus--is-vertical-closing');
      lightboxOverlay.style.opacity = lightboxOverlayOpacity;
      GROUPS[activeGroup].slider.style.transform = `translate3d(${offsetTmp}px, ${Math.round(MOVEMENT_Y)}px, 0)`;
      isDraggingX = false;
      isDraggingY = true;
    }
  };

  /**
   * Bind events
   *
   */
  const bindEvents = () => {
    BROWSER_WINDOW.addEventListener('keydown', keydownHandler);
    BROWSER_WINDOW.addEventListener('resize', resizeHandler);
    if (config.scrollClose) {
      BROWSER_WINDOW.addEventListener('wheel', wheelHandler);
    }

    // Popstate event
    BROWSER_WINDOW.addEventListener('popstate', close);

    // Click event
    lightbox.addEventListener('click', clickHandler);
    if (isTouchDevice()) {
      // Touch events
      lightbox.addEventListener('touchstart', touchstartHandler);
      lightbox.addEventListener('touchmove', touchmoveHandler);
      lightbox.addEventListener('touchend', touchendHandler);
    }

    // Mouse events
    if (config.simulateTouch) {
      lightbox.addEventListener('mousedown', mousedownHandler);
      lightbox.addEventListener('mouseup', mouseupHandler);
      lightbox.addEventListener('mousemove', mousemoveHandler);
    }
  };

  /**
   * Unbind events
   *
   */
  const unbindEvents = () => {
    BROWSER_WINDOW.removeEventListener('keydown', keydownHandler);
    BROWSER_WINDOW.removeEventListener('resize', resizeHandler);
    if (config.scrollClose) {
      BROWSER_WINDOW.removeEventListener('wheel', wheelHandler);
    }

    // Popstate event
    BROWSER_WINDOW.removeEventListener('popstate', close);

    // Click event
    lightbox.removeEventListener('click', clickHandler);
    if (isTouchDevice()) {
      // Touch events
      lightbox.removeEventListener('touchstart', touchstartHandler);
      lightbox.removeEventListener('touchmove', touchmoveHandler);
      lightbox.removeEventListener('touchend', touchendHandler);
    }

    // Mouse events
    if (config.simulateTouch) {
      lightbox.removeEventListener('mousedown', mousedownHandler);
      lightbox.removeEventListener('mouseup', mouseupHandler);
      lightbox.removeEventListener('mousemove', mousemoveHandler);
    }
  };

  /**
   * Destroy Parvus
   *
   */
  const destroy = () => {
    if (!lightbox) {
      return;
    }
    if (isOpen()) {
      close();
    }
    lightbox.remove();
    const LIGHTBOX_TRIGGER_ELS = document.querySelectorAll('.parvus-trigger');
    LIGHTBOX_TRIGGER_ELS.forEach(lightboxTriggerEl => {
      remove(lightboxTriggerEl);
    });

    // Create and dispatch a new event
    const DESTROY_EVENT = new CustomEvent('destroy');
    lightbox.dispatchEvent(DESTROY_EVENT);
  };

  /**
   * Check if Parvus is open
   *
   */
  const isOpen = () => {
    return lightbox.getAttribute('aria-hidden') === 'false';
  };

  /**
   * Detect whether device is touch capable
   *
   */
  const isTouchDevice = () => {
    return 'ontouchstart' in window;
  };

  /**
   * Return current index
   *
   */
  const getCurrentIndex = () => {
    return currentIndex;
  };

  /**
   * Bind event
   *
   * @param {String} eventName
   * @param {Function} callback
   */
  const on = (eventName, callback) => {
    if (lightbox) {
      lightbox.addEventListener(eventName, callback);
    }
  };

  /**
   * Unbind event
   *
   * @param {String} eventName
   * @param {Function} callback
   */
  const off = (eventName, callback) => {
    if (lightbox) {
      lightbox.removeEventListener(eventName, callback);
    }
  };
  init(userOptions);
  Parvus.init = init;
  Parvus.open = open;
  Parvus.close = close;
  Parvus.select = select;
  Parvus.previous = previous;
  Parvus.next = next;
  Parvus.currentIndex = getCurrentIndex;
  Parvus.add = add;
  Parvus.remove = remove;
  Parvus.destroy = destroy;
  Parvus.isOpen = isOpen;
  Parvus.on = on;
  Parvus.off = off;
  return Parvus;
}

export { Parvus as default };
