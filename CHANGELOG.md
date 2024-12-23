# Changelog

## [3.0.0] - 2024-

### Added

- Pinch zoom gestures 4a591e7 4a8355a @deoostfrees #42
- Option to make the zoom indicator optional e65d5c7 @deoostfrees #62

### Changed

- Use the native HTML `dialog` element e703293 @deoostfrees #60
- Use the View Transitions API for the zoom in/ out animation 11e183f @deoostfrees
- Use pointer events instead of mouse and touch events b4941cf @deoostfrees

### Removed

- **Breaking:** The custom event `detail` property 4ea8e38 @deoostfrees
- The `transitionDuration` option. This option is now also set via the available CSS custom property 11e183f @deoostfrees
- The `transitionTimingFunction` option. This option is now also set via the available CSS custom property 11e183f @deoostfrees
- The `loadEmpty` option. The internal `add` function now creates the lightbox 98e41b5 @deoostfrees
- The custom `close` event. The native HTML `dialog` element has its own `close` event dba4678 @deoostfrees

## [2.6.0] - 2024-06-05

### Changed

- Run `change` event listener for `reducedMotionCheck` only when the lightbox is open 083a0e7 @deoostfrees

### Fixed

- Avoid unintentionally moving the image when dragging 96ff56e @deoostfrees #59
- Relationship between caption and image 76df207 @deoostfrees

## [2.5.3] - 2024-04-27

### Fixed

- Remove optional files field in package.json to include all files via NPM 819e132 @deoostfrees

## [2.5.2] - 2024-04-27

### Fixed

- Language file import afe86dc @deoostfrees #55

## [2.5.1] - 2024-04-10

### Fixed

- Issue if no language options are set 2dbed4a @deoostfrees

## [2.5.0] - 2024-04-07

### Added

- Option to load an empty lightbox (even if there are no elements) 9a180fc @deoostfrees a436a81 @drhino
- Fallback to the default language 39e1ae0 @drhino
- Dutch translation 7476426 @drhino

### Changed

- **Breaking:** Rename some CSS custom properties 8b43c66  8ba1f00 @deoostfrees

### Removed

- Slide animation when first/ last slide is visible 4df766b @deoostfrees #52

## [2.4.0] - 2023-07-20

### Added

- Option to hide the browser scrollbar #47

### Changed

- Added an internal function to create and dispatch a new event
- Disabled buttons are no longer visually hidden
- Focus is no longer moved automatically
- CSS styles are now moved from SVG to the actual elements

### Removed

- Custom typography styles

### Fixed

- Load the srcset before the src, add sizes attribute #49

## [2.3.3] - 2023-05-30

### Fixed

- Animate current image and set focus back to the correct element in the default behavior of the `backFocus` option

## [2.3.2] - 2023-05-30

### Fixed

- Set focus back to the correct element in the default behavior of the `backFocus` option

## [2.3.1] - 2023-05-29

### Fixed

- The navigation buttons' visibility

## [2.3.0] - 2023-05-27

### Added

- Changelog section to keep track of changes
- Necessary outputs for screen reader support
- CSS custom properties for captions and image loading error messages

### Changed

- Replaced the custom `copyObject()` function with the built-in `structuredClone()` method
- Refactored code and comments to improve readability and optimize performance

### Removed

- The option for supported image file types as it is no longer necessary
- The `scrollClose` option

### Fixed

- Non standard URLs can break Parvus #43
