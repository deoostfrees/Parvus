/**
 * Navigation Module
 *
 * Handles slide navigation and transitions
 */

/**
 * Update offset
 *
 * @param {Object} state - The application state
 * @returns {void}
 */
export const updateOffset = (state) => {
  state.activeGroup = state.activeGroup !== null ? state.activeGroup : state.newGroup

  state.offset = -state.currentIndex * state.lightbox.offsetWidth

  state.GROUPS[state.activeGroup].slider.style.transform = `translate3d(${state.offset}px, 0, 0)`
  state.offsetTmp = state.offset
}

/**
 * Load slide with the specified index
 *
 * @param {Object} state - The application state
 * @param {Number} index - The index of the slide to be loaded
 * @returns {void}
 */
export const loadSlide = (state, index) => {
  state.GROUPS[state.activeGroup].sliderElements[index].setAttribute('aria-hidden', 'false')
}

/**
 * Leave slide
 *
 * @param {Object} state - The application state
 * @param {Number} index - The index of the slide to leave
 * @returns {void}
 */
export const leaveSlide = (state, index) => {
  if (state.GROUPS[state.activeGroup].sliderElements[index] !== undefined) {
    state.GROUPS[state.activeGroup].sliderElements[index].setAttribute('aria-hidden', 'true')
  }
}

/**
 * Preload slide with the specified index
 *
 * @param {Object} state - The application state
 * @param {Function} createSlide - Create slide function
 * @param {Function} createImage - Create image function
 * @param {Function} loadImage - Load image function
 * @param {Number} index - The index of the slide to be preloaded
 * @returns {void}
 */
export const preload = (state, createSlide, createImage, loadImage, index) => {
  if (index < 0 || index >= state.GROUPS[state.activeGroup].triggerElements.length || state.GROUPS[state.activeGroup].sliderElements[index] !== undefined) {
    return
  }

  createSlide(state, index)
  createImage(state, state.GROUPS[state.activeGroup].triggerElements[index], index, () => {
    loadImage(state, index)
  })
}
