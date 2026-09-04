/**
 * State management for Parvus
 *
 * Centralizes all mutable state variables
 */
export class ParvusState {
  constructor () {
    // Group management
    this.GROUP_ATTRIBUTES = {
      triggerElements: [],
      slider: null,
      sliderElements: [],
      contentElements: []
    }
    this.GROUPS = {}
    this.groupIdCounter = 0
    this.newGroup = null
    this.activeGroup = null
    this.currentIndex = 0

    // Configuration
    this.config = {}

    // DOM elements
    this.lightbox = null
    this.lightboxOverlay = null
    this.lightboxOverlayOpacity = 1
    this.toolbar = null
    this.toolbarLeft = null
    this.toolbarRight = null
    this.controls = null
    this.previousButton = null
    this.nextButton = null
    this.closeButton = null
    this.counter = null
    this.counterLabel = null

    // Drag & interaction state
    this.drag = {}
    this.isDraggingX = false
    this.isDraggingY = false
    this.pointerDown = false
    this.activePointers = new Map()
    this.primaryPointerId = null

    // Zoom state
    this.currentScale = 1
    this.panX = 0
    this.panY = 0
    this.lastPanPointerX = null
    this.lastPanPointerY = null
    this.zoomOriginX = 0.5
    this.zoomOriginY = 0.5
    this.isPinching = false
    this.isTap = false
    this.pinchStartDistance = 0
    this.lastPointersId = null

    // Offset & animation
    this.offset = null
    this.offsetTmp = null
    this.resizeTicking = false
    this.dragTicking = false
    this.isReducedMotion = true

    this.lightboxWidth = 0
  }

  /**
   * Clear drag state
   */
  clearDrag () {
    this.drag = {
      startX: 0,
      endX: 0,
      startY: 0,
      endY: 0
    }

    this.primaryPointerId = null
  }

  /**
   * Get the active group
   *
   * @returns {Object} The active group
   */
  getActiveGroup () {
    return this.GROUPS[this.activeGroup]
  }

  /**
   * Reset zoom state
   */
  resetZoomState () {
    this.isPinching = false
    this.isTap = false
    this.currentScale = 1
    this.panX = 0
    this.panY = 0
    this.lastPanPointerX = null
    this.lastPanPointerY = null
    this.zoomOriginX = 0.5
    this.zoomOriginY = 0.5
    this.pinchStartDistance = 0
    this.lastPointersId = ''
  }
}
