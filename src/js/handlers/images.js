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
export const addCaption = (config, containerEl, imageEl, el, index) => {
  const getCaptionData = (triggerEl) => {
    const { captionsAttribute, captionsSelector, captionsIdAttribute = 'data-caption-id' } = config

    // Check for an ID reference on the trigger element
    // This allows the caption to be anywhere on the page
    const CAPTION_ID = triggerEl.getAttribute(captionsIdAttribute)

    if (CAPTION_ID) {
      const CAPTION_EL = document.getElementById(CAPTION_ID)

      if (CAPTION_EL) {
        return CAPTION_EL.innerHTML
      }
    }

    // Check for a direct caption attribute on the trigger element
    const DIRECT_CAPTION = triggerEl.getAttribute(captionsAttribute)

    if (DIRECT_CAPTION) {
      return DIRECT_CAPTION
    }

    // Query for a selector inside the trigger element
    if (captionsSelector !== 'self') {
      const CAPTION_EL = triggerEl.querySelector(captionsSelector)

      if (CAPTION_EL) {
        // Prefer a direct attribute on the found element, otherwise use its content
        return CAPTION_EL.getAttribute(captionsAttribute) || CAPTION_EL.innerHTML
      }
    }

    return null
  }

  const CAPTION_DATA = getCaptionData(el)

  if (CAPTION_DATA) {
    const CAPTION_CONTAINER = document.createElement('div')
    const CAPTION_ID = `parvus__caption-${index}`

    CAPTION_CONTAINER.className = 'parvus__caption'
    CAPTION_CONTAINER.id = CAPTION_ID
    CAPTION_CONTAINER.innerHTML = `<p>${CAPTION_DATA}</p>`

    containerEl.appendChild(CAPTION_CONTAINER)
    imageEl.setAttribute('aria-describedby', CAPTION_ID)
  }
}

/**
 * Add copyright to the image container element
 *
 * @param {Object} config - Configuration object
 * @param {HTMLElement} imageContainer - The image container element (parvus__content) to which the copyright will be added
 * @param {HTMLElement} imageEl - The image the copyright is linked to
 * @param {HTMLElement} el - The trigger element associated with the copyright
 * @param {Number} index - The index of the copyright
 * @returns {void}
 */
export const addCopyright = (config, imageContainer, imageEl, el, index) => {
  const getCopyrightData = (triggerEl) => {
    const { copyrightAttribute, copyrightSelector, copyrightIdAttribute = 'data-copyright-id' } = config

    // Check for an ID reference on the trigger element
    // This allows the copyright to be anywhere on the page
    const COPYRIGHT_ID = triggerEl.getAttribute(copyrightIdAttribute)

    if (COPYRIGHT_ID) {
      const COPYRIGHT_EL = document.getElementById(COPYRIGHT_ID)

      if (COPYRIGHT_EL) {
        return COPYRIGHT_EL.innerHTML
      }
    }

    // Check for a direct copyright attribute on the trigger element
    const DIRECT_COPYRIGHT = triggerEl.getAttribute(copyrightAttribute)

    if (DIRECT_COPYRIGHT) {
      return DIRECT_COPYRIGHT
    }

    // Query for a selector inside the trigger element
    if (copyrightSelector !== 'self') {
      const COPYRIGHT_EL = triggerEl.querySelector(copyrightSelector)

      if (COPYRIGHT_EL) {
        // Prefer a direct attribute on the found element, otherwise use its content
        return COPYRIGHT_EL.getAttribute(copyrightAttribute) || COPYRIGHT_EL.innerHTML
      }
    }

    return null
  }

  const COPYRIGHT_DATA = getCopyrightData(el)

  if (COPYRIGHT_DATA) {
    const COPYRIGHT_CONTAINER = document.createElement('div')
    const COPYRIGHT_ID = `parvus__copyright-${index}`

    COPYRIGHT_CONTAINER.className = 'parvus__copyright'
    COPYRIGHT_CONTAINER.id = COPYRIGHT_ID
    COPYRIGHT_CONTAINER.innerHTML = `<small>${COPYRIGHT_DATA}</small>`

    imageContainer.appendChild(COPYRIGHT_CONTAINER)

    // If image already has aria-describedby (from caption), append copyright ID
    const existingAriaDescribedby = imageEl.getAttribute('aria-describedby')
    if (existingAriaDescribedby) {
      imageEl.setAttribute('aria-describedby', `${existingAriaDescribedby} ${COPYRIGHT_ID}`)
    } else {
      imageEl.setAttribute('aria-describedby', COPYRIGHT_ID)
    }
  }
}

