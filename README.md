# Parvus

Overlays suck, but if you need one, consider using Parvus. Parvus is an open source, dependency free image lightbox with the goal of being accessible.

![Screenshot of Parvus. It shows the first picture of a gallery.](https://rqrauhvmra.com/parvus/parvus.png)

[Open in CodePen](https://codepen.io/collection/DwLBpz)

## Table of Contents

- [Installation](#installation)
  - [Download](#download)
  - [Package Managers](#package-managers)
- [Usage](#usage)
  - [Captions](#captions)
  - [Gallery](#gallery)
  - [Responsive Images](#responsive-images)
  - [Localization](#localization)
- [Options](#options)
- [API](#api)
- [Events](#events)
- [Browser Support](#browser-support)

## Installation

### Download

- CSS:
  - `dist/css/parvus.min.css` (minified) or
  - `dist/css/parvus.css` (un-minified)
- JavaScript:
  - `dist/js/parvus.min.js` (minified) or
  - `dist/js/parvus.js` (un-minified)

Link the `.css` and `.js` files in your HTML:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page title</title>

  <!-- CSS -->
  <link href="path/to/parvus.min.css" rel="stylesheet">
</head>
<body>
  <!-- HTML content -->

  <!-- JS -->
  <script src="path/to/parvus.min.js"></script>
</body>
</html>
```

### Package Managers

You can also install Parvus using npm or yarn:

```sh
npm install parvus
```

or

```sh
yarn add parvus
```

After installation, import Parvus into your JavaScript codebase:

```js
import Parvus from 'parvus'
```

Be sure to include the corresponding SCSS or CSS file.

## Usage

Link a thumbnail image with the class `lightbox` to a larger image:

```html
<a href="path/to/image.jpg" class="lightbox">
  <img src="path/to/thumbnail.jpg" alt="">
</a>
```

Initialize the script:

```js
const prvs = new Parvus()
```

### Captions

To show a caption under the image, add a `data-caption` attribute:

```html
<a href="path/to/image.jpg" class="lightbox" data-caption="I'm a caption">
  <img src="path/to/thumbnail.jpg" alt="">
</a>
```

Alternatively, set the option `captionsSelector` to select captions from an element's innerHTML:

```html
<a href="path/to/image.jpg" class="lightbox">
  <figure class="figure">
    <img src="path/to/thumbnail.jpg" alt="">

    <figcaption class="figure__caption">
      <p>I'm a caption</p>
    </figcaption>
  </figure>
</a>
```

```js
const prvs = new Parvus({
  captionsSelector: '.figure__caption',
})
```

### Gallery

To group related images into a set, add a `data-group` attribute:

```html
<a href="path/to/image.jpg" class="lightbox" data-group="Berlin">
  <img src="path/to/thumbnail.jpg" alt="">
</a>

<a href="path/to/image_2.jpg" class="lightbox" data-group="Berlin">
  <img src="path/to/thumbnail_2.jpg" alt="">
</a>

//...

<a href="path/to/image_8.jpg" class="lightbox" data-group="Kassel">
  <img src="path/to/thumbnail_8.jpg" alt="">
</a>
```

Alternatively, set the option `gallerySelector` to group all images with a specific class within a selector:

```html
<div class="gallery">
  <a href="path/to/image.jpg" class="lightbox">
    <img src="path/to/thumbnail.jpg" alt="">
  </a>

  <a href="path/to/image_2.jpg" class="lightbox">
    <img src="path/to/thumbnail_2.jpg" alt="">
  </a>

  // ...
</div>
```

```js
const prvs = new Parvus({
  gallerySelector: '.gallery',
})
```

### Responsive Images

Specify different image sources and sizes using the `data-srcset` and `data-sizes` attributes:

```html
<a href="path/to/image.jpg" class="lightbox"

data-srcset="path/to/small.jpg 700w,
             path/to/medium.jpg 1000w,
             path/to/large.jpg 1200w"

data-sizes="(max-width: 75em) 100vw,
            75em"
>
  <img src="path/to/thumbnail.jpg" alt="">
</a>
```

### Localization

Import the language module and set it as an option for localization:

```js
import de from 'parvus/src/l10n/de'

const prvs = new Parvus({
  l10n: de
})
```

## Options

Customize Parvus by passing an options object when initializing:

```js
const prvs = new Parvus({
  // Clicking outside does not close Parvus
  docClose: false
})
```

Available options include:

```js
{
  // Selector for elements that trigger Parvus
  selector: '.lightbox',

  // Selector for a group of elements combined as a gallery, overrides the `data-group` attribute.
  gallerySelector: null,

  // Display captions if available
  captions: true,

  // Selector for the element where the caption is displayed; use "self" for the `a` tag itself.
  captionsSelector: 'self',

  // Attribute to get the caption from
  captionsAttribute: 'data-caption',

  // Clicking outside closes Parvus
  docClose: true,

  // Close Parvus by swiping up/down
  swipeClose: true,

  // Accept mouse events like touch events (click and drag to change slides)
  simulateTouch: true,

  // Touch dragging threshold in pixels
  threshold: 100,

  // Hide browser scrollbar
  hideScrollbar: true,

  // Duration of transition effects in milliseconds
  transitionDuration: 300,

  // Timing function of the transition effects
  transitionTimingFunction: 'cubic-bezier(0.2, 0, 0.2, 1)',

  // Icons
  lightboxIndicatorIcon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>',
  previousButtonIcon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path stroke="none" d="M0 0h24v24H0z"/><polyline points="15 6 9 12 15 18" /></svg>',
  nextButtonIcon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path stroke="none" d="M0 0h24v24H0z"/><polyline points="9 6 15 12 9 18" /></svg>',
  closeButtonIcon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 6L6 18M6 6l12 12"/></svg>',

  // Localization of strings
  l10n: en
}
```

## API

Parvus provides the following API functions:

| Function | Description |
| --- | --- |
| `open(element)` | Open the specified `element` (DOM element) |
| `close()` | Close Parvus |
| `previous()` | Show the previous image |
| `next()` | Show the next image |
| `select(index)` | Select a slide with the specified `index` (integer) |
| `add(element)` | Add the specified `element` (DOM element) |
| `remove(element)` | Remove the specified `element` (DOM element) |
| `destroy()` | Destroy Parvus |
| `isOpen()` | Check if Parvus is currently open |
| `currentIndex()` | Get the index of the currently displayed slide |

## Events

Bind and unbind events using the `.on()` and `.off()` methods:

```js
const prvs = new Parvus()

const listener = () => {
  console.log('eventName happened')
}

// Bind event listener
prvs.on(eventName, listener)

// Unbind event listener
prvs.off(eventName, listener)
```

Available events:

| eventName | Description |
| --- | --- |
| `open` | Triggered after Parvus has opened |
| `select` | Triggered when a slide is selected |
| `close` | Triggered after Parvus has closed |
| `destroy` | Triggered after Parvus has destroyed |

## Browser Support

Parvus is supported on the latest versions of the following browsers:

- Chrome
- Edge
- Firefox
- Safari
