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
  let config = {}
  let lightbox = null
  let lightboxOverlay = null
  let lightboxOverlayOpacity = 0
  let lightboxImageContainer = null
  let lightboxImage = null
  let closeButton = null
  let widthDifference
  let heightDifference
  let xDifference
  let yDifference
  let loadingIndicator = null
  let drag = {}
  let isDraggingY = false
  let pointerDown = false
  let lastFocus = null
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
      }
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
   * Add element
   *
   * @param {HTMLElement} el - Element to add
   */
  const add = function add (el) {
    if (!el.classList.contains('parvus-zoom')) {
      el.classList.add('parvus-zoom')

      const lightboxIndicatorIcon = document.createElement('div')

      lightboxIndicatorIcon.className = 'parvus-zoom__indicator'
      lightboxIndicatorIcon.innerHTML = config.lightboxIndicatorIcon

      el.appendChild(lightboxIndicatorIcon)

      // Bind click event handler
      el.addEventListener('click', triggerParvus)
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

    // Create the lightbox image container
    lightboxImageContainer = document.createElement('div')
    lightboxImageContainer.classList.add('parvus__image')

    // Add lightbox image container to lightbox container
    lightbox.appendChild(lightboxImageContainer)

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
   * Open Parvus
   *
   * @param {HTMLElement} el - Element to open
   */
  const open = function open (el) {
    if (isOpen()) {
      throw new Error('Ups, I\'m aleady open.')
    }

    // Save user’s focus
    lastFocus = document.activeElement

    // Use `history.pushState()` to make sure the 'Back' button behavior
    // that aligns with the user's expectations
    const STATE_OBJ = {
      parvus: 'close'
    }

    const URL = window.location.href

    history.pushState(STATE_OBJ, 'Image', URL)

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

    // Load image
    load(el)

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
      lightboxImage.style.transform = `translate(${xDifference}px, ${yDifference}px) scale(${widthDifference}, ${heightDifference})`
      lightboxImage.style.transition = `transform ${transitionDuration}ms ${config.transitionTimingFunction}`

      lightboxOverlay.style.opacity = 0
      lightboxOverlay.style.transition = `opacity ${transitionDuration}ms ${config.transitionTimingFunction}`
    })

    lightboxImage.addEventListener('transitionend', () => {
      // Reenable the user’s focus
      lastFocus.focus({
        preventScroll: true
      })

      lightbox.classList.remove('parvus--is-closing')

      // Hide lightbox
      lightbox.setAttribute('aria-hidden', 'true')

      lightboxImage.remove()
    },
    {
      once: true
    })
  }

  /**
   * Load Image
   *
   * @param {number} index - Index to load
   */
  const load = function load (el) {
    if (!el.href.match(/\.(png|jpe?g|gif|bmp|webp|svg)(\?.*)?$/i)) {
      throw new Error('Please use an image file ending on the linked thumbnail image. Supported file endings: png|jpe?g|gif|bmp|webp|svg')
    }

    // Create loading indicator
    loadingIndicator = document.createElement('div')
    loadingIndicator.className = 'parvus__loader'
    loadingIndicator.setAttribute('role', 'progressbar')
    loadingIndicator.setAttribute('aria-label', config.i18n[config.lang].lightboxLoadingIndicatorLabel)

    // Add loading indicator to container
    lightbox.appendChild(loadingIndicator)

    lightboxImage = document.createElement('img')

    const THUMBNAIL = el.querySelector('img')
    const THUMBNAIL_SIZE = el.getBoundingClientRect()

    lightboxImage.alt = THUMBNAIL.alt || ''
    lightboxImage.src = el.href
    lightboxImageContainer.style.opacity = '0'

    lightboxImage.style.opacity = '0'

    lightboxImageContainer.appendChild(lightboxImage)

    lightboxImage.onload = () => {
      lightbox.removeChild(loadingIndicator)

      const LIGHTBOX_IMAGE_SIZE = lightboxImage.getBoundingClientRect()

      widthDifference = THUMBNAIL_SIZE.width / LIGHTBOX_IMAGE_SIZE.width
      heightDifference = THUMBNAIL_SIZE.height / LIGHTBOX_IMAGE_SIZE.height
      xDifference = THUMBNAIL_SIZE.left - LIGHTBOX_IMAGE_SIZE.left
      yDifference = THUMBNAIL_SIZE.top - LIGHTBOX_IMAGE_SIZE.top

      lightboxImageContainer.style.opacity = 1

      // Set image width and height
      lightboxImage.setAttribute('width', lightboxImage.naturalWidth)
      lightboxImage.setAttribute('height', lightboxImage.naturalHeight)

      requestAnimationFrame(() => {
        lightboxImage.style.transform = `translate(${xDifference}px, ${yDifference}px) scale(${widthDifference}, ${heightDifference})`
        lightboxImage.style.transition = 'transform 0s, opacity 0s'

        // Animate the difference reversal on the next tick
        requestAnimationFrame(() => {
          lightboxImage.style.transform = ''
          lightboxImage.style.opacity = 1
          lightboxImage.style.transition = `transform ${transitionDuration}ms ${config.transitionTimingFunction}, opacity ${transitionDuration}ms ${config.transitionTimingFunction}`

          lightboxOverlay.style.opacity = 1
          lightboxOverlay.style.transition = `opacity ${transitionDuration}ms ${config.transitionTimingFunction}`
        })
      })

      lightboxOverlay.addEventListener('transitionend', () => {
        lightbox.classList.remove('parvus--is-opening')
      },
      {
        once: true
      })
    }
  }

  /**
   * Clear drag after touchend event
   *
   */
  const clearDrag = function clearDrag () {
    lightboxOverlay.style.opacity = 1
    lightboxImageContainer.style.transform = 'translate3d(0, 0, 0)'

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
    const MOVEMENT_Y = drag.endY - drag.startY
    const MOVEMENT_Y_DISTANCE = Math.abs(MOVEMENT_Y)

    if (MOVEMENT_Y_DISTANCE > config.threshold && config.swipeClose) {
      close()
    }
  }

  /**
   * Click event handler to trigger Parvus
   *
   */
  const triggerParvus = function triggerParvus (event) {
    event.preventDefault()

    open(this)
  }

  /**
   * Click event handler
   *
   */
  const clickHandler = function clickHandler (event) {
    if (event.target === closeButton || (!isDraggingY && event.target.classList.contains('parvus__overlay') && config.docClose)) {
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
   * Touchstart event handler
   *
   */
  const touchstartHandler = function touchstartHandler (event) {
    event.stopPropagation()

    isDraggingY = false

    pointerDown = true

    drag.startY = event.touches[0].pageY

    lightboxImageContainer.classList.add('parvus__image--is-dragging')
  }

  /**
   * Touchmove event handler
   *
   */
  const touchmoveHandler = function touchmoveHandler (event) {
    event.stopPropagation()

    if (pointerDown) {
      event.preventDefault()

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

    lightboxImageContainer.classList.remove('parvus__image--is-dragging')

    if (drag.endY) {
      updateAfterDrag()
    }

    clearDrag()
  }

  /**
   * Decide whether to do vertical swipe
   *
   */
  const doSwipe = function doSwipe () {
    if (config.swipeClose && !isReducedMotion) {
      const MOVEMENT_Y = drag.endY - drag.startY
      const MOVEMENT_Y_DISTANCE = Math.abs(MOVEMENT_Y)

      if (MOVEMENT_Y_DISTANCE <= 100) {
        lightboxOverlayOpacity = 1 - (MOVEMENT_Y_DISTANCE / 100)
      }

      lightbox.classList.add('parvus--is-closing')
      lightboxOverlay.style.opacity = lightboxOverlayOpacity

      lightboxImageContainer.style.transform = `translate3d(0, ${Math.round(MOVEMENT_Y)}px, 0)`

      isDraggingY = true
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
