const FOCUSABLE_ELEMENTS = [
  'a:not([inert]):not([tabindex^="-"])',
  'button:not([inert]):not([tabindex^="-"]):not(:disabled)',
  '[tabindex]:not([inert]):not([tabindex^="-"])'
]

/**
 * Get the focusable children of the given element
 *
 * @return {Array<Element>} - An array of focusable children
 */
export const getFocusableChildren = (targetEl) => {
  return Array.from(targetEl.querySelectorAll(FOCUSABLE_ELEMENTS.join(', ')))
    .filter((child) => child.offsetParent !== null)
}