/**
 * Create image
 *
 * @param {Object} state - The application state
 * @param {HTMLElement} el - The trigger element
 * @param {Number} index - The index
 * @param {Function} callback - Callback function
 * @returns {void}
 */
export const createImage = (state, el, index, callback) => {
  const { contentElements, sliderElements } = state.GROUPS[state.activeGroup]

  if (contentElements[index] !== undefined) {
    if (callback && typeof callback === 'function') {
      callback()
    }
    return
  }

  const CONTENT_CONTAINER_EL = sliderElements[index].querySelector('div')
  const IMAGE = new Image()
  const IMAGE_CONTAINER = document.createElement('div')
  const THUMBNAIL = el.querySelector('img')
  const LOADING_INDICATOR = document.createElement('div')

  IMAGE_CONTAINER.className = 'parvus__content'

  // Create loading indicator
  LOADING_INDICATOR.className = 'parvus__loader'
  LOADING_INDICATOR.setAttribute('role', 'progressbar')
  LOADING_INDICATOR.setAttribute('aria-label', state.config.l10n.lightboxLoadingIndicatorLabel)

  // Add loading indicator to content container
  CONTENT_CONTAINER_EL.appendChild(LOADING_INDICATOR)

  const checkImagePromise = new Promise((resolve, reject) => {
    IMAGE.onload = () => resolve(IMAGE)
    IMAGE.onerror = (error) => reject(error)
  })

  checkImagePromise
    .then((loadedImage) => {
      loadedImage.style.opacity = 0

      IMAGE_CONTAINER.appendChild(loadedImage)

      // Add copyright if available (inside IMAGE_CONTAINER)
      if (state.config.copyright) {
        addCopyright(state.config, IMAGE_CONTAINER, IMAGE, el, index)
      }

      CONTENT_CONTAINER_EL.appendChild(IMAGE_CONTAINER)

      // Add caption if available
      if (state.config.captions) {
        addCaption(state.config, CONTENT_CONTAINER_EL, IMAGE, el, index)
      }

      contentElements[index] = loadedImage

      // Set image width and height
      loadedImage.setAttribute('width', loadedImage.naturalWidth)
      loadedImage.setAttribute('height', loadedImage.naturalHeight)

      // Set image dimension
      setImageDimension(sliderElements[index], loadedImage)
    })
    .catch(() => {
      const ERROR_CONTAINER = document.createElement('div')

      ERROR_CONTAINER.classList.add('parvus__content')
      ERROR_CONTAINER.classList.add('parvus__content--error')

      ERROR_CONTAINER.textContent = state.config.l10n.lightboxLoadingError

      CONTENT_CONTAINER_EL.appendChild(ERROR_CONTAINER)

      contentElements[index] = ERROR_CONTAINER
    })
    .finally(() => {
      CONTENT_CONTAINER_EL.removeChild(LOADING_INDICATOR)

      if (callback && typeof callback === 'function') {
        callback()
      }
    })

  // Add `sizes` attribute
  if (el.hasAttribute('data-sizes') && el.getAttribute('data-sizes') !== '') {
    IMAGE.setAttribute('sizes', el.getAttribute('data-sizes'))
  }

  // Add `srcset` attribute
  if (el.hasAttribute('data-srcset') && el.getAttribute('data-srcset') !== '') {
    IMAGE.setAttribute('srcset', el.getAttribute('data-srcset'))
  }

  // Add `src` attribute
  if (el.tagName === 'A') {
    IMAGE.setAttribute('src', el.href)
  } else {
    IMAGE.setAttribute('src', el.getAttribute('data-target'))
  }

  // `alt` attribute
  if (THUMBNAIL && THUMBNAIL.hasAttribute('alt') && THUMBNAIL.getAttribute('alt') !== '') {
    IMAGE.alt = THUMBNAIL.alt
  } else if (el.hasAttribute('data-alt') && el.getAttribute('data-alt') !== '') {
    IMAGE.alt = el.getAttribute('data-alt')
  } else {
    IMAGE.alt = ''
  }
}

