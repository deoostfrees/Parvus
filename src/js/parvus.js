// Helper modules
import { getScrollbarWidth } from './helpers/dom.js'

// Core modules
import { mergeOptions } from './core/config.js'
import { ParvusState } from './core/state.js'
import { dispatchCustomEvent, on as addEventListener, off as removeEventListener } from './core/events.js'
import { updateOffset, loadSlide, leaveSlide, preload } from './core/navigation.js'
import { reducedMotionCheck, getGroup } from './core/utils.js'

// UI modules
import { createLightbox, createSlider, createSlide, updateCounter, updateAttributes, updateSliderNavigationStatus } from './ui/lightbox.js'
import { addZoomIndicator, removeZoomIndicator } from './ui/zoom-indicator.js'

// Handler modules
import { createKeydownHandler } from './handlers/keyboard.js'
import { createPointerdownHandler, createPointermoveHandler, createPointerupHandler, createClickHandler } from './handlers/pointer.js'
import { resetZoom, pinchZoom, doSwipe, updateAfterDrag } from './handlers/gestures.js'
import { createImage, loadImage, createResizeHandler } from './handlers/images.js'

/**
 * Parvus Lightbox
 *
 * @param {Object} userOptions - User configuration options
 * @returns {Object} Parvus instance
 */
