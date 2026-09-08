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
export const createLightbox = (state) => {
  const { config } = state

  // Use DocumentFragment to batch DOM operations
  const fragment = document.createDocumentFragment()

  // Create the lightbox container
  state.lightbox = document.createElement('dialog')
  state.lightbox.setAttribute('role', 'dialog')
  state.lightbox.setAttribute('aria-modal', 'true')
  state.lightbox.setAttribute('aria-label', config.l10n.lightboxLabel)
  state.lightbox.classList.add('parvus')

  // Create the lightbox overlay container
  state.lightboxOverlay = document.createElement('div')
  state.lightboxOverlay.classList.add('parvus__overlay')

  // Create the toolbar
  state.toolbar = document.createElement('div')
  state.toolbar.className = 'parvus__toolbar'

  // Create the toolbar items
  state.toolbarLeft = document.createElement('div')
  state.toolbarRight = document.createElement('div')

  // Create the controls
  state.controls = document.createElement('div')
  state.controls.className = 'parvus__controls'
  state.controls.setAttribute('role', 'group')
  state.controls.setAttribute('aria-label', config.l10n.controlsLabel)

  // Create the close button
  state.closeButton = document.createElement('button')
  state.closeButton.className = 'parvus__btn parvus__btn--close'
  state.closeButton.setAttribute('type', 'button')
  state.closeButton.setAttribute('aria-label', config.l10n.closeButtonLabel)
  state.closeButton.innerHTML = config.closeButtonIcon

  // Create the previous button
  state.previousButton = document.createElement('button')
  state.previousButton.className = 'parvus__btn parvus__btn--previous'
  state.previousButton.setAttribute('type', 'button')
  state.previousButton.setAttribute('aria-label', config.l10n.previousButtonLabel)
  state.previousButton.innerHTML = config.previousButtonIcon

  // Create the next button
  state.nextButton = document.createElement('button')
  state.nextButton.className = 'parvus__btn parvus__btn--next'
  state.nextButton.setAttribute('type', 'button')
  state.nextButton.setAttribute('aria-label', config.l10n.nextButtonLabel)
  state.nextButton.innerHTML = config.nextButtonIcon

  // Create the counter
  state.counter = document.createElement('div')
  state.counter.className = 'parvus__counter'
  // Announces slide changes, since previous/next clicks leave focus on the button, not the slide
  state.counter.setAttribute('role', 'status')

  // The "1/3" display is decorative; a screen reader reads "/" literally, so a
  // visually hidden sibling carries the actual announced text
  state.counterValue = document.createElement('span')
  state.counterValue.setAttribute('aria-hidden', 'true')

  state.counterLabel = document.createElement('span')
  state.counterLabel.className = 'parvus-visually-hidden'

  state.counter.append(state.counterValue, state.counterLabel)

  // Add the control buttons to the controls
  state.controls.append(state.closeButton, state.previousButton, state.nextButton)

  // Add the counter to the left toolbar item
  state.toolbarLeft.appendChild(state.counter)

  // Add the controls to the right toolbar item
  state.toolbarRight.appendChild(state.controls)

  // Add the toolbar items to the toolbar
  state.toolbar.append(state.toolbarLeft, state.toolbarRight)

  // Add the overlay and the toolbar to the lightbox
  state.lightbox.append(state.lightboxOverlay, state.toolbar)
  fragment.appendChild(state.lightbox)

  // Add to document body
  document.body.appendChild(fragment)
}

/**
 * Create a slider
 *
 * @param {Object} state - The application state
 * @returns {void}
 */
export const createSlider = (state) => {
  const SLIDER = document.createElement('div')

  SLIDER.className = 'parvus__slider'

  // Update the slider reference in GROUPS
  state.GROUPS[state.activeGroup].slider = SLIDER

  // Add the slider to the lightbox container
  state.lightbox.appendChild(SLIDER)
}

/**
 * Get next slide index
 *
 * @param {Object} state - The application state
 * @param {Number} currentIndex - Current slide index
 * @returns {number} Index of the next available slide or -1 if none found
 */
export const getNextSlideIndex = (state, currentIndex) => {
  const SLIDE_ELEMENTS = state.GROUPS[state.activeGroup].sliderElements
  const TOTAL_SLIDE_ELEMENTS = SLIDE_ELEMENTS.length

  for (let i = currentIndex + 1; i < TOTAL_SLIDE_ELEMENTS; i++) {
    if (SLIDE_ELEMENTS[i] !== undefined) {
      return i
    }
  }

  return -1
}

/**
 * Get previous slide index
 *
 * @param {Object} state - The application state
 * @param {number} currentIndex - Current slide index
 * @returns {number} Index of the previous available slide or -1 if none found
 */
export const getPreviousSlideIndex = (state, currentIndex) => {
  const SLIDE_ELEMENTS = state.GROUPS[state.activeGroup].sliderElements

  for (let i = currentIndex - 1; i >= 0; i--) {
    if (SLIDE_ELEMENTS[i] !== undefined) {
      return i
    }
  }

  return -1
}

/**
 * Create a slide
 *
 * @param {Object} state - The application state
 * @param {Number} index - The index of the slide
 * @returns {void}
 */
