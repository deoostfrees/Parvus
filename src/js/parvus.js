export default function Parvus (userOptions) {
  /**
   * Global variables
   *
   */
  const BROWSER_WINDOW = window
  const FOCUSABLE_ELEMENTS = [
    'button:not([disabled]):not([inert])',
    '[tabindex]:not([tabindex^="-"]):not([inert])'
  ]
  const GROUP_ATTS = {
    gallery: [],
    slider: null,
    sliderElements: [],
    elementsLength: 0,
    currentIndex: 0,
    x: 0
  }
  const GROUPS = {}
  let newGroup = null
  let activeGroup = null
  let config = {}
  let lightbox = null
  let lightboxOverlay = null
  let lightboxOverlayOpacity = 0
  let lightboxImage = null
  let closeButton = null
  let widthDifference
  let heightDifference
  let xDifference
  let yDifference
  let drag = {}
  let isDraggingX = false
  let isDraggingY = false
  let pointerDown = false
  let lastFocus = null
  let offset = null
  let offsetTmp = null
  let transitionDuration = null
  let isReducedMotion = true

  /**
   * Merge default options with user options
   *
   * @param {Object} userOptions - Optional user options
   * @returns {Object} - Custom options
   */
  const mergeOptions = function mergeOptions (userOptions) {
    // Default options
    const OPTIONS = {
      selector: '.lightbox',
      docClose: true,
      scrollClose: false,
      swipeClose: true,
      threshold: 100,
      transitionDuration: 300,
      reducedTransitionDuration: 1,
      transitionTimingFunction: 'cubic-bezier(0.2, 0, 0.2, 1)',
      lightboxIndicatorIcon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>',
      closeButtonIcon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 6L6 18M6 6l12 12"/></svg>',
      lang: 'en',
      i18n: {
        en: {
          lightboxLabel: 'This is a dialog window which overlays the main content of the page. The modal shows the enlarged image. Pressing the Escape key will close the modal and bring you back to where you were on the page.',
          lightboxLoadingIndicatorLabel: 'Image loading',
          closeButtonLabel: 'Close dialog window'
        }
      },
      fileTypes: /\.(png|jpe?g|gif|bmp|webp|svg)(\?.*)?$/i
    }

    return {
      ...OPTIONS, ...userOptions
    }
  }

  /**
   * Check prefers reduced motion
   * https://developer.mozilla.org/en-US/docs/Web/API/MediaQueryList
   *
   */
  const MOTIONQUERY = window.matchMedia('(prefers-reduced-motion)')

  const reducedMotionCheck = function reducedMotionCheck () {
    if (MOTIONQUERY.matches) {
      isReducedMotion = true
      transitionDuration = config.reducedTransitionDuration
    } else {
      isReducedMotion = false
      transitionDuration = config.transitionDuration
    }
  }

  // Check for any OS level changes to the preference
  MOTIONQUERY.addEventListener('change', reducedMotionCheck)

  /**
   * Init
   *
   */
  const init = function init (userOptions) {
    // Merge user options into defaults
    config = mergeOptions(userOptions)

    reducedMotionCheck()

    // Check if the lightbox already exists
    if (!lightbox) {
      createLightbox()
    }

    // Get a list of all elements within the document
    const LIGHTBOX_TRIGGER_ELS = document.querySelectorAll(config.selector)

    // Execute a few things once per element
    LIGHTBOX_TRIGGER_ELS.forEach(lightboxTriggerEl => {
      add(lightboxTriggerEl)
    })
  }

  /**
   * Get group from element
   *
   * @param {HTMLElement} el
   * @return {string}
   */
  const getGroup = function getGroup (el) {
    return el.hasAttribute('data-group') ? el.getAttribute('data-group') : 'default'
  }

  /**
   * Copy an object. (The secure way)
   *
   * @param {object} object
   * @return {object}
   */
  const copyObject = function copyObject (object) {
    return JSON.parse(JSON.stringify(object))
  }

  /**
   * Add element
   *
   * @param {HTMLElement} el - Element to add
   */
  const add = function add (el) {
    if (!(el.tagName === 'A' && el.hasAttribute('href') && el.href.match(config.fileTypes)) && !(el.tagName === 'BUTTON' && el.hasAttribute('data-target') && el.getAttribute('data-target').match(config.fileTypes))) {
      console.log(el, `Use a link with the 'href' attribute or a button with the 'data-target' attribute. Both attributes must have a path to the image file. Supported image file types: ${config.fileTypes}.`)
      return
    }

    newGroup = getGroup(el)

    if (!Object.prototype.hasOwnProperty.call(GROUPS, newGroup)) {
      GROUPS[newGroup] = copyObject(GROUP_ATTS)

      createSlider()
    }

    // Check if element already exists
    if (GROUPS[newGroup].gallery.indexOf(el) === -1) {
      GROUPS[newGroup].gallery.push(el)
      GROUPS[newGroup].elementsLength++

      if (el.querySelector('img') !== null) {
        el.classList.add('parvus-zoom')

        const lightboxIndicatorIcon = document.createElement('div')

        lightboxIndicatorIcon.className = 'parvus-zoom__indicator'
        lightboxIndicatorIcon.innerHTML = config.lightboxIndicatorIcon

        el.appendChild(lightboxIndicatorIcon)
      }

      el.classList.add('parvus-trigger')

      // Bind click event handler
      el.addEventListener('click', triggerParvus)

      createSlide(el)

      if (isOpen() && newGroup === activeGroup) {
        updateConfig()
      }
    } else {
      console.log('Ups, element already added.')
    }
  }

  /**
   * Remove element
   *
   * @param {HTMLElement} el - Element to remove
   */
  const remove = function remove (el) {
    if (el.classList.contains('parvus-zoom')) {
      el.classList.remove('parvus-zoom')

      // Unbind click event handler
      el.removeEventListener('click', triggerParvus)
    }
  }

  /**
   * Create the lightbox
   *
   */
  const createLightbox = function createLightbox () {
    // Create the lightbox container
    lightbox = document.createElement('div')
    lightbox.setAttribute('role', 'dialog')
    lightbox.setAttribute('aria-modal', 'true')
    lightbox.setAttribute('aria-hidden', 'true')
    lightbox.setAttribute('tabindex', '-1')
    lightbox.setAttribute('aria-label', config.i18n[config.lang].lightboxLabel)
    lightbox.classList.add('parvus')

    // Create the lightbox overlay container
    lightboxOverlay = document.createElement('div')
    lightboxOverlay.classList.add('parvus__overlay')

    lightboxOverlay.style.opacity = 0

    // Add lightbox overlay container to lightbox container
    lightbox.appendChild(lightboxOverlay)

    // Create the close button
    closeButton = document.createElement('button')
    closeButton.className = 'parvus__btn parvus__btn--close'
    closeButton.setAttribute('type', 'button')
    closeButton.setAttribute('aria-label', config.i18n[config.lang].closeButtonLabel)
    closeButton.innerHTML = config.closeButtonIcon

    // Add close button to lightbox container
    lightbox.appendChild(closeButton)

    // Add lightbox container to body
    document.body.appendChild(lightbox)
  }

  /**
   * Create a slider
   *
   */
  const createSlider = function createSlider () {
    GROUPS[newGroup].slider = document.createElement('div')
    GROUPS[newGroup].slider.className = 'parvus__slider'

    // Hide slider
    GROUPS[newGroup].slider.setAttribute('aria-hidden', 'true')

    lightbox.appendChild(GROUPS[newGroup].slider)
  }

  /**
   * Create a slide
   *
   */
  const createSlide = function createSlide (el) {
    const SLIDER_ELEMENT = document.createElement('div')
    const SLIDER_ELEMENT_CONTENT = document.createElement('div')

    SLIDER_ELEMENT.className = 'parvus__slide'
    SLIDER_ELEMENT.style.position = 'absolute'
    SLIDER_ELEMENT.style.left = `${GROUPS[newGroup].x * 100}%`

    // Hide slide
    SLIDER_ELEMENT.setAttribute('aria-hidden', 'true')

    createImage(el, SLIDER_ELEMENT_CONTENT)

    // Add slide content container to slider element
    SLIDER_ELEMENT.appendChild(SLIDER_ELEMENT_CONTENT)

    // Add slider element to slider
    GROUPS[newGroup].slider.appendChild(SLIDER_ELEMENT)
    GROUPS[newGroup].sliderElements.push(SLIDER_ELEMENT)

    ++GROUPS[newGroup].x
  }

  /**
   * Open Parvus
   *
   * @param {number} index - Index to load
   */
  const open = function open (index) {
    if (isOpen()) {
      throw new Error('Ups, I\'m aleady open.')
    }

    updateConfig()

    // Save user’s focus
    lastFocus = document.activeElement

    // Use `history.pushState()` to make sure the 'Back' button behavior
    // that aligns with the user's expectations
    const STATE_OBJ = {
      parvus: 'close'
    }

    const URL = window.location.href

    history.pushState(STATE_OBJ, 'Image', URL)

    // Set current index
    GROUPS[activeGroup].currentIndex = index

    bindEvents()

    // Hide all non lightbox elements from assistive technology
    const nonLightboxEls = document.querySelectorAll('body > *:not([aria-hidden="true"])')

    nonLightboxEls.forEach(nonLightboxEl => {
      nonLightboxEl.setAttribute('aria-hidden', 'true')
      nonLightboxEl.classList.add('parvus-hidden')
    })

    lightbox.classList.add('parvus--is-opening')

    // Show lightbox
    lightbox.setAttribute('aria-hidden', 'false')

    setFocusToFirstItem()

    requestAnimationFrame(() => {
      lightboxOverlay.style.opacity = 1
      lightboxOverlay.style.transition = `opacity ${transitionDuration}ms ${config.transitionTimingFunction}`
    })

    lightboxOverlay.addEventListener('transitionend', () => {
      lightbox.classList.remove('parvus--is-opening')
    },
    {
      once: true
    })

    // Show slider
    GROUPS[activeGroup].slider.setAttribute('aria-hidden', 'false')

    // Load slide
    loadSlide(GROUPS[activeGroup].currentIndex)

    updateOffset()

    // Load image
    loadImage(GROUPS[activeGroup].currentIndex)

    // Preload previous and next slide
    preload(GROUPS[activeGroup].currentIndex + 1)
    preload(GROUPS[activeGroup].currentIndex - 1)

    // Create and dispatch a new event
    const OPEN_EVENT = new CustomEvent('open')

    lightbox.dispatchEvent(OPEN_EVENT)
  }

  /**
   * Close Parvus
   *
   */
  const close = function close () {
    if (!isOpen()) {
      throw new Error('Ups, I\'m already closed.')
    }

    unbindEvents()

    clearDrag()

    // Remove entry in browser history
    if (history.state !== null) {
      if (history.state.parvus === 'close') {
        history.back()
      }
    }

    // Create and dispatch a new event
    const CLOSE_EVENT = new CustomEvent('close')

    lightbox.dispatchEvent(CLOSE_EVENT)

    // Show all non lightbox elements from assistive technology
    const nonLightboxEls = document.querySelectorAll('.parvus-hidden')

    nonLightboxEls.forEach(nonLightboxEl => {
      nonLightboxEl.removeAttribute('aria-hidden')
      nonLightboxEl.classList.remove('parvus-hidden')
    })

    lightbox.classList.add('parvus--is-closing')

    requestAnimationFrame(() => {


      lightboxOverlay.style.opacity = 0
      lightboxOverlay.style.transition = `opacity ${transitionDuration}ms ${config.transitionTimingFunction}`
    })

    lightboxOverlay.addEventListener('transitionend', () => {
      // Don't forget to cleanup our current element
      leaveSlide(GROUPS[activeGroup].currentIndex)

      // Reenable the user’s focus
      lastFocus.focus({
        preventScroll: true
      })

      lightbox.classList.remove('parvus--is-closing')

      // Hide slider
      GROUPS[activeGroup].slider.setAttribute('aria-hidden', 'true')

      // Hide lightbox
      lightbox.setAttribute('aria-hidden', 'true')
    },
    {
      once: true
    })
  }

  /**
   * Preload slide
   *
   * @param {number} index - Index to preload
   */
  const preload = function preload (index) {
    if (GROUPS[activeGroup].sliderElements[index] === undefined) {
      return
    }

    // TODO
  }

  /**
   * Load slide
   * Will be called when opening the lightbox or moving index
   *
   * @param {number} index - Index to load
   */
  const loadSlide = function loadSlide (index) {
    if (GROUPS[activeGroup].sliderElements[index] === undefined) {
      return
    }

    // Add active slide class
    GROUPS[activeGroup].sliderElements[index].classList.add('parvus__slide--is-active')
    GROUPS[activeGroup].sliderElements[index].setAttribute('aria-hidden', 'false')
  }

  /**
   * Load Image
   *
   * @param {number} index - Index to load
   */
  const createImage = function createImage (el, container) {
    const FIGURE = document.createElement('figure')
    const FIGURECAPTION = document.createElement('figurecaption')
    const THUMBNAIL = el.querySelector('img')

    // Create new image
    lightboxImage = document.createElement('img')

    if (el.tagName === 'A') {
      lightboxImage.setAttribute('data-src', el.href)

      if (THUMBNAIL) {
        lightboxImage.alt = THUMBNAIL.alt || ''
      } else {
        lightboxImage.alt = el.getAttribute('data-alt') || ''
      }
    } else {
      lightboxImage.alt = el.getAttribute('data-alt') || ''
      lightboxImage.setAttribute('data-src', el.getAttribute('data-target'))
    }

    FIGURE.appendChild(lightboxImage)

    // Add caption if available
    if (el.hasAttribute('data-caption') && el.getAttribute('data-caption') !== '') {
      FIGURECAPTION.innerHTML = el.getAttribute('data-caption')

      FIGURE.appendChild(FIGURECAPTION)
    }

    container.appendChild(FIGURE)
  }

  /**
   * Load Image
   *
   * @param {number} index - Index to load
   */
  const loadImage = function loadImage (index) {
    const IMAGE_CONTAINER = GROUPS[activeGroup].sliderElements[index]
    const IMAGE = IMAGE_CONTAINER.querySelector('img')
    const THUMBNAIL = GROUPS[activeGroup].gallery[index]
    const THUMBNAIL_SIZE = THUMBNAIL.getBoundingClientRect()
    const LOADING_INDICATOR = document.createElement('div')

    console.log(THUMBNAIL)

    if (!IMAGE.hasAttribute('data-src')) {
      return
    }

    IMAGE.style.opacity = 0

    // Create loading indicator
    LOADING_INDICATOR.className = 'parvus__loader'
    LOADING_INDICATOR.setAttribute('role', 'progressbar')
    LOADING_INDICATOR.setAttribute('aria-label', config.i18n[config.lang].lightboxLOADING_INDICATORLabel)

    // Add loading indicator to container
    IMAGE_CONTAINER.appendChild(LOADING_INDICATOR)

    IMAGE.onload = () => {
      const IMAGE_SIZE = IMAGE.getBoundingClientRect()

      IMAGE_CONTAINER.removeChild(LOADING_INDICATOR)

      widthDifference = THUMBNAIL_SIZE.width / IMAGE_SIZE.width
      heightDifference = THUMBNAIL_SIZE.height / IMAGE_SIZE.height
      xDifference = THUMBNAIL_SIZE.left - IMAGE_SIZE.left
      yDifference = THUMBNAIL_SIZE.top - IMAGE_SIZE.top

      // Set image width and height
      IMAGE.setAttribute('width', IMAGE.naturalWidth)
      IMAGE.setAttribute('height', IMAGE.naturalHeight)

      requestAnimationFrame(() => {
        IMAGE.style.transform = `translate(${xDifference}px, ${yDifference}px) scale(${widthDifference}, ${heightDifference})`
        IMAGE.style.transition = 'transform 0s, opacity 0s'

        // Animate the difference reversal on the next tick
        requestAnimationFrame(() => {
          IMAGE.style.transform = ''
          IMAGE.style.opacity = 1
          IMAGE.style.transition = `transform ${transitionDuration}ms ${config.transitionTimingFunction}, opacity ${transitionDuration}ms ${config.transitionTimingFunction}`
        })
      })
    }

    IMAGE.setAttribute('src', IMAGE.getAttribute('data-src'))
    IMAGE.removeAttribute('data-src')
  }

  /**
   * Leave slide
   * Will be called before moving index
   *
   * @param {number} index - Index to leave
   */
  const leaveSlide = function leaveSlide (index) {
    if (GROUPS[activeGroup].sliderElements[index] === undefined) {
      return
    }

    // Remove active slide class
    GROUPS[activeGroup].sliderElements[index].classList.remove('parvus__slide--is-active')
    GROUPS[activeGroup].sliderElements[index].setAttribute('aria-hidden', 'true')
  }

  /**
   * Update offset
   *
   */
  const updateOffset = function updateOffset () {
    activeGroup = activeGroup !== null ? activeGroup : newGroup

    offset = -GROUPS[activeGroup].currentIndex * lightbox.offsetWidth

    GROUPS[activeGroup].slider.style.transform = `translate3d(${offset}px, 0, 0)`
    offsetTmp = offset
  }

  /**
   * Clear drag after touchend event
   *
   */
  const clearDrag = function clearDrag () {
    lightboxOverlay.style.opacity = 1
    GROUPS[activeGroup].slider.style.transform = 'translate3d(0, 0, 0)'

    lightbox.classList.remove('parvus--is-closing')

    drag = {
      startY: 0,
      endY: 0
    }
  }

  /**
   * Recalculate drag / swipe event
   *
   */
  const updateAfterDrag = function updateAfterDrag () {
    const MOVEMENT_X = drag.endX - drag.startX
    const MOVEMENT_Y = drag.endY - drag.startY
    const MOVEMENT_X_DISTANCE = Math.abs(MOVEMENT_X)
    const MOVEMENT_Y_DISTANCE = Math.abs(MOVEMENT_Y)

    if (MOVEMENT_X > 0 && MOVEMENT_X_DISTANCE > config.threshold && GROUPS[activeGroup].currentIndex > 0) {
      //previous()
    } else if (MOVEMENT_X < 0 && MOVEMENT_X_DISTANCE > config.threshold && GROUPS[activeGroup].currentIndex !== GROUPS[activeGroup].elementsLength - 1) {
      //next()
    } else if (MOVEMENT_Y_DISTANCE > config.threshold && config.swipeClose) {
      close()
    } else {
      updateOffset()
    }
  }

  /**
   * Update Config
   *
   */
  const updateConfig = function updateConfig () {
    if ((config.swipeClose && !GROUPS[activeGroup].slider.classList.contains('parvus__slider--is-draggable')) || (GROUPS[activeGroup].elementsLength > 1 && !GROUPS[activeGroup].slider.classList.contains('parvus__slider--is-draggable'))) {
      GROUPS[activeGroup].slider.classList.add('parvus__slider--is-draggable')
    }

    /* Hide buttons if necessary
    if (!config.nav || GROUPS[activeGroup].elementsLength === 1 || (config.nav === 'auto' && isTouchDevice())) {
      prevButton.setAttribute('aria-hidden', 'true')
      prevButton.disabled = true
      nextButton.setAttribute('aria-hidden', 'true')
      nextButton.disabled = true
    } else {
      prevButton.setAttribute('aria-hidden', 'false')
      prevButton.disabled = false
      nextButton.setAttribute('aria-hidden', 'false')
      nextButton.disabled = false
    }*/
  }

  /**
   * Click event handler to trigger Parvus
   *
   */
  const triggerParvus = function triggerParvus (event) {
    event.preventDefault()

    activeGroup = getGroup(this)

    open(GROUPS[activeGroup].gallery.indexOf(this))
  }

  /**
   * Click event handler
   *
   */
  const clickHandler = function clickHandler (event) {
    if (event.target === closeButton || (!isDraggingY && !isDraggingX && event.target.classList.contains('parvus__slide') && config.docClose)) {
      close()
    }

    event.stopPropagation()
  }

  /**
   * Get the focusable children of the given element
   *
   * @return {Array<Element>}
   */
  const getFocusableChildren = function getFocusableChildren () {
    return Array.prototype.slice.call(lightbox.querySelectorAll(`${FOCUSABLE_ELEMENTS.join(', ')}`)).filter(function (child) {
      return !!(
        child.offsetWidth ||
        child.offsetHeight ||
        child.getClientRects().length
      )
    })
  }

  /**
   * Set focus to first item
   *
   */
  const setFocusToFirstItem = function setFocusToFirstItem () {
    const FOCUSABLE_CHILDREN = getFocusableChildren()

    FOCUSABLE_CHILDREN[0].focus()
  }

  /**
   * Keydown event handler
   *
   */
  const keydownHandler = function keydownHandler (event) {
    const FOCUSABLE_CHILDREN = getFocusableChildren()
    const FOCUSED_ITEM_INDEX = FOCUSABLE_CHILDREN.indexOf(document.activeElement)

    if (event.code === 'Tab') {
      // If the SHIFT key is being pressed while tabbing (moving backwards) and
      // the currently focused item is the first one, move the focus to the last
      // focusable item
      if (event.shiftKey && FOCUSED_ITEM_INDEX === 0) {
        FOCUSABLE_CHILDREN[FOCUSABLE_CHILDREN.length - 1].focus()
        event.preventDefault()
        // If the SHIFT key is not being pressed (moving forwards) and the currently
        // focused item is the last one, move the focus to the first focusable item
      } else if (!event.shiftKey && FOCUSED_ITEM_INDEX === FOCUSABLE_CHILDREN.length - 1) {
        FOCUSABLE_CHILDREN[0].focus()
        event.preventDefault()
      }
    } else if (event.code === 'Escape') {
      // `ESC` Key: Close Parvus
      event.preventDefault()
      close()
    }
  }

  /**
   * Wheel event handler
   *
   */
  const wheelHandler = function wheelHandler () {
    close()
  }

  /**
   * Mousedown event handler
   *
   */
  const mousedownHandler = function mousedownHandler (event) {
    event.preventDefault()
    event.stopPropagation()

    isDraggingX = false
    isDraggingY = false

    pointerDown = true

    drag.startX = event.pageX
    drag.startY = event.pageY

    GROUPS[activeGroup].slider.classList.add('parvus__slider--is-dragging')
  }

  /**
   * Mousemove event handler
   *
   */
  const mousemoveHandler = function mousemoveHandler (event) {
    event.preventDefault()

    if (pointerDown) {
      drag.endX = event.pageX
      drag.endY = event.pageY

      doSwipe()
    }
  }

  /**
   * Mouseup event handler
   *
   */
  const mouseupHandler = function mouseupHandler (event) {
    event.stopPropagation()

    pointerDown = false

    GROUPS[activeGroup].slider.classList.remove('parvus__slider--is-dragging')

    if (drag.endX) {
      updateAfterDrag()
    }

    clearDrag()
  }

  /**
   * Touchstart event handler
   *
   */
  const touchstartHandler = function touchstartHandler (event) {
    event.stopPropagation()

    isDraggingX = false
    isDraggingY = false

    pointerDown = true

    drag.startX = event.touches[0].pageX
    drag.startY = event.touches[0].pageY

    GROUPS[activeGroup].slider.classList.add('parvus__slider--is-dragging')
  }

  /**
   * Touchmove event handler
   *
   */
  const touchmoveHandler = function touchmoveHandler (event) {
    event.stopPropagation()

    if (pointerDown) {
      event.preventDefault()

      drag.endX = event.touches[0].pageX
      drag.endY = event.touches[0].pageY

      doSwipe()
    }
  }

  /**
   * Touchend event handler
   *
   */
  const touchendHandler = function touchendHandler (event) {
    event.stopPropagation()

    pointerDown = false

    GROUPS[activeGroup].slider.classList.remove('parvus__slider--is-dragging')

    if (drag.endX) {
      updateAfterDrag()
    }

    clearDrag()
  }

  /**
   * Decide whether to do vertical swipe
   *
   */
  const doSwipe = function doSwipe () {
    const MOVEMENT_X = drag.startX - drag.endX
    const MOVEMENT_Y = drag.endY - drag.startY

    if (Math.abs(MOVEMENT_X) > 0 && !isDraggingY && GROUPS[activeGroup].elementsLength > 1) {
      // Horizontal swipe
      GROUPS[activeGroup].slider.style.transform = `translate3d(${offsetTmp - Math.round(MOVEMENT_X)}px, 0, 0)`

      isDraggingX = true
      isDraggingY = false
    } else if (Math.abs(MOVEMENT_Y) > 0 && !isDraggingX && config.swipeClose) {
      // Vertical swipe

      if (config.swipeClose && !isReducedMotion) {
        const MOVEMENT_Y_DISTANCE = Math.abs(MOVEMENT_Y)

        if (MOVEMENT_Y_DISTANCE <= 100) {
          lightboxOverlayOpacity = 1 - (MOVEMENT_Y_DISTANCE / 100)
        }

        lightbox.classList.add('parvus--is-closing')
        lightboxOverlay.style.opacity = lightboxOverlayOpacity

        GROUPS[activeGroup].slider.style.transform = `translate3d(0, ${Math.round(MOVEMENT_Y)}px, 0)`

        isDraggingX = false
        isDraggingY = true
      }
    }
  }

  /**
   * Bind events
   *
   */
  const bindEvents = function bindEvents () {
    BROWSER_WINDOW.addEventListener('keydown', keydownHandler)

    if (config.scrollClose) {
      BROWSER_WINDOW.addEventListener('wheel', wheelHandler)
    }

    // Popstate event
    BROWSER_WINDOW.addEventListener('popstate', close)

    // Click event
    lightbox.addEventListener('click', clickHandler)

    if (isTouchDevice()) {
      // Touch events
      lightbox.addEventListener('touchstart', touchstartHandler)
      lightbox.addEventListener('touchmove', touchmoveHandler)
      lightbox.addEventListener('touchend', touchendHandler)
    }

    // Mouse events
    lightbox.addEventListener('mousedown', mousedownHandler)
    lightbox.addEventListener('mouseup', mouseupHandler)
    lightbox.addEventListener('mousemove', mousemoveHandler)
  }

  /**
   * Unbind events
   *
   */
  const unbindEvents = function unbindEvents () {
    BROWSER_WINDOW.removeEventListener('keydown', keydownHandler)

    if (config.scrollClose) {
      BROWSER_WINDOW.removeEventListener('wheel', wheelHandler)
    }

    // Popstate event
    BROWSER_WINDOW.removeEventListener('popstate', close)

    // Click event
    lightbox.removeEventListener('click', clickHandler)

    if (isTouchDevice()) {
      // Touch events
      lightbox.removeEventListener('touchstart', touchstartHandler)
      lightbox.removeEventListener('touchmove', touchmoveHandler)
      lightbox.removeEventListener('touchend', touchendHandler)
    }

    // Mouse events
    lightbox.removeEventListener('mousedown', mousedownHandler)
    lightbox.removeEventListener('mouseup', mouseupHandler)
    lightbox.removeEventListener('mousemove', mousemoveHandler)
  }

  /**
   * Destroy Parvus
   *
   */
  const destroy = function destroy () {
    if (isOpen()) {
      close()
    }

    const LIGHTBOX_TRIGGER_ELS = document.querySelectorAll('.parvus-zoom')

    LIGHTBOX_TRIGGER_ELS.forEach(lightboxTriggerEl => {
      remove(lightboxTriggerEl)
    })

    // Create and dispatch a new event
    const DESTROY_EVENT = new CustomEvent('destroy')

    lightbox.dispatchEvent(DESTROY_EVENT)
  }

  /**
   * Check if Parvus is open
   *
   */
  const isOpen = function isOpen () {
    return lightbox.getAttribute('aria-hidden') === 'false'
  }

  /**
   * Detect whether device is touch capable
   *
   */
  const isTouchDevice = function isTouchDevice () {
    return 'ontouchstart' in window
  }

  /**
   * Bind event
   * @param {String} eventName
   * @param {function} callback - callback to call
   *
   */
  const on = function on (eventName, callback) {
    lightbox.addEventListener(eventName, callback)
  }

  /**
   * Unbind event
   * @param {String} eventName
   * @param {function} callback - callback to call
   *
   */
  const off = function off (eventName, callback) {
    lightbox.removeEventListener(eventName, callback)
  }

  init(userOptions)

  Parvus.init = init
  Parvus.open = open
  Parvus.close = close
  Parvus.add = add
  Parvus.remove = remove
  Parvus.destroy = destroy
  Parvus.isOpen = isOpen
  Parvus.on = on
  Parvus.off = off

  return Parvus
}