/**
 * Load Image
 *
 * @param {Object} state - The application state
 * @param {Number} index - The index of the image to load
 * @param {Boolean} animate - Whether to animate the image
 * @returns {void}
 */
export const loadImage = (state, index, animate) => {
  const IMAGE = state.GROUPS[state.activeGroup].contentElements[index]

  if (IMAGE && IMAGE.tagName === 'IMG') {
    const THUMBNAIL = state.GROUPS[state.activeGroup].triggerElements[index]

    if (animate && document.startViewTransition) {
      THUMBNAIL.style.viewTransitionName = 'lightboximage'

      const transition = document.startViewTransition(() => {
        IMAGE.style.opacity = ''
        THUMBNAIL.style.viewTransitionName = null

        IMAGE.style.viewTransitionName = 'lightboximage'
      })

      transition.finished.finally(() => {
        IMAGE.style.viewTransitionName = null
      })
    } else {
      IMAGE.style.opacity = ''
    }
  } else {
    IMAGE.style.opacity = ''
  }
}

/**
 * Set image dimension
 *
 * @param {HTMLElement} slideEl - The slide element
 * @param {HTMLElement} contentEl - The content element
 * @returns {void}
 */
export const setImageDimension = (slideEl, contentEl) => {
  if (contentEl.tagName !== 'IMG') {
    return
  }

  const SRC_HEIGHT = contentEl.getAttribute('height')
  const SRC_WIDTH = contentEl.getAttribute('width')

  if (!SRC_HEIGHT || !SRC_WIDTH) {
    return
  }

  const SLIDE_EL_STYLES = getComputedStyle(slideEl)

  const HORIZONTAL_PADDING = parseFloat(SLIDE_EL_STYLES.paddingLeft) + parseFloat(SLIDE_EL_STYLES.paddingRight)
  const VERTICAL_PADDING = parseFloat(SLIDE_EL_STYLES.paddingTop) + parseFloat(SLIDE_EL_STYLES.paddingBottom)

  const CAPTION_EL = slideEl.querySelector('.parvus__caption')
  const CAPTION_HEIGHT = CAPTION_EL ? CAPTION_EL.getBoundingClientRect().height : 0

  const MAX_WIDTH = slideEl.offsetWidth - HORIZONTAL_PADDING
  const MAX_HEIGHT = slideEl.offsetHeight - VERTICAL_PADDING - CAPTION_HEIGHT

  const RATIO = Math.min(MAX_WIDTH / SRC_WIDTH || 0, MAX_HEIGHT / SRC_HEIGHT || 0)

  const NEW_WIDTH = SRC_WIDTH * RATIO
  const NEW_HEIGHT = SRC_HEIGHT * RATIO

  const USE_ORIGINAL_SIZE = (SRC_WIDTH <= MAX_WIDTH && SRC_HEIGHT <= MAX_HEIGHT)

  contentEl.style.width = USE_ORIGINAL_SIZE ? '' : `${NEW_WIDTH}px`
  contentEl.style.height = USE_ORIGINAL_SIZE ? '' : `${NEW_HEIGHT}px`
}

/**
 * Create resize handler
 *
 * @param {Object} state - The application state
 * @param {Function} updateOffset - Update offset function
 * @returns {Function} Resize event handler
 */
export const createResizeHandler = (state, updateOffset) => {
  return () => {
    if (!state.resizeTicking) {
      state.resizeTicking = true

      window.requestAnimationFrame(() => {
        state.GROUPS[state.activeGroup].sliderElements.forEach((slide, index) => {
          setImageDimension(slide, state.GROUPS[state.activeGroup].contentElements[index])
        })

        updateOffset()

        state.resizeTicking = false
      })
    }
  }
}
