/**
 * Pointer Event Handler Module
 *
 * Handles all pointer interactions (mouse, touch, pen)
 */

/**
 * Create pointerdown event handler
 *
 * @param {Object} state - The application state
 * @returns {Function} Pointerdown event handler
 */
export const createPointerdownHandler = (state) => {
  return (event) => {
    event.preventDefault()
    event.stopPropagation()

    state.isDraggingX = false
    state.isDraggingY = false

    state.pointerDown = true

    state.activePointers.set(event.pointerId, event)

    state.drag.startX = event.pageX
    state.drag.startY = event.pageY
    state.drag.endX = event.pageX
    state.drag.endY = event.pageY

    const { slider } = state.GROUPS[state.activeGroup]

    slider.classList.add('parvus__slider--is-dragging')
    slider.style.willChange = 'transform'

    state.isTap = state.activePointers.size === 1

    if (state.config.swipeClose) {
      state.lightboxOverlayOpacity = getComputedStyle(state.lightboxOverlay).opacity
    }
  }
}

/**
 * Create pointermove event handler
 *
 * @param {Object} state - The application state
 * @param {Function} pinchZoom - Pinch zoom function
 * @param {Function} doSwipe - Swipe function
 * @returns {Function} Pointermove event handler
 */
export const createPointermoveHandler = (state, pinchZoom, doSwipe) => {
  return (event) => {
    event.preventDefault()

    if (!state.pointerDown) {
      return
    }

    const CURRENT_IMAGE = state.GROUPS[state.activeGroup].contentElements[state.currentIndex]

    // Update pointer position
    state.activePointers.set(event.pointerId, event)

    // Zoom
    if (CURRENT_IMAGE && CURRENT_IMAGE.tagName === 'IMG') {
      if (state.activePointers.size === 2) {
        pinchZoom(CURRENT_IMAGE)

        return
      }

      if (state.currentScale > 1) {
        return
      }
    }

    state.drag.endX = event.pageX
    state.drag.endY = event.pageY

    doSwipe()
  }
}

/**
 * Create pointerup event handler
 *
 * @param {Object} state - The application state
 * @param {Function} resetZoom - Reset zoom function
 * @param {Function} updateAfterDrag - Update after drag function
 * @returns {Function} Pointerup event handler
 */
export const createPointerupHandler = (state, resetZoom, updateAfterDrag) => {
  return (event) => {
    event.stopPropagation()

    const { slider } = state.GROUPS[state.activeGroup]

    state.activePointers.delete(event.pointerId)

    if (state.activePointers.size > 0) {
      return
    }

    state.pointerDown = false

    const CURRENT_IMAGE = state.GROUPS[state.activeGroup].contentElements[state.currentIndex]

    // Reset zoom state by one tap
    const MOVEMENT_X = Math.abs(state.drag.endX - state.drag.startX)
    const MOVEMENT_Y = Math.abs(state.drag.endY - state.drag.startY)

    const IS_TAP = MOVEMENT_X < 8 && MOVEMENT_Y < 8 && !state.isDraggingX && !state.isDraggingY && state.isTap

    slider.classList.remove('parvus__slider--is-dragging')
    slider.style.willChange = ''

    if (state.currentScale > 1) {
      if (IS_TAP) {
        resetZoom(CURRENT_IMAGE)
      } else {
        CURRENT_IMAGE.style.transform = `
          scale(${state.currentScale})
        `
      }
    } else {
      if (state.isPinching) {
        resetZoom(CURRENT_IMAGE)
      }

      if (state.drag.endX || state.drag.endY) {
        updateAfterDrag()
      }
    }

    state.clearDrag()
  }
}

/**
 * Create click event handler
 *
 * @param {Object} state - The application state
 * @param {Object} actions - Actions object with navigation functions
 * @returns {Function} Click event handler
 */
export const createClickHandler = (state, actions) => {
  return (event) => {
    const { target } = event

    if (target === state.previousButton) {
      actions.previous()
    } else if (target === state.nextButton) {
      actions.next()
    } else if (target === state.closeButton || (state.config.docClose && !state.isDraggingY && !state.isDraggingX && target.classList.contains('parvus__slide'))) {
      actions.close()
    }

    event.stopPropagation()
  }
}
