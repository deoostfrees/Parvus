# Changelog

## [Unreleased]

- Pinch zoom gestures

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
