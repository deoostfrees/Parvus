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
export const dispatchCustomEvent = (lightbox, type) => {
  const CUSTOM_EVENT = new CustomEvent(type, {
    cancelable: true
  })

  lightbox.dispatchEvent(CUSTOM_EVENT)
}

/**
 * Bind a specific event listener
 *
 * @param {HTMLElement} lightbox - The lightbox element
 * @param {String} eventName - The name of the event to bind
 * @param {Function} callback - The callback function
 * @returns {void}
 */
export const on = (lightbox, eventName, callback) => {
  if (lightbox) {
    lightbox.addEventListener(eventName, callback)
  }
}

/**
 * Unbind a specific event listener
 *
 * @param {HTMLElement} lightbox - The lightbox element
 * @param {String} eventName - The name of the event to unbind
 * @param {Function} callback - The callback function
 * @returns {void}
 */
export const off = (lightbox, eventName, callback) => {
  if (lightbox) {
    lightbox.removeEventListener(eventName, callback)
  }
}
