/**
 * Add zoom indicator to element
 *
 * @param {HTMLElement} el - The element to add the zoom indicator to
 * @param {Object} config - Options object
 */
export const addZoomIndicator = (el, config) => {
  if (el.querySelector('img')) {
    const LIGHTBOX_INDICATOR_ICON = document.createElement('div')

    el.classList.add('parvus-zoom')

    LIGHTBOX_INDICATOR_ICON.className = 'parvus-zoom__indicator'
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
  const LIGHTBOX_INDICATOR_ICON = el.querySelector('.parvus-zoom__indicator')

  el.classList.remove('parvus-zoom')
  el.removeChild(LIGHTBOX_INDICATOR_ICON)
}
