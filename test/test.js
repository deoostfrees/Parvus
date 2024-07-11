/**
 * Import Parvus
 *
 */
import Parvus from '../dist/js/parvus.esm.min.js'

/**
 * Import language file
 *
 */
import de from '../src/l10n/de.js'

/**
 * Initialize Parvus
 *
 */
const prvs = new Parvus({
  gallerySelector: '.gallery',
  l10n: de
})

/**
 * API
 *
 */

// Get the index of the currently displayed slide
console.log('Current index: ', prvs.currentIndex())

// Add the specified element (DOM element) to Parvus
const newImage = document.querySelector('.lightbox-new')

prvs.add(newImage)

/*
setTimeout(() => {
  prvs.select(0)
}, 4000) */

/**
 * Events
 *
 */
prvs.on('open', () => {
  console.log(`Open:
    Index: ${prvs.currentIndex()},
    Slide: ${prvs.currentIndex() + 1}`)
})

prvs.on('select', () => {
  console.log(`Select:
    Index: ${prvs.currentIndex()},
    Slide: ${prvs.currentIndex() + 1}`)
})

prvs.on('close', () => {
  console.log('Close')
})

prvs.on('destroy', () => {
  console.log('Destroy')
})
