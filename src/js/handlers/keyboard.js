/**
 * Keyboard Event Handler Module
 *
 * Handles all keyboard interactions
 */

import { getFocusableChildren } from '../helpers/dom.js'

/**
 * Create keyboard event handler
 *
 * @param {Object} state - The application state
 * @param {Object} actions - Actions object with navigation functions
 * @returns {Function} Keyboard event handler
 */
export const createKeydownHandler = (state, actions) => {
  return (event) => {
    const FOCUSABLE_CHILDREN = getFocusableChildren(state.lightbox)
    const FOCUSED_ITEM_INDEX = FOCUSABLE_CHILDREN.indexOf(document.activeElement)
    const lastIndex = FOCUSABLE_CHILDREN.length - 1

    switch (event.code) {
      case 'Tab': {
        // Use the TAB key to navigate backwards and forwards
        if (event.shiftKey) {
          // Navigate backwards
          if (FOCUSED_ITEM_INDEX === 0) {
            FOCUSABLE_CHILDREN[lastIndex].focus()
            event.preventDefault()
          }
        } else {
          // Navigate forwards
          if (FOCUSED_ITEM_INDEX === lastIndex) {
            FOCUSABLE_CHILDREN[0].focus()
            event.preventDefault()
          }
        }
        break
      }
      case 'Escape': {
        // Close Parvus when the ESC key is pressed
        actions.close()
        event.preventDefault()
        break
      }
      case 'ArrowLeft': {
        // Show the previous slide when the PREV key is pressed
        actions.previous()
        event.preventDefault()
        break
      }
      case 'ArrowRight': {
        // Show the next slide when the NEXT key is pressed
        actions.next()
        event.preventDefault()
        break
      }
    }
  }
}
