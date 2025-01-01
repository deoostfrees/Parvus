/**
 * Add zoom indicator to element
 *
 * @param {HTMLElement} el - The element to add the zoom indicator to
 * @param {Object} config - Options object
 */
export const addZoomIndicator = (el, config) => {
  if (el.querySelector('img') && el.querySelector(config.lightboxIndicatorClass) === null) {
    const LIGHTBOX_INDICATOR_ICON = document.createElement('div')

    LIGHTBOX_INDICATOR_ICON.className = config.lightboxIndicatorClass
    LIGHTBOX_INDICATOR_ICON.innerHTML = config.lightboxIndicatorIcon

    el.appendChild(LIGHTBOX_INDICATOR_ICON)
  }
}

/**
 * Remove zoom indicator for element
 *
 * @param {HTMLElement} el - The element to remove the zoom indicator to
 */
export const removeZoomIndicator = (el) => {
  if (el.querySelector('img') && el.querySelector(config.lightboxIndicatorClass) !== null) {
    const LIGHTBOX_INDICATOR_ICON = el.querySelector(config.lightboxIndicatorClass)

    el.removeChild(LIGHTBOX_INDICATOR_ICON)
  }
}
