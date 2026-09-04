/**
 * Gesture Handler Module
 *
 * Handles gestures like pinch-to-zoom and swipe
 */

/**
 * Reset image zoom
 *
 * @param {Object} state - The application state
 * @param {HTMLImageElement} currentImg - The image
 * @returns {void}
 */
export const resetZoom = (state, currentImg) => {
  currentImg.style.transition = 'transform 0.3s ease'
  currentImg.style.transform = ''

  setTimeout(() => {
    currentImg.style.transition = ''
    currentImg.style.transformOrigin = ''
  }, 300)

  state.resetZoomState()

  state.lightbox.classList.remove('parvus--is-zooming')
}

/**
 * Clamp the pan offset so the zoomed image can't expose a gap next to the slide
 *
 * @param {Object} state - The application state
 * @param {HTMLImageElement} currentImg - The zoomed image
 * @returns {void}
 */
const clampPan = (state, currentImg) => {
  const SLIDE_RECT = state.GROUPS[state.activeGroup].sliderElements[state.currentIndex].getBoundingClientRect()
  const SCALE = state.currentScale

  // A pinch anchors the scale at its own origin, not the center, shifting the valid pan range off zero
  const clampAxis = (size, slideSize, originFraction, pan) => {
    const HALF_OVERFLOW = Math.max(0, (size * SCALE - slideSize) / 2)
    const ORIGIN_SHIFT = (originFraction * size - size / 2) * (SCALE - 1)

    return Math.min(ORIGIN_SHIFT + HALF_OVERFLOW, Math.max(ORIGIN_SHIFT - HALF_OVERFLOW, pan))
  }

  state.panX = clampAxis(currentImg.offsetWidth, SLIDE_RECT.width, state.zoomOriginX, state.panX)
  state.panY = clampAxis(currentImg.offsetHeight, SLIDE_RECT.height, state.zoomOriginY, state.panY)
}

/**
 * Pinch zoom gesture
 *
 * @param {Object} state - The application state
 * @param {HTMLImageElement} currentImg - The image to zoom
 * @returns {void}
 */
export const pinchZoom = (state, currentImg) => {
  // Determine current finger positions
  const POINTS = Array.from(state.activePointers.values())

  // Calculate current distance between fingers
  const CURRENT_DISTANCE = Math.hypot(
    POINTS[1].clientX - POINTS[0].clientX,
    POINTS[1].clientY - POINTS[0].clientY
  )

  // Calculate the midpoint between the two points
  const MIDPOINT_X = (POINTS[0].clientX + POINTS[1].clientX) / 2
  const MIDPOINT_Y = (POINTS[0].clientY + POINTS[1].clientY) / 2

  // Convert midpoint to relative position within the image
  const IMG_RECT = currentImg.getBoundingClientRect()
  const RELATIVE_X = (MIDPOINT_X - IMG_RECT.left) / IMG_RECT.width
  const RELATIVE_Y = (MIDPOINT_Y - IMG_RECT.top) / IMG_RECT.height

  // When pinch gesture is about to start or the finger IDs have changed
  // Use a unique ID based on the pointer IDs to recognize changes
  const CURRENT_POINTERS_ID = POINTS.map(p => p.pointerId).sort().join('-')
  const IS_NEW_POINTER_COMBINATION = state.lastPointersId !== CURRENT_POINTERS_ID

  if (!state.isPinching || IS_NEW_POINTER_COMBINATION) {
    state.isPinching = true
    state.lastPointersId = CURRENT_POINTERS_ID

    // Save the start distance and current scaling as a basis
    state.pinchStartDistance = CURRENT_DISTANCE / state.currentScale

    // Store initial pinch position for this gesture
    if ((!currentImg.style.transformOrigin && state.currentScale === 1) ||
      (state.currentScale === 1 && IS_NEW_POINTER_COMBINATION)) {
      // Set the transform origin to the pinch midpoint
      currentImg.style.transformOrigin = `${RELATIVE_X * 100}% ${RELATIVE_Y * 100}%`
      state.zoomOriginX = RELATIVE_X
      state.zoomOriginY = RELATIVE_Y
    }

    state.lightbox.classList.add('parvus--is-zooming')
  }

  // Calculate scaling factor based on distance change
  const SCALE_FACTOR = CURRENT_DISTANCE / state.pinchStartDistance

  // Limit scaling to 1 - 3
  state.currentScale = Math.min(Math.max(1, SCALE_FACTOR), 3)

  // Re-clamp on every scale change so zooming out near an edge doesn't leave a gap
  clampPan(state, currentImg)

  currentImg.style.willChange = 'transform'
  currentImg.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.currentScale})`
}

/**
 * Pan the zoomed image with a single pointer
 *
 * @param {Object} state - The application state
 * @param {HTMLImageElement} currentImg - The zoomed image to pan
 * @returns {void}
 */
export const panZoom = (state, currentImg) => {
  const POINTER = Array.from(state.activePointers.values())[0]

  // Track movement so pointerup's tap detection doesn't mistake this pan for a tap
  state.drag.endX = POINTER.pageX
  state.drag.endY = POINTER.pageY

  // First move after a pinch/touch only sets the baseline, avoiding a jump on the next one
  if (state.lastPanPointerX === null) {
    state.lastPanPointerX = POINTER.clientX
    state.lastPanPointerY = POINTER.clientY

    return
  }

  const DELTA_X = POINTER.clientX - state.lastPanPointerX
  const DELTA_Y = POINTER.clientY - state.lastPanPointerY

  state.lastPanPointerX = POINTER.clientX
  state.lastPanPointerY = POINTER.clientY

  state.panX += DELTA_X
  state.panY += DELTA_Y

  clampPan(state, currentImg)

  currentImg.style.willChange = 'transform'
  currentImg.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.currentScale})`
}

