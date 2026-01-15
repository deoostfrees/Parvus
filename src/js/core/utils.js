/**
 * Utils Module
 *
 * Utility functions
 */

/**
 * Check prefers reduced motion
 *
 * @param {Object} state - The application state
 * @param {MediaQueryList} motionQuery - The media query list
 * @returns {void}
 */
export const reducedMotionCheck = (state, motionQuery) => {
  if (motionQuery.matches) {
    state.isReducedMotion = true
  } else {
    state.isReducedMotion = false
  }
}

/**
 * Retrieves or creates a group identifier for the given element
 *
 * @param {Object} state - The application state
 * @param {HTMLElement} el - DOM element to get or assign a group to
 * @returns {string} The group identifier associated with the element
 */
export const getGroup = (state, el) => {
  // Return existing group identifier if already assigned
  if (el.dataset.group) {
    return el.dataset.group
  }

  // Generate new unique group identifier using counter
  const EL_GROUP = `default-${state.groupIdCounter++}`

  // Assign the new group identifier to element's dataset
  el.dataset.group = EL_GROUP

  return EL_GROUP
}
