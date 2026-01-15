import en from '../../l10n/en.js'

/**
 * Default configuration options
 */
export const DEFAULT_OPTIONS = {
  selector: '.lightbox',
  gallerySelector: null,
  zoomIndicator: true,
  captions: true,
  captionsSelector: 'self',
  captionsAttribute: 'data-caption',
  copyright: true,
  copyrightSelector: 'self',
  copyrightAttribute: 'data-copyright',
  docClose: true,
  swipeClose: true,
  simulateTouch: true,
  threshold: 50,
  hideScrollbar: true,
  lightboxIndicatorIcon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" stroke="currentColor"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>',
  previousButtonIcon: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" stroke="currentColor"><path stroke="none" d="M0 0h24v24H0z"/><polyline points="15 6 9 12 15 18" /></svg>',
  nextButtonIcon: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" stroke="currentColor"><path stroke="none" d="M0 0h24v24H0z"/><polyline points="9 6 15 12 9 18" /></svg>',
  closeButtonIcon: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" stroke="currentColor"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  l10n: en
}

/**
 * Merge default options with user-provided options
 *
 * @param {Object} userOptions - User-provided options
 * @returns {Object} - Merged options object
 */
export const mergeOptions = (userOptions) => {
  const MERGED_OPTIONS = {
    ...DEFAULT_OPTIONS,
    ...userOptions
  }

  if (userOptions && userOptions.l10n) {
    MERGED_OPTIONS.l10n = {
      ...DEFAULT_OPTIONS.l10n,
      ...userOptions.l10n
    }
  }

  return MERGED_OPTIONS
}