export const createSlide = (state, index) => {
  if (state.GROUPS[state.activeGroup].sliderElements[index] !== undefined) {
    return
  }

  const FRAGMENT = document.createDocumentFragment()
  const SLIDE_ELEMENT = document.createElement('div')
  const SLIDE_ELEMENT_CONTENT = document.createElement('div')

  const GROUP = state.GROUPS[state.activeGroup]
  const TOTAL_TRIGGER_ELEMENTS = GROUP.triggerElements.length

  SLIDE_ELEMENT.className = 'parvus__slide'
  SLIDE_ELEMENT.style.cssText = `
    position: absolute;
    left: ${index * 100}%;
  `
  SLIDE_ELEMENT.setAttribute('aria-hidden', 'true')

  // Add accessibility attributes if gallery has multiple slides
  if (TOTAL_TRIGGER_ELEMENTS > 1) {
    SLIDE_ELEMENT.setAttribute('role', 'group')
    SLIDE_ELEMENT.setAttribute('aria-label', `${state.config.l10n.slideLabel} ${index + 1}/${TOTAL_TRIGGER_ELEMENTS}`)
  }

  SLIDE_ELEMENT.appendChild(SLIDE_ELEMENT_CONTENT)
  FRAGMENT.appendChild(SLIDE_ELEMENT)

  GROUP.sliderElements[index] = SLIDE_ELEMENT

  // Insert the slide element based on index position
  if (index >= state.currentIndex) {
    // Insert the slide element after the current slide
    const NEXT_SLIDE_INDEX = getNextSlideIndex(state, index)

    if (NEXT_SLIDE_INDEX !== -1) {
      GROUP.sliderElements[NEXT_SLIDE_INDEX].before(SLIDE_ELEMENT)
    } else {
      GROUP.slider.appendChild(SLIDE_ELEMENT)
    }
  } else {
    // Insert the slide element before the current slide
    const PREVIOUS_SLIDE_INDEX = getPreviousSlideIndex(state, index)

    if (PREVIOUS_SLIDE_INDEX !== -1) {
      GROUP.sliderElements[PREVIOUS_SLIDE_INDEX].after(SLIDE_ELEMENT)
    } else {
      GROUP.slider.prepend(SLIDE_ELEMENT)
    }
  }
}

/**
 * Update counter
 *
 * @param {Object} state - The application state
 * @returns {void}
 */
export const updateCounter = (state) => {
  const CURRENT = state.currentIndex + 1
  const TOTAL = state.GROUPS[state.activeGroup].triggerElements.length

  state.counterValue.textContent = `${CURRENT}/${TOTAL}`
  state.counterLabel.textContent = state.config.l10n.counterLabel
    .replace('{current}', CURRENT)
    .replace('{total}', TOTAL)
}

/**
 * Update Attributes
 *
 * @param {Object} state - The application state
 * @returns {void}
 */
export const updateAttributes = (state) => {
  const TRIGGER_ELEMENTS = state.GROUPS[state.activeGroup].triggerElements
  const TOTAL_TRIGGER_ELEMENTS = TRIGGER_ELEMENTS.length

  const SLIDER = state.GROUPS[state.activeGroup].slider
  const SLIDER_ELEMENTS = state.GROUPS[state.activeGroup].sliderElements

  // Add draggable class if necessary
  SLIDER.classList.toggle('parvus__slider--is-draggable', state.config.simulateTouch && (state.config.swipeClose || TOTAL_TRIGGER_ELEMENTS > 1))

  // Add extra output for screen reader if there is more than one slide
  if (TOTAL_TRIGGER_ELEMENTS > 1) {
    SLIDER.setAttribute('role', 'region')
    SLIDER.setAttribute('aria-roledescription', 'carousel')
    SLIDER.setAttribute('aria-label', state.config.l10n.sliderLabel)

    SLIDER_ELEMENTS.forEach((sliderElement, index) => {
      sliderElement.setAttribute('role', 'group')
      sliderElement.setAttribute('aria-label', `${state.config.l10n.slideLabel} ${index + 1}/${TOTAL_TRIGGER_ELEMENTS}`)
    })
  } else {
    SLIDER.removeAttribute('role')
    SLIDER.removeAttribute('aria-roledescription')
    SLIDER.removeAttribute('aria-label')

    SLIDER_ELEMENTS.forEach((sliderElement) => {
      sliderElement.removeAttribute('role')
      sliderElement.removeAttribute('aria-label')
    })
  }

  // Show or hide buttons
  if (TOTAL_TRIGGER_ELEMENTS === 1) {
    state.counter.setAttribute('aria-hidden', 'true')

    state.previousButton.setAttribute('aria-hidden', 'true')

    state.nextButton.setAttribute('aria-hidden', 'true')
  } else {
    state.counter.removeAttribute('aria-hidden')

    state.previousButton.removeAttribute('aria-hidden')

    state.nextButton.removeAttribute('aria-hidden')
  }
}

/**
 * Update slider navigation status
 *
 * @param {Object} state - The application state
 * @returns {void}
 */
export const updateSliderNavigationStatus = (state) => {
  const { triggerElements } = state.GROUPS[state.activeGroup]
  const TOTAL_TRIGGER_ELEMENTS = triggerElements.length

  if (TOTAL_TRIGGER_ELEMENTS <= 1) {
    return
  }

  // Determine navigation state
  const FIRST_SLIDE = state.currentIndex === 0
  const LAST_SLIDE = state.currentIndex === TOTAL_TRIGGER_ELEMENTS - 1

  // Set previous button state
  const PREV_DISABLED = FIRST_SLIDE ? 'true' : null

  if ((state.previousButton.getAttribute('aria-disabled') === 'true') !== !!PREV_DISABLED) {
    PREV_DISABLED
      ? state.previousButton.setAttribute('aria-disabled', 'true')
      : state.previousButton.removeAttribute('aria-disabled')
  }

  // Set next button state
  const NEXT_DISABLED = LAST_SLIDE ? 'true' : null

  if ((state.nextButton.getAttribute('aria-disabled') === 'true') !== !!NEXT_DISABLED) {
    NEXT_DISABLED
      ? state.nextButton.setAttribute('aria-disabled', 'true')
      : state.nextButton.removeAttribute('aria-disabled')
  }
}
