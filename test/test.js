/**
 * Import language file
 *
 */
import Parvus from '../dist/js/parvus.esm.min.js'
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
prvs.on('open', function (event) {
  console.log(`
    Opened by: ${event.detail.source}
    at index: ${prvs.currentIndex()},
    selected slide: ${prvs.currentIndex() + 1}
  `)
})

prvs.on('select', function () {
  console.log(`
    Selected index: ${prvs.currentIndex()},
    selected slide: ${prvs.currentIndex() + 1}
  `)
})

prvs.on('close', function () {
  console.log('Closed')
})

prvs.on('destroy', function () {
  console.log('Destroyed')
})
