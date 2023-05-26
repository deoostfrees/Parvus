/**
 * Parvus
 *
 * @author Benjamin de Oostfrees
 * @version 2.3.0
 * @url https://github.com/deoostfrees/parvus
 *
 * MIT license
 */

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

// Default language
function Parvus(userOptions) {
  /**
   * Global variables
   *
   */
  const BROWSER_WINDOW = window;
  const FOCUSABLE_ELEMENTS = ['a:not([inert]):not([tabindex^="-"])', 'button:not([inert]):not([tabindex^="-"]):not(:disabled)', '[tabindex]:not([inert]):not([tabindex^="-"])'];
  const GROUP_ATTS = {
    triggerElements: [],
    slider: null,
    sliderElements: [],
    contentElements: []
  };
  const GROUPS = {};
  let groupIdCounter = 0;
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
  let controls = null;
  let previousButton = null;
  let nextButton = null;
  let closeButton = null;
  let counter = null;
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
      swipeClose: true,
      simulateTouch: true,
      threshold: 50,
      backFocus: true,
      transitionDuration: 300,
      transitionTimingFunction: 'cubic-bezier(0.62, 0.16, 0.13, 1.01)',
      lightboxIndicatorIcon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>',
      previousButtonIcon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path stroke="none" d="M0 0h24v24H0z"/><polyline points="15 6 9 12 15 18" /></svg>',
      nextButtonIcon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path stroke="none" d="M0 0h24v24H0z"/><polyline points="9 6 15 12 9 18" /></svg>',
      closeButtonIcon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 6L6 18M6 6l12 12"/></svg>',
      l10n: en
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
      transitionDuration = 0.1;
    } else {
      isReducedMotion = false;
      transitionDuration = config.transitionDuration;
    }
  };

  // Check for any OS level changes to the preference
  MOTIONQUERY.addEventListener('change', reducedMotionCheck);

  /**
   * Get group from element
   *
   * @param {HTMLElement} triggerEl
   * @return {String}
   */
  const getGroup = triggerEl => {
    // Check if the data attribute "group" exists or set an alternative value
    const EL_GROUP = triggerEl.dataset.group || `default-${groupIdCounter}`;
    ++groupIdCounter;

    // Set the "group" data attribute if it doesn't exist
    if (!triggerEl.hasAttribute('data-group')) {
      triggerEl.setAttribute('data-group', EL_GROUP);
    }
    return EL_GROUP;
  };

  /**
   * Add zoom indicator to element
   *
   * @param {HTMLElement} triggerEl
   */
  const addZoomIndicator = triggerEl => {
    if (triggerEl.querySelector('img')) {
      const LIGHTBOX_INDICATOR_ICON = document.createElement('div');
      triggerEl.classList.add('parvus-zoom');
      LIGHTBOX_INDICATOR_ICON.className = 'parvus-zoom__indicator';
      LIGHTBOX_INDICATOR_ICON.innerHTML = config.lightboxIndicatorIcon;
      triggerEl.appendChild(LIGHTBOX_INDICATOR_ICON);
    }
  };

  /**
   * Add element
   *
   * @param {HTMLElement} triggerEl
   */
  const add = triggerEl => {
    if (!(triggerEl.tagName === 'A' && triggerEl.hasAttribute('href') || triggerEl.tagName === 'BUTTON' && triggerEl.hasAttribute('data-target'))) {
      throw new Error('Use a link with the \'href\' attribute or a button with the \'data-target\' attribute. Both attributes must have a path to the image file.');
    }
    newGroup = getGroup(triggerEl);
    if (!GROUPS[newGroup]) {
      GROUPS[newGroup] = structuredClone(GROUP_ATTS);
    }
    if (GROUPS[newGroup].triggerElements.includes(triggerEl)) {
      throw new Error('Ups, element already added.');
    }
    GROUPS[newGroup].triggerElements.push(triggerEl);
    addZoomIndicator(triggerEl);
    triggerEl.classList.add('parvus-trigger');
    triggerEl.addEventListener('click', triggerParvus);
    if (isOpen() && newGroup === activeGroup) {
      const index = GROUPS[newGroup].triggerElements.indexOf(triggerEl);
      createSlide(index);
      createImage(triggerEl, index, () => {
        loadImage(index);
      });
      updateConfig();
      updateFocus();
      updateCounter();
    }
  };

  /**
   * Remove element
   *
   * @param {HTMLElement} triggerEl
   */
  const remove = triggerEl => {
    if (!triggerEl || !triggerEl.hasAttribute('data-group')) {
      return;
    }
    const GROUP = getGroup(triggerEl);

    // Check if element exists
    if (!GROUPS[GROUP] || !GROUPS[GROUP].triggerElements.indexOf(triggerEl)) {
      return;
    }
    const TRIGGER_EL_INDEX = GROUPS[GROUP].triggerElements.indexOf(triggerEl);
    GROUPS[GROUP].triggerElements.splice(TRIGGER_EL_INDEX, 1);
    GROUPS[GROUP].sliderElements.splice(TRIGGER_EL_INDEX, 1);

    // Remove lightbox indicator icon if necessary
    if (triggerEl.classList.contains('parvus-zoom')) {
      const LIGHTBOX_INDICATOR_ICON = triggerEl.querySelector('.parvus-zoom__indicator');
      triggerEl.classList.remove('parvus-zoom');
      triggerEl.removeChild(LIGHTBOX_INDICATOR_ICON);
    }
    if (isOpen() && GROUP === activeGroup) {
      updateConfig();
      updateFocus();
      updateCounter();
    }

    // Unbind click event handler
    triggerEl.removeEventListener('click', triggerParvus);
    triggerEl.classList.remove('parvus-trigger');
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

    // Add lightbox overlay container to lightbox container
    lightbox.appendChild(lightboxOverlay);

    // Create the toolbar
    toolbar = document.createElement('div');
    toolbar.className = 'parvus__toolbar';
    toolbarLeft = document.createElement('div');
    toolbarRight = document.createElement('div');

    // Create the controls
    controls = document.createElement('div');
    controls.className = 'parvus__controls';
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', config.l10n.controlsLabel);

    // Add controls to right toolbar item
    toolbarRight.appendChild(controls);

    // Create the close button
    closeButton = document.createElement('button');
    closeButton.className = 'parvus__btn parvus__btn--close';
    closeButton.setAttribute('type', 'button');
    closeButton.setAttribute('aria-label', config.l10n.closeButtonLabel);
    closeButton.innerHTML = config.closeButtonIcon;

    // Add close button to the controls
    controls.appendChild(closeButton);

    // Create the previous button
    previousButton = document.createElement('button');
    previousButton.className = 'parvus__btn parvus__btn--previous';
    previousButton.setAttribute('type', 'button');
    previousButton.setAttribute('aria-label', config.l10n.previousButtonLabel);
    previousButton.innerHTML = config.previousButtonIcon;

    // Add previous button to the controls
    controls.appendChild(previousButton);

    // Create the next button
    nextButton = document.createElement('button');
    nextButton.className = 'parvus__btn parvus__btn--next';
    nextButton.setAttribute('type', 'button');
    nextButton.setAttribute('aria-label', config.l10n.nextButtonLabel);
    nextButton.innerHTML = config.nextButtonIcon;

    // Add next button to the controls
    controls.appendChild(nextButton);

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

    // Add extra output for screen reader if there is more than one slide
    if (GROUPS[activeGroup].triggerElements.length > 1) {
      GROUPS[activeGroup].slider.setAttribute('role', 'region');
      GROUPS[activeGroup].slider.setAttribute('aria-roledescription', 'carousel');
      GROUPS[activeGroup].slider.setAttribute('aria-label', config.l10n.sliderLabel);
    }

    // Hide slider
    GROUPS[activeGroup].slider.setAttribute('aria-hidden', 'true');
    lightbox.appendChild(GROUPS[activeGroup].slider);
  };

  /**
   * Get next slide index
   *
   * @param {Number} index
   */
  const getNextSlideIndex = currentIndex => {
    const SLIDE_ELEMENTS = GROUPS[activeGroup].sliderElements;
    const TOTAL_SLIDES = SLIDE_ELEMENTS.length;
    for (let i = currentIndex + 1; i < TOTAL_SLIDES; i++) {
      if (SLIDE_ELEMENTS[i] !== undefined) {
        return i;
      }
    }
    return -1;
  };

  /**
   * Get next slide index
   *
   * @param {Number} index
   */
  const getPreviousSlideIndex = currentIndex => {
    const SLIDE_ELEMENTS = GROUPS[activeGroup].sliderElements;
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
   * @param {HTMLElement} el
   */
  const createSlide = index => {
    if (GROUPS[activeGroup].sliderElements[index] !== undefined) {
      return;
    }
    const SLIDER_ELEMENT = document.createElement('div');
    const SLIDER_ELEMENT_CONTENT = document.createElement('div');
    SLIDER_ELEMENT.className = 'parvus__slide';
    SLIDER_ELEMENT.style.position = 'absolute';
    SLIDER_ELEMENT.style.left = `${index * 100}%`;
    if (GROUPS[activeGroup].triggerElements.length > 1) {
      SLIDER_ELEMENT.setAttribute('role', 'group');
      SLIDER_ELEMENT.setAttribute('aria-label', `${config.l10n.slideLabel} ${index + 1}/${GROUPS[activeGroup].triggerElements.length}`);
    }
    SLIDER_ELEMENT.setAttribute('aria-hidden', 'true');
    SLIDER_ELEMENT.appendChild(SLIDER_ELEMENT_CONTENT);
    GROUPS[activeGroup].sliderElements[index] = SLIDER_ELEMENT;
    if (index >= currentIndex) {
      const nextSlideIndex = getNextSlideIndex(index);
      if (nextSlideIndex !== -1) {
        GROUPS[activeGroup].sliderElements[nextSlideIndex].before(SLIDER_ELEMENT);
      } else {
        GROUPS[activeGroup].slider.appendChild(SLIDER_ELEMENT);
      }
    } else {
      const previousSlideIndex = getPreviousSlideIndex(index);
      if (previousSlideIndex !== -1) {
        GROUPS[activeGroup].sliderElements[previousSlideIndex].after(SLIDER_ELEMENT);
      } else {
        GROUPS[activeGroup].slider.prepend(SLIDER_ELEMENT);
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
    if (!GROUPS[activeGroup].triggerElements.includes(el)) {
      throw new Error('Ups, I can\'t find the element.');
    }
    currentIndex = GROUPS[activeGroup].triggerElements.indexOf(el);
    lastFocus = document.activeElement;
    history.pushState({
      parvus: 'close'
    }, 'Image', window.location.href);
    bindEvents();
    const nonLightboxEls = document.querySelectorAll('body > *:not([aria-hidden="true"])');
    nonLightboxEls.forEach(nonLightboxEl => {
      nonLightboxEl.setAttribute('aria-hidden', 'true');
      nonLightboxEl.classList.add('parvus-hidden');
    });
    lightbox.classList.add('parvus--is-opening');
    lightbox.setAttribute('aria-hidden', 'false');
    createSlider();
    createSlide(currentIndex);
    GROUPS[activeGroup].slider.setAttribute('aria-hidden', 'false');
    updateOffset();
    updateConfig();
    updateCounter();
    setFocusToFirstItem();
    loadSlide(currentIndex);
    createImage(el, currentIndex, () => {
      loadImage(currentIndex, true);
      lightbox.classList.remove('parvus--is-opening');
      GROUPS[activeGroup].slider.classList.add('parvus__slider--animate');
    });
    preload(currentIndex + 1);
    preload(currentIndex - 1);
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
    const IMAGE = GROUPS[activeGroup].contentElements[currentIndex];
    const THUMBNAIL = config.backFocus ? GROUPS[activeGroup].triggerElements[currentIndex] : lastFocus;
    unbindEvents();
    clearDrag();
    if (history.state?.parvus === 'close') {
      history.back();
    }
    const nonLightboxEls = document.querySelectorAll('.parvus-hidden');
    nonLightboxEls.forEach(nonLightboxEl => {
      nonLightboxEl.removeAttribute('aria-hidden');
      nonLightboxEl.classList.remove('parvus-hidden');
    });
    lightbox.classList.add('parvus--is-closing');
    requestAnimationFrame(() => {
      const THUMBNAIL_SIZE = THUMBNAIL.getBoundingClientRect();
      if (IMAGE && IMAGE.tagName === 'IMG') {
        const IMAGE_SIZE = IMAGE.getBoundingClientRect();
        const widthDifference = THUMBNAIL_SIZE.width / IMAGE_SIZE.width;
        const heightDifference = THUMBNAIL_SIZE.height / IMAGE_SIZE.height;
        const xDifference = THUMBNAIL_SIZE.left - IMAGE_SIZE.left;
        const yDifference = THUMBNAIL_SIZE.top - IMAGE_SIZE.top;
        IMAGE.style.transform = `translate(${xDifference}px, ${yDifference}px) scale(${widthDifference}, ${heightDifference})`;
      }
      IMAGE.style.opacity = 0;
      IMAGE.style.transition = `transform ${transitionDuration}ms ${config.transitionTimingFunction}, opacity ${transitionDuration}ms ${config.transitionTimingFunction} ${transitionDuration / 2}ms`;
    });
    const transitionendHandler = () => {
      leaveSlide(currentIndex);
      lastFocus = config.backFocus ? GROUPS[activeGroup].triggerElements[currentIndex] : lastFocus;
      lastFocus.focus({
        preventScroll: true
      });
      lightbox.setAttribute('aria-hidden', 'true');
      lightbox.classList.remove('parvus--is-closing');
      lightbox.classList.remove('parvus--is-vertical-closing');
      IMAGE.style.transform = '';
      GROUPS[activeGroup].slider.remove();
      GROUPS[activeGroup].slider = null;
      GROUPS[activeGroup].sliderElements = [];
      GROUPS[activeGroup].contentElements = [];
      IMAGE.removeEventListener('transitionend', transitionendHandler);
    };
    IMAGE.addEventListener('transitionend', transitionendHandler, {
      once: true
    });
    const CLOSE_EVENT = new CustomEvent('close', {
      detail: {
        source: GROUPS[activeGroup].triggerElements[currentIndex]
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
    if (index < 0 || index >= GROUPS[activeGroup].triggerElements.length || GROUPS[activeGroup].sliderElements[index] !== undefined) {
      return;
    }
    createSlide(index);
    createImage(GROUPS[activeGroup].triggerElements[index], index, () => {
      loadImage(index);
    });
  };

  /**
   * Load slide
   *
   * @param {Number} index
   */
  const loadSlide = index => {
    GROUPS[activeGroup].sliderElements[index].setAttribute('aria-hidden', 'false');
  };

  /**
   * Add caption
   *
   * @param {HTMLElement} containerEl
   * @param {HTMLElement} triggerEl
   * @param {Number} index
   */
  const addCaption = (containerEl, triggerEl, index) => {
    const CAPTION_CONTAINER = document.createElement('div');
    let captionData = null;
    CAPTION_CONTAINER.className = 'parvus__caption';
    if (config.captionsSelector === 'self') {
      if (triggerEl.hasAttribute(config.captionsAttribute) && triggerEl.getAttribute(config.captionsAttribute) !== '') {
        captionData = triggerEl.getAttribute(config.captionsAttribute);
      }
    } else {
      const CAPTION_SELECTOR = triggerEl.querySelector(config.captionsSelector);
      if (CAPTION_SELECTOR !== null) {
        if (CAPTION_SELECTOR.hasAttribute(config.captionsAttribute) && CAPTION_SELECTOR.getAttribute(config.captionsAttribute) !== '') {
          captionData = CAPTION_SELECTOR.getAttribute(config.captionsAttribute);
        } else {
          captionData = CAPTION_SELECTOR.innerHTML;
        }
      }
    }
    if (captionData !== null) {
      const captionId = `parvus__caption-${index}`;
      CAPTION_CONTAINER.setAttribute('aria-labelledby', captionId);
      CAPTION_CONTAINER.id = captionId;
      CAPTION_CONTAINER.innerHTML = `<p>${captionData}</p>`;
      containerEl.appendChild(CAPTION_CONTAINER);
    }
  };
  const createImage = (triggerEl, index, callback) => {
    const {
      contentElements,
      sliderElements
    } = GROUPS[activeGroup];
    if (contentElements[index] !== undefined) {
      if (callback && typeof callback === 'function') {
        callback();
      }
      return;
    }
    const CONTENT_CONTAINER_EL = sliderElements[index].querySelector('div');
    const IMAGE = new Image();
    const IMAGE_CONTAINER = document.createElement('div');
    const THUMBNAIL = triggerEl.querySelector('img');
    const LOADING_INDICATOR = document.createElement('div');
    IMAGE_CONTAINER.className = 'parvus__content';

    // Create loading indicator
    LOADING_INDICATOR.className = 'parvus__loader';
    LOADING_INDICATOR.setAttribute('role', 'progressbar');
    LOADING_INDICATOR.setAttribute('aria-label', config.l10n.lightboxLoadingIndicatorLabel);

    // Add loading indicator to content container
    CONTENT_CONTAINER_EL.appendChild(LOADING_INDICATOR);
    const checkImagePromise = new Promise((resolve, reject) => {
      IMAGE.onload = () => resolve(IMAGE);
      IMAGE.onerror = error => reject(error);
    });
    checkImagePromise.then(loadedImage => {
      // Add srcset if available
      const srcset = triggerEl.getAttribute('data-srcset');
      if (srcset) {
        loadedImage.setAttribute('srcset', srcset);
      }
      loadedImage.style.opacity = 0;
      IMAGE_CONTAINER.appendChild(loadedImage);
      CONTENT_CONTAINER_EL.appendChild(IMAGE_CONTAINER);

      // Add caption if available
      if (config.captions) {
        addCaption(CONTENT_CONTAINER_EL, triggerEl, index);
      }
      contentElements[index] = loadedImage;

      // Set image width and height
      loadedImage.setAttribute('width', loadedImage.naturalWidth);
      loadedImage.setAttribute('height', loadedImage.naturalHeight);

      // Set image dimension
      setImageDimension(sliderElements[index], loadedImage);
    }).catch(() => {
      const ERROR_CONTAINER = document.createElement('div');
      ERROR_CONTAINER.innerHTML = 'Error';
      CONTENT_CONTAINER_EL.appendChild(ERROR_CONTAINER);
      contentElements[index] = ERROR_CONTAINER;
    }).finally(() => {
      CONTENT_CONTAINER_EL.removeChild(LOADING_INDICATOR);
      if (callback && typeof callback === 'function') {
        callback();
      }
    });
    if (triggerEl.tagName === 'A') {
      IMAGE.setAttribute('src', triggerEl.href);
      if (THUMBNAIL) {
        IMAGE.alt = THUMBNAIL.alt || '';
      } else {
        IMAGE.alt = triggerEl.getAttribute('data-alt') || '';
      }
    } else {
      IMAGE.alt = triggerEl.getAttribute('data-alt') || '';
      IMAGE.setAttribute('src', triggerEl.getAttribute('data-target'));
    }
  };

  /**
   * Load Image
   *
   * @param {Number} index
   */
  const loadImage = (index, animate) => {
    const IMAGE = GROUPS[activeGroup].contentElements[index];
    if (IMAGE && IMAGE.tagName === 'IMG') {
      const THUMBNAIL = GROUPS[activeGroup].triggerElements[index];
      if (animate) {
        const IMAGE_SIZE = IMAGE.getBoundingClientRect();
        const THUMBNAIL_SIZE = THUMBNAIL.getBoundingClientRect();
        const widthDifference = THUMBNAIL_SIZE.width / IMAGE_SIZE.width;
        const heightDifference = THUMBNAIL_SIZE.height / IMAGE_SIZE.height;
        const xDifference = THUMBNAIL_SIZE.left - IMAGE_SIZE.left;
        const yDifference = THUMBNAIL_SIZE.top - IMAGE_SIZE.top;
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
    } else {
      IMAGE.style.opacity = 1;
    }
  };
  const select = index => {
    const OLD_INDEX = currentIndex;
    if (!isOpen()) {
      throw new Error("Oops, I'm closed.");
    } else {
      if (typeof index !== 'number' || isNaN(index)) {
        throw new Error('Oops, no slide specified.');
      }
      const triggerElements = GROUPS[activeGroup].triggerElements;
      if (index === currentIndex) {
        throw new Error(`Oops, slide ${index} is already selected.`);
      }
      if (index < -1 || index >= triggerElements.length) {
        throw new Error(`Oops, I can't find slide ${index}.`);
      }
    }
    if (GROUPS[activeGroup].sliderElements[index] !== undefined) {
      loadSlide(index);
    } else {
      createSlide(index);
      createImage(GROUPS[activeGroup].triggerElements[index], index, () => {
        loadImage(index);
      });
      loadSlide(index);
    }
    currentIndex = index;
    updateOffset();
    updateConfig();
    if (index < OLD_INDEX) {
      updateFocus('left');
      preload(index - 1);
    } else if (index > OLD_INDEX) {
      updateFocus('right');
      preload(index + 1);
    }
    leaveSlide(OLD_INDEX);
    updateCounter();

    // Create and dispatch a new event
    const SELECT_EVENT = new CustomEvent('select', {
      detail: {
        source: GROUPS[activeGroup].triggerElements[currentIndex]
      }
    });
    lightbox.dispatchEvent(SELECT_EVENT);
  };

  /**
   * Select the previous slide
   */
  const previous = () => {
    if (currentIndex > 0) {
      select(currentIndex - 1);
    }
  };

  /**
   * Select the next slide
   */
  const next = () => {
    const {
      triggerElements
    } = GROUPS[activeGroup];
    if (currentIndex < triggerElements.length - 1) {
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
    if (GROUPS[activeGroup].sliderElements[index] !== undefined) {
      GROUPS[activeGroup].sliderElements[index].setAttribute('aria-hidden', 'true');
    }
  };

  /**
   * Update offset
   *
   */
  const updateOffset = () => {
    activeGroup = activeGroup !== null ? activeGroup : newGroup;
    offset = -currentIndex * lightbox.offsetWidth;
    GROUPS[activeGroup].slider.style.transform = `translate3d(${offset}px, 0, 0)`;
    offsetTmp = offset;
  };

  /**
   * Update focus
   *
   * @param {String} dir
   */
  const updateFocus = dir => {
    const {
      triggerElements
    } = GROUPS[activeGroup];
    const numSlides = triggerElements.length;
    if (numSlides === 1) {
      closeButton.focus();
    } else if (currentIndex === 0) {
      nextButton.focus();
    } else if (currentIndex === numSlides - 1) {
      previousButton.focus();
    } else {
      if (dir === 'left') {
        previousButton.focus();
      } else {
        nextButton.focus();
      }
    }
  };

  /**
   * Update counter
   *
   */
  const updateCounter = () => {
    counter.textContent = `${currentIndex + 1}/${GROUPS[activeGroup].triggerElements.length}`;
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
    const {
      startX,
      startY,
      endX,
      endY
    } = drag;
    const MOVEMENT_X = endX - startX;
    const MOVEMENT_Y = endY - startY;
    const MOVEMENT_X_DISTANCE = Math.abs(MOVEMENT_X);
    const MOVEMENT_Y_DISTANCE = Math.abs(MOVEMENT_Y);
    const {
      triggerElements
    } = GROUPS[activeGroup];
    const numSlides = triggerElements.length;
    if (isDraggingX) {
      if (MOVEMENT_X > 2 && MOVEMENT_X_DISTANCE >= config.threshold && currentIndex > 0) {
        previous();
      } else if (MOVEMENT_X < 2 && MOVEMENT_X_DISTANCE >= config.threshold && currentIndex !== numSlides - 1) {
        next();
      } else {
        updateOffset();
      }
    } else if (isDraggingY) {
      if (MOVEMENT_Y_DISTANCE > 2 && config.swipeClose && MOVEMENT_Y_DISTANCE >= config.threshold) {
        close();
      } else {
        lightbox.classList.remove('parvus--is-vertical-closing');
        updateOffset();
      }
      lightboxOverlay.style.opacity = '';
    } else {
      updateOffset();
    }
  };

  /**
   * Update Config
   *
   */
  const updateConfig = () => {
    const slider = GROUPS[activeGroup].slider;
    const triggerElements = GROUPS[activeGroup].triggerElements;
    const triggerLength = triggerElements.length;
    const isTouch = config.simulateTouch || isTouchDevice();
    const isDraggable = slider.classList.contains('parvus__slider--is-draggable');
    if (isTouch && config.swipeClose && !isDraggable || isTouch && triggerLength > 1 && !isDraggable) {
      slider.classList.add('parvus__slider--is-draggable');
    } else {
      slider.classList.remove('parvus__slider--is-draggable');
    }
    const hideButtons = triggerLength === 1;
    const firstSlide = currentIndex === 0;
    const lastSlide = currentIndex === triggerLength - 1;
    previousButton.setAttribute('aria-hidden', hideButtons ? 'true' : 'false');
    previousButton.setAttribute('aria-disabled', hideButtons ? 'true' : 'false');
    nextButton.setAttribute('aria-hidden', hideButtons ? 'true' : 'false');
    nextButton.setAttribute('aria-disabled', hideButtons ? 'true' : 'false');
    if (firstSlide) {
      previousButton.setAttribute('aria-hidden', 'true');
      previousButton.setAttribute('aria-disabled', 'true');
      nextButton.setAttribute('aria-hidden', 'false');
      nextButton.setAttribute('aria-disabled', 'false');
    } else if (lastSlide) {
      previousButton.setAttribute('aria-hidden', 'false');
      previousButton.setAttribute('aria-disabled', 'false');
      nextButton.setAttribute('aria-hidden', 'true');
      nextButton.setAttribute('aria-disabled', 'true');
    }
    counter.setAttribute('aria-hidden', triggerLength === 1 ? 'true' : 'false');
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
          setImageDimension(slide, GROUPS[activeGroup].contentElements[index]);
        });
        updateOffset();
        resizeTicking = false;
      });
    }
  };

  /**
   * Set image dimension
   *
   * @param {HTMLElement} slideEl
   * @param {HTMLElement} contentEl
   */
  const setImageDimension = (slideEl, contentEl) => {
    if (contentEl.tagName !== 'IMG') {
      return;
    }
    const computedStyle = getComputedStyle(slideEl);
    const captionEl = slideEl.querySelector('.parvus__caption');
    const captionRec = captionEl ? captionEl.getBoundingClientRect().height : 0;
    const srcHeight = contentEl.getAttribute('height');
    const srcWidth = contentEl.getAttribute('width');
    let maxHeight = slideEl.offsetHeight;
    let maxWidth = slideEl.offsetWidth;
    maxHeight -= parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom) + parseFloat(captionRec);
    maxWidth -= parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight);
    const ratio = Math.min(maxWidth / srcWidth || 0, maxHeight / srcHeight);
    const newWidth = srcWidth * ratio || 0;
    const newHeight = srcHeight * ratio || 0;
    if (srcHeight > newHeight && srcHeight < maxHeight && srcWidth > newWidth && srcWidth < maxWidth || srcHeight < newHeight && srcHeight < maxHeight && srcWidth < newWidth && srcWidth < maxWidth) {
      contentEl.style.width = '';
      contentEl.style.height = '';
    } else {
      contentEl.style.width = `${newWidth}px`;
      contentEl.style.height = `${newHeight}px`;
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
    const {
      target
    } = event;
    if (target === previousButton) {
      previous();
    } else if (target === nextButton) {
      next();
    } else if (target === closeButton || config.docClose && !isDraggingY && !isDraggingX && target.classList.contains('parvus__slide')) {
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
    return Array.from(lightbox.querySelectorAll(FOCUSABLE_ELEMENTS.join(', '))).filter(child => child.offsetParent !== null);
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
    const lastIndex = FOCUSABLE_CHILDREN.length - 1;
    switch (event.code) {
      case 'Tab':
        {
          if (event.shiftKey) {
            // Moving backwards
            if (FOCUSED_ITEM_INDEX === 0) {
              FOCUSABLE_CHILDREN[lastIndex].focus();
              event.preventDefault();
            }
          } else {
            // Moving forwards
            if (FOCUSED_ITEM_INDEX === lastIndex) {
              FOCUSABLE_CHILDREN[0].focus();
              event.preventDefault();
            }
          }
          break;
        }
      case 'Escape':
        {
          // `ESC` Key: Close Parvus
          close();
          event.preventDefault();
          break;
        }
      case 'ArrowLeft':
        {
          // `PREV` Key: Show the previous slide
          previous();
          event.preventDefault();
          break;
        }
      case 'ArrowRight':
        {
          // `NEXT` Key: Show the next slide
          next();
          event.preventDefault();
          break;
        }
    }
  };

  /**
   * Mousedown event handler
   */
  const mousedownHandler = event => {
    isDraggingX = false;
    isDraggingY = false;
    pointerDown = true;
    const {
      pageX,
      pageY
    } = event;
    drag.startX = pageX;
    drag.startY = pageY;
    const {
      slider
    } = GROUPS[activeGroup];
    slider.classList.add('parvus__slider--is-dragging');
    slider.style.willChange = 'transform';
    event.stopPropagation();
    lightboxOverlayOpacity = getComputedStyle(lightboxOverlay).opacity;
  };

  /**
   * Mousemove event handler
   */
  const mousemoveHandler = event => {
    if (pointerDown) {
      const {
        pageX,
        pageY
      } = event;
      drag.endX = pageX;
      drag.endY = pageY;
      doSwipe();
    }
    event.preventDefault();
  };

  /**
   * Mouseup event handler
   */
  const mouseupHandler = () => {
    pointerDown = false;
    const {
      slider
    } = GROUPS[activeGroup];
    slider.classList.remove('parvus__slider--is-dragging');
    slider.style.willChange = 'auto';
    if (drag.endX || drag.endY) {
      updateAfterDrag();
    }
    clearDrag();
  };

  /**
   * Touchstart event handler
   */
  const touchstartHandler = event => {
    isDraggingX = false;
    isDraggingY = false;
    const {
      clientX,
      clientY
    } = event.changedTouches[0];
    drag.startX = parseInt(clientX);
    drag.startY = parseInt(clientY);
    const {
      slider
    } = GROUPS[activeGroup];
    slider.classList.add('parvus__slider--is-dragging');
    slider.style.willChange = 'transform';
    lightboxOverlayOpacity = getComputedStyle(lightboxOverlay).getPropertyValue('opacity');
    event.stopPropagation();
  };

  /**
   * Touchmove event handler
   */
  const touchmoveHandler = event => {
    const {
      clientX,
      clientY
    } = event.changedTouches[0];
    drag.endX = parseInt(clientX);
    drag.endY = parseInt(clientY);
    doSwipe();
    event.preventDefault();
  };

  /**
   * Touchend event handler
   */
  const touchendHandler = () => {
    const {
      slider
    } = GROUPS[activeGroup];
    slider.classList.remove('parvus__slider--is-dragging');
    slider.style.willChange = 'auto';
    if (drag.endX || drag.endY) {
      updateAfterDrag();
    }
    clearDrag();
  };

  /**
   * Decide whether to do horizontal or vertical swipe
   */
  const doSwipe = () => {
    const {
      startX,
      endX,
      startY,
      endY
    } = drag;
    const MOVEMENT_X = startX - endX;
    const MOVEMENT_Y = endY - startY;
    const MOVEMENT_Y_DISTANCE = Math.abs(MOVEMENT_Y);
    if (Math.abs(MOVEMENT_X) > 2 && !isDraggingY && GROUPS[activeGroup].triggerElements.length > 1) {
      // Horizontal swipe
      GROUPS[activeGroup].slider.style.transform = `translate3d(${offsetTmp - Math.round(MOVEMENT_X)}px, 0, 0)`;
      isDraggingX = true;
      isDraggingY = false;
    } else if (Math.abs(MOVEMENT_Y) > 2 && !isDraggingX && config.swipeClose) {
      // Vertical swipe
      if (!isReducedMotion && MOVEMENT_Y_DISTANCE <= 100) {
        lightboxOverlay.style.opacity = lightboxOverlayOpacity - MOVEMENT_Y_DISTANCE / 100;
      }
      lightbox.classList.add('parvus--is-vertical-closing');
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

    // Popstate event
    BROWSER_WINDOW.addEventListener('popstate', close);

    // Click event
    lightbox.addEventListener('click', clickHandler);

    // Touch events
    if (isTouchDevice()) {
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

    // Popstate event
    BROWSER_WINDOW.removeEventListener('popstate', close);

    // Click event
    lightbox.removeEventListener('click', clickHandler);

    // Touch events
    if (isTouchDevice()) {
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
    LIGHTBOX_TRIGGER_ELS.forEach(remove);

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

  /**
   * Init
   *
   */
  const init = () => {
    // Merge user options into defaults
    config = mergeOptions(userOptions);

    // Check if a lightbox element is present
    if (!document.querySelectorAll(config.selector).length) {
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
        const LIGHTBOX_TRIGGER_GALLERY_ELS = galleryEl.querySelectorAll(config.selector);

        // Execute a few things once per element
        LIGHTBOX_TRIGGER_GALLERY_ELS.forEach(lightboxTriggerEl => {
          lightboxTriggerEl.setAttribute('data-group', `parvus-gallery-${GALLERY_INDEX}`);
          add(lightboxTriggerEl);
        });
      });
    }

    // Get a list of all `selector` elements outside or without the `gallerySelector`
    const LIGHTBOX_TRIGGER_ELS = document.querySelectorAll(`${config.selector}:not(.parvus-trigger)`);
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
    on,
    off
  };
}

export { Parvus as default };