/**
 * Determine the swipe direction (horizontal or vertical)
 *
 * @param {Object} state - The application state
 * @returns {void}
 */
export const doSwipe = (state) => {
  const MOVEMENT_THRESHOLD = 1.5
  const MAX_OPACITY_DISTANCE = 100
  const DIRECTION_BIAS = 1.15

  const { startX, endX, startY, endY } = state.drag
  const MOVEMENT_X = startX - endX
  const MOVEMENT_Y = endY - startY
  const MOVEMENT_X_DISTANCE = Math.abs(MOVEMENT_X)
  const MOVEMENT_Y_DISTANCE = Math.abs(MOVEMENT_Y)

  const GROUP = state.GROUPS[state.activeGroup]
  const SLIDER = GROUP.slider
  const TOTAL_SLIDES = GROUP.triggerElements.length

  const handleHorizontalSwipe = (movementX, distance) => {
    const IS_FIRST_SLIDE = state.currentIndex === 0
    const IS_LAST_SLIDE = state.currentIndex === TOTAL_SLIDES - 1

    const IS_LEFT_SWIPE = movementX > 0
    const IS_RIGHT_SWIPE = movementX < 0

    if ((IS_FIRST_SLIDE && IS_RIGHT_SWIPE) || (IS_LAST_SLIDE && IS_LEFT_SWIPE)) {
      const DAMPING_FACTOR = 1 / (1 + Math.pow(distance / 100, 0.15))
      const REDUCED_MOVEMENT = movementX * DAMPING_FACTOR

      SLIDER.style.transform = `
        translate3d(${state.offsetTmp - Math.round(REDUCED_MOVEMENT)}px, 0, 0)
      `
    } else {
      SLIDER.style.transform = `
        translate3d(${state.offsetTmp - Math.round(movementX)}px, 0, 0)
      `
    }
  }

  const handleVerticalSwipe = (movementY, distance) => {
    if (!state.isReducedMotion && distance <= 100) {
      const NEW_OVERLAY_OPACITY = Math.max(0, state.lightboxOverlayOpacity - (distance / MAX_OPACITY_DISTANCE))

      state.lightboxOverlay.style.opacity = NEW_OVERLAY_OPACITY
    }

    state.lightbox.classList.add('parvus--is-vertical-closing')

    SLIDER.style.transform = `
      translate3d(${state.offsetTmp}px, ${Math.round(movementY)}px, 0)
    `
  }

  if (state.isDraggingX || state.isDraggingY) {
    if (state.isDraggingX) {
      handleHorizontalSwipe(MOVEMENT_X, MOVEMENT_X_DISTANCE)
    } else if (state.isDraggingY) {
      handleVerticalSwipe(MOVEMENT_Y, MOVEMENT_Y_DISTANCE)
    }
    return
  }

  // Direction detection based on the relative ratio of movements
  if (MOVEMENT_X_DISTANCE > MOVEMENT_THRESHOLD || MOVEMENT_Y_DISTANCE > MOVEMENT_THRESHOLD) {
    // Horizontal swipe if X-movement is stronger than Y-movement * DIRECTION_BIAS
    if (MOVEMENT_X_DISTANCE > MOVEMENT_Y_DISTANCE * DIRECTION_BIAS && TOTAL_SLIDES > 1) {
      state.isDraggingX = true
      state.isDraggingY = false

      handleHorizontalSwipe(MOVEMENT_X, MOVEMENT_X_DISTANCE)
    } else if (MOVEMENT_Y_DISTANCE > MOVEMENT_X_DISTANCE * DIRECTION_BIAS && state.config.swipeClose) {
      // Vertical swipe if Y-movement is stronger than X-movement * DIRECTION_BIAS
      state.isDraggingX = false
      state.isDraggingY = true

      handleVerticalSwipe(MOVEMENT_Y, MOVEMENT_Y_DISTANCE)
    }
  }
}

/**
 * Recalculate drag/swipe event after pointerup
 *
 * @param {Object} state - The application state
 * @param {Object} actions - Navigation actions
 * @returns {void}
 */
export const updateAfterDrag = (state, actions) => {
  const { startX, startY, endX, endY } = state.drag
  const MOVEMENT_X = endX - startX
  const MOVEMENT_Y = endY - startY
  const MOVEMENT_X_DISTANCE = Math.abs(MOVEMENT_X)
  const MOVEMENT_Y_DISTANCE = Math.abs(MOVEMENT_Y)
  const { triggerElements } = state.GROUPS[state.activeGroup]
  const TOTAL_TRIGGER_ELEMENTS = triggerElements.length

  if (state.isDraggingX) {
    const IS_RIGHT_SWIPE = MOVEMENT_X > 0

    if (MOVEMENT_X_DISTANCE >= state.config.threshold) {
      if (IS_RIGHT_SWIPE && state.currentIndex > 0) {
        actions.previous()
      } else if (!IS_RIGHT_SWIPE && state.currentIndex < TOTAL_TRIGGER_ELEMENTS - 1) {
        actions.next()
      }
    }

    actions.updateOffset()
  } else if (state.isDraggingY) {
    if (MOVEMENT_Y_DISTANCE >= state.config.threshold && state.config.swipeClose) {
      actions.close()
    } else {
      state.lightbox.classList.remove('parvus--is-vertical-closing')

      actions.updateOffset()
    }

    state.lightboxOverlay.style.opacity = ''
  } else {
    actions.updateOffset()
  }
}