export default function Parvus (userOptions) {
  const BROWSER_WINDOW = window
  const STATE = new ParvusState()
  const MOTIONQUERY = BROWSER_WINDOW.matchMedia('(prefers-reduced-motion)')

  // Event handlers will be created after actions are defined
  let keydownHandler, clickHandler, pointerdownHandler, pointermoveHandler, pointerupHandler, resizeHandler

  /**
   * Click event handler to trigger Parvus
   *
   * @param {Event} event - The click event object
   */
  const triggerParvus = function triggerParvus (event) {
    event.preventDefault()

    open(this)
  }

  /**
   * Add an element
   *
   * @param {HTMLElement} el - The element to be added
   */
  const add = (el) => {
    // Check element type and attributes
    const IS_VALID_LINK = el.tagName === 'A' && el.hasAttribute('href')
    const IS_VALID_BUTTON = el.tagName === 'BUTTON' && el.hasAttribute('data-target')

    if (!IS_VALID_LINK && !IS_VALID_BUTTON) {
      throw new Error('Use a link with the \'href\' attribute or a button with the \'data-target\' attribute. Both attributes must contain a path to the image file.')
    }

    // Check if the lightbox already exists
    if (!STATE.lightbox) {
      createLightbox(STATE)
    }

    STATE.newGroup = getGroup(STATE, el)

    if (!STATE.GROUPS[STATE.newGroup]) {
      STATE.GROUPS[STATE.newGroup] = structuredClone(STATE.GROUP_ATTRIBUTES)
    }

    if (STATE.GROUPS[STATE.newGroup].triggerElements.includes(el)) {
      throw new Error('Ups, element already added.')
    }

    STATE.GROUPS[STATE.newGroup].triggerElements.push(el)

    if (STATE.config.zoomIndicator) {
      addZoomIndicator(el, STATE.config)
    }

    el.classList.add('parvus-trigger')
    el.addEventListener('click', triggerParvus)

    if (isOpen() && STATE.newGroup === STATE.activeGroup) {
      const EL_INDEX = STATE.GROUPS[STATE.newGroup].triggerElements.indexOf(el)

      createSlide(STATE, EL_INDEX)
      createImage(STATE, el, EL_INDEX, () => {
        loadImage(STATE, EL_INDEX)
      })
      updateAttributes(STATE)
      updateSliderNavigationStatus(STATE)
      updateCounter(STATE)
    }
  }

  /**
   * Remove an element
   *
   * @param {HTMLElement} el - The element to be removed
   */
  const remove = (el) => {
    if (!el || !el.hasAttribute('data-group')) {
      return
    }

    const EL_GROUP = getGroup(STATE, el)
    const GROUP = STATE.GROUPS[EL_GROUP]

    // Check if element exists
    if (!GROUP) {
      return
    }

    const EL_INDEX = GROUP.triggerElements.indexOf(el)

    if (EL_INDEX === -1) {
      return
    }

    const IS_CURRENT_EL = isOpen() && EL_GROUP === STATE.activeGroup && EL_INDEX === STATE.currentIndex

    // Remove group data
    if (GROUP.contentElements[EL_INDEX]) {
      const content = GROUP.contentElements[EL_INDEX]

      if (content.tagName === 'IMG') {
        content.src = ''
        content.srcset = ''
      }
    }

    // Remove DOM element
    const sliderElement = GROUP.sliderElements[EL_INDEX]

    if (sliderElement && sliderElement.parentNode) {
      sliderElement.parentNode.removeChild(sliderElement)
    }

    // Remove all array elements
    GROUP.triggerElements.splice(EL_INDEX, 1)
    GROUP.sliderElements.splice(EL_INDEX, 1)
    GROUP.contentElements.splice(EL_INDEX, 1)

    if (STATE.config.zoomIndicator) {
      removeZoomIndicator(el)
    }

    if (isOpen() && EL_GROUP === STATE.activeGroup) {
      if (IS_CURRENT_EL) {
        if (GROUP.triggerElements.length === 0) {
          close()
        } else if (STATE.currentIndex >= GROUP.triggerElements.length) {
          select(GROUP.triggerElements.length - 1)
        } else {
          updateAttributes(STATE)
          updateSliderNavigationStatus(STATE)
          updateCounter(STATE)
        }
      } else if (EL_INDEX < STATE.currentIndex) {
        STATE.currentIndex--
        updateAttributes(STATE)
        updateSliderNavigationStatus(STATE)
        updateCounter(STATE)
      } else {
        updateAttributes(STATE)
        updateSliderNavigationStatus(STATE)
        updateCounter(STATE)
      }
    }

    // Unbind click event handler
    el.removeEventListener('click', triggerParvus)

    el.classList.remove('parvus-trigger')
  }

  /**
   * Open Parvus
   *
   * @param {HTMLElement} el
   */
  const open = (el) => {
    if (!STATE.lightbox || !el || !el.classList.contains('parvus-trigger') || isOpen()) {
      return
    }

    STATE.activeGroup = getGroup(STATE, el)

    const GROUP = STATE.GROUPS[STATE.activeGroup]
    const EL_INDEX = GROUP.triggerElements.indexOf(el)

    if (EL_INDEX === -1) {
      throw new Error('Ups, element not found in group.')
    }

    STATE.currentIndex = EL_INDEX

    history.pushState({ parvus: 'close' }, 'Image', window.location.href)

    bindEvents()

    if (STATE.config.hideScrollbar) {
      document.body.style.marginInlineEnd = `${getScrollbarWidth()}px`
      document.body.style.overflow = 'hidden'
    }

    STATE.lightbox.classList.add('parvus--is-opening')
    STATE.lightbox.showModal()

    createSlider(STATE)
    createSlide(STATE, STATE.currentIndex)

    updateOffset(STATE)
    updateAttributes(STATE)
    updateSliderNavigationStatus(STATE)
    updateCounter(STATE)

    loadSlide(STATE, STATE.currentIndex)

    createImage(STATE, el, STATE.currentIndex, () => {
      loadImage(STATE, STATE.currentIndex, true)
      STATE.lightbox.classList.remove('parvus--is-opening')

      GROUP.slider.classList.add('parvus__slider--animate')
    })

    preload(STATE, createSlide, createImage, loadImage, STATE.currentIndex + 1)
    preload(STATE, createSlide, createImage, loadImage, STATE.currentIndex - 1)

    // Create and dispatch a new event
    dispatchCustomEvent(STATE.lightbox, 'open')
  }

  /**
   * Close Parvus
   */
  const close = () => {
    if (!isOpen()) {
      return
    }

    const IMAGE = STATE.GROUPS[STATE.activeGroup].contentElements[STATE.currentIndex]
    const THUMBNAIL = STATE.GROUPS[STATE.activeGroup].triggerElements[STATE.currentIndex]

    unbindEvents()
    STATE.clearDrag()

    if (history.state?.parvus === 'close') {
      history.back()
    }

    STATE.lightbox.classList.add('parvus--is-closing')

    const transitionendHandler = () => {
      // Reset the image zoom (if ESC was pressed or went back in the browser history)
      // after the ViewTransition (otherwise it looks bad)
      if (STATE.isPinching) {
        resetZoom(STATE, IMAGE)
      }

      leaveSlide(STATE, STATE.currentIndex)

      STATE.lightbox.close()
      STATE.lightbox.classList.remove('parvus--is-closing')
      STATE.lightbox.classList.remove('parvus--is-vertical-closing')

      STATE.GROUPS[STATE.activeGroup].slider.remove()
      STATE.GROUPS[STATE.activeGroup].slider = null
      STATE.GROUPS[STATE.activeGroup].sliderElements = []
      STATE.GROUPS[STATE.activeGroup].contentElements = []

      STATE.counter.removeAttribute('aria-hidden')

      STATE.previousButton.removeAttribute('aria-hidden')
      STATE.previousButton.removeAttribute('aria-disabled')

      STATE.nextButton.removeAttribute('aria-hidden')
      STATE.nextButton.removeAttribute('aria-disabled')

      if (STATE.config.hideScrollbar) {
        document.body.style.marginInlineEnd = ''
        document.body.style.overflow = ''
      }
    }

    if (IMAGE && IMAGE.tagName === 'IMG') {
      if (document.startViewTransition) {
        IMAGE.style.viewTransitionName = 'lightboximage'

        const transition = document.startViewTransition(() => {
          IMAGE.style.opacity = '0'
          IMAGE.style.viewTransitionName = null

          THUMBNAIL.style.viewTransitionName = 'lightboximage'
        })

        transition.finished.finally(() => {
          transitionendHandler()

          THUMBNAIL.style.viewTransitionName = null
        })
      } else {
        IMAGE.style.opacity = '0'

        requestAnimationFrame(transitionendHandler)
      }
    } else {
      transitionendHandler()
    }
  }

  /**
   * Select a specific slide by index
   *
   * @param {number} index - Index of the slide to select
   */
  const select = (index) => {
    if (!isOpen()) {
      throw new Error("Oops, I'm closed.")
    }

    if (typeof index !== 'number' || isNaN(index)) {
      throw new Error('Oops, no slide specified.')
    }

    const GROUP = STATE.GROUPS[STATE.activeGroup]
    const triggerElements = GROUP.triggerElements

    if (index === STATE.currentIndex) {
      throw new Error(`Oops, slide ${index} is already selected.`)
    }

    if (index < 0 || index >= triggerElements.length) {
      throw new Error(`Oops, I can't find slide ${index}.`)
    }

    const OLD_INDEX = STATE.currentIndex

    STATE.currentIndex = index

    if (GROUP.sliderElements[index]) {
      loadSlide(STATE, index)
    } else {
      createSlide(STATE, index)
      createImage(STATE, GROUP.triggerElements[index], index, () => {
        loadImage(STATE, index)
      })
      loadSlide(STATE, index)
    }

    updateOffset(STATE)
    updateSliderNavigationStatus(STATE)
    updateCounter(STATE)

    if (index < OLD_INDEX) {
      preload(STATE, createSlide, createImage, loadImage, index - 1)
    } else {
      preload(STATE, createSlide, createImage, loadImage, index + 1)
    }

    leaveSlide(STATE, OLD_INDEX)

    // Create and dispatch a new event
    dispatchCustomEvent(STATE.lightbox, 'select')
  }

  /**
   * Select the previous slide
   */
  const previous = () => {
    if (STATE.currentIndex > 0) {
      select(STATE.currentIndex - 1)
    }
  }

  /**
   * Select the next slide
   */
  const next = () => {
    const { triggerElements } = STATE.GROUPS[STATE.activeGroup]

    if (STATE.currentIndex < triggerElements.length - 1) {
      select(STATE.currentIndex + 1)
    }
  }

  /**
   * Bind specified events
   */
  const bindEvents = () => {
    const actions = {
      close,
      previous,
      next,
      updateOffset: () => updateOffset(STATE)
    }

    // Create handlers with state and actions
    keydownHandler = createKeydownHandler(STATE, actions)
    clickHandler = createClickHandler(STATE, actions)
    resizeHandler = createResizeHandler(STATE, () => updateOffset(STATE))

    const updateAfterDragHandler = () => updateAfterDrag(STATE, actions)
    const pinchZoomHandler = (img) => pinchZoom(STATE, img)
    const doSwipeHandler = () => doSwipe(STATE)
    const resetZoomHandler = (img) => resetZoom(STATE, img)

    pointerdownHandler = createPointerdownHandler(STATE)
    pointermoveHandler = createPointermoveHandler(STATE, pinchZoomHandler, doSwipeHandler)
    pointerupHandler = createPointerupHandler(STATE, resetZoomHandler, updateAfterDragHandler)

    BROWSER_WINDOW.addEventListener('keydown', keydownHandler)
    BROWSER_WINDOW.addEventListener('resize', resizeHandler)

    // Popstate event
    BROWSER_WINDOW.addEventListener('popstate', close)

    // Check for any OS level changes to the prefers reduced motion preference
    MOTIONQUERY.addEventListener('change', () => reducedMotionCheck(STATE, MOTIONQUERY))

    // Click event
    STATE.lightbox.addEventListener('click', clickHandler)

    // Pointer events
    STATE.lightbox.addEventListener('pointerdown', pointerdownHandler, { passive: false })
    STATE.lightbox.addEventListener('pointerup', pointerupHandler, { passive: true })
    STATE.lightbox.addEventListener('pointermove', pointermoveHandler, { passive: false })
  }

  /**
   * Unbind specified events
   */
  const unbindEvents = () => {
    BROWSER_WINDOW.removeEventListener('keydown', keydownHandler)
    BROWSER_WINDOW.removeEventListener('resize', resizeHandler)

    // Popstate event
    BROWSER_WINDOW.removeEventListener('popstate', close)

    // Check for any OS level changes to the prefers reduced motion preference
    MOTIONQUERY.removeEventListener('change', () => reducedMotionCheck(STATE, MOTIONQUERY))

    // Click event
    STATE.lightbox.removeEventListener('click', clickHandler)

    // Pointer events
    STATE.lightbox.removeEventListener('pointerdown', pointerdownHandler)
    STATE.lightbox.removeEventListener('pointerup', pointerupHandler)
    STATE.lightbox.removeEventListener('pointermove', pointermoveHandler)
  }

  /**
   * Destroy Parvus
   */
  const destroy = () => {
    if (!STATE.lightbox) {
      return
    }

    if (isOpen()) {
      close()
    }

    // Add setTimeout to ensure all possible close transitions are completed
    setTimeout(() => {
      unbindEvents()

      // Remove all registered event listeners for custom events
      const eventTypes = [
        'open',
        'close',
        'select',
        'destroy'
      ]

      eventTypes.forEach(eventType => {
        const listeners = STATE.lightbox._listeners?.[eventType] || []

        listeners.forEach(listener => {
          STATE.lightbox.removeEventListener(eventType, listener)
        })
      })

      // Remove event listeners from trigger elements
      const LIGHTBOX_TRIGGER_ELS = document.querySelectorAll('.parvus-trigger')

      LIGHTBOX_TRIGGER_ELS.forEach(el => {
        el.removeEventListener('click', triggerParvus)
        el.classList.remove('parvus-trigger')

        if (STATE.config.zoomIndicator) {
          removeZoomIndicator(el)
        }

        if (el.dataset.group) {
          delete el.dataset.group
        }
      })

      // Create and dispatch a new event
      dispatchCustomEvent(STATE.lightbox, 'destroy')

      STATE.lightbox.remove()

      // Remove references
      STATE.lightbox = null
      STATE.lightboxOverlay = null
      STATE.toolbar = null
      STATE.toolbarLeft = null
      STATE.toolbarRight = null
      STATE.controls = null
      STATE.previousButton = null
      STATE.nextButton = null
      STATE.closeButton = null
      STATE.counter = null

      // Remove group data
      Object.keys(STATE.GROUPS).forEach(groupKey => {
        const group = STATE.GROUPS[groupKey]

        if (group && group.contentElements) {
          group.contentElements.forEach(content => {
            if (content && content.tagName === 'IMG') {
              content.src = ''
              content.srcset = ''
            }
          })
        }
        delete STATE.GROUPS[groupKey]
      })

      // Reset variables
      STATE.groupIdCounter = 0
      STATE.newGroup = null
      STATE.activeGroup = null
      STATE.currentIndex = 0
    }, 1000)
  }

  /**
   * Check if Parvus is open
   *
   * @returns {boolean} - True if Parvus is open, otherwise false
   */
  const isOpen = () => {
    return STATE.lightbox?.hasAttribute('open')
  }

  /**
   * Get the current index
   *
   * @returns {number} - The current index
   */
  const getCurrentIndex = () => {
    return STATE.currentIndex
  }

  /**
   * Bind a specific event listener
   *
   * @param {String} eventName - The name of the event to bind
   * @param {Function} callback - The callback function
   */
  const on = (eventName, callback) => {
    addEventListener(STATE.lightbox, eventName, callback)
  }

  /**
   * Unbind a specific event listener
   *
   * @param {String} eventName - The name of the event to unbind
   * @param {Function} callback - The callback function
   */
  const off = (eventName, callback) => {
    removeEventListener(STATE.lightbox, eventName, callback)
  }

  /**
   * Init
   */
  const init = () => {
    // Merge user options into defaults
    STATE.config = mergeOptions(userOptions)

    reducedMotionCheck(STATE, MOTIONQUERY)

    if (STATE.config.gallerySelector !== null) {
      // Get a list of all `gallerySelector` elements within the document
      const GALLERY_ELS = document.querySelectorAll(STATE.config.gallerySelector)

      // Execute a few things once per element
      GALLERY_ELS.forEach((galleryEl, index) => {
        const GALLERY_INDEX = index
        // Get a list of all `selector` elements within the `gallerySelector`
        const LIGHTBOX_TRIGGER_GALLERY_ELS = galleryEl.querySelectorAll(STATE.config.selector)

        // Execute a few things once per element
        LIGHTBOX_TRIGGER_GALLERY_ELS.forEach((lightboxTriggerEl) => {
          lightboxTriggerEl.setAttribute('data-group', `parvus-gallery-${GALLERY_INDEX}`)
          add(lightboxTriggerEl)
        })
      })
    }

    // Get a list of all `selector` elements outside or without the `gallerySelector`
    const LIGHTBOX_TRIGGER_ELS = document.querySelectorAll(`${STATE.config.selector}:not(.parvus-trigger)`)

    LIGHTBOX_TRIGGER_ELS.forEach(add)
  }

  init()

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
  }
}
