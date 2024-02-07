const BROWSER_WINDOW = window

/**
 * Get scrollbar width
 *
 * @return {Number} - The scrollbar width
 */
export const getScrollbarWidth = () => {
  return BROWSER_WINDOW.innerWidth - document.documentElement.clientWidth
}
