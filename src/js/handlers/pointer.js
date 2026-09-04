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
    if (event.pointerType === 'mouse' && !state.config.simulateTouch) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    // Only reset on a fresh gesture, not when a second finger joins an active swipe
    if (state.activePointers.size === 0) {
      state.isDraggingX = false
      state.isDraggingY = false
      state.primaryPointerId = event.pointerId

      state.drag.startX = event.pageX
      state.drag.startY = event.pageY
      state.drag.endX = event.pageX
      state.drag.endY = event.pageY

      if (state.config.swipeClose) {
        state.lightboxOverlayOpacity = getComputedStyle(state.lightboxOverlay).opacity
      }
    }

    // Reset the pan baseline so the next move computes a delta instead of jumping
    state.lastPanPointerX = null
    state.lastPanPointerY = null

    state.pointerDown = true

    state.activePointers.set(event.pointerId, event)

    const { slider } = state.GROUPS[state.activeGroup]

    slider.classList.add('parvus__slider--is-dragging')
    slider.style.willChange = 'transform'

    state.isTap = state.activePointers.size === 1
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
export const createPointermoveHandler = (state, pinchZoom, panZoom, doSwipe) => {
  return (event) => {
    if (!state.pointerDown) {
      return
    }

    event.preventDefault()

    // Update pointer position
    state.activePointers.set(event.pointerId, event)

    // Only the primary pointer may drive the swipe/close position
    if (event.pointerId === state.primaryPointerId) {
      state.drag.endX = event.pageX
      state.drag.endY = event.pageY
    }

    if (state.dragTicking) {
      return
    }

    state.dragTicking = true

    window.requestAnimationFrame(() => {
      state.dragTicking = false

      // Pointerup may have ended the gesture while this callback was queued
      if (!state.pointerDown) {
        return
      }

      const CURRENT_IMAGE = state.GROUPS[state.activeGroup].contentElements[state.currentIndex]

      // Zoom, unless a swipe is already in progress
      if (CURRENT_IMAGE && CURRENT_IMAGE.tagName === 'IMG' && !state.isDraggingX && !state.isDraggingY) {
        if (state.activePointers.size === 2) {
          // Finger count changed, so the next single-pointer move needs a fresh pan baseline
          state.lastPanPointerX = null
          state.lastPanPointerY = null

          pinchZoom(CURRENT_IMAGE)

          return
        }

        if (state.currentScale > 1) {
          panZoom(CURRENT_IMAGE)

          return
        }
      }

      doSwipe()
    })
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
          translate(${state.panX}px, ${state.panY}px) scale(${state.currentScale})
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
