/**
 * Plugin management for Parvus
 *
 * Provides a system for registering and managing plugins
 */

export class PluginManager {
  constructor () {
    this.plugins = []
    this.hooks = {}
    this.context = null
    this.isInitialized = false
  }

  /**
   * Register a plugin
   *
   * @param {Object} plugin - Plugin object with name and install function
   * @param {Object} options - Plugin-specific options
   */
  register (plugin, options = {}) {
    if (!plugin || typeof plugin.install !== 'function') {
      throw new Error('Plugin must have an install function')
    }

    if (!plugin.name) {
      throw new Error('Plugin must have a name')
    }

    // Check if plugin is already registered
    const existingPlugin = this.plugins.find(p => p.name === plugin.name)
    if (existingPlugin) {
      console.warn(`Plugin "${plugin.name}" is already registered`)
      return
    }

    this.plugins.push({ plugin, options })

    // If already initialized, install immediately
    if (this.isInitialized && this.context) {
      this.installPlugin(plugin, options)
    }
  }

  /**
   * Install a single plugin
   *
   * @param {Object} plugin - Plugin object
   * @param {Object} options - Plugin options
   */
  installPlugin (plugin, options) {
    try {
      plugin.install(this.context, options)

      // If lightbox already exists, execute afterInit hook for this plugin immediately
      if (this.context && this.context.state && this.context.state.lightbox) {
        this.executeHook('afterInit', { state: this.context.state })
      }
    } catch (error) {
      console.error(`Failed to install plugin "${plugin.name}":`, error)
    }
  }

  /**
   * Install all registered plugins
   *
   * @param {Object} context - Parvus instance context
   */
  install (context) {
    this.context = context
    this.isInitialized = true

    this.plugins.forEach(({ plugin, options }) => {
      this.installPlugin(plugin, options)
    })
  }

  /**
   * Execute a hook
   *
   * @param {String} hookName - Name of the hook
   * @param {*} data - Data to pass to hook callbacks
   */
  executeHook (hookName, data) {
    const callbacks = this.hooks[hookName] || []
    callbacks.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error(`Error in hook "${hookName}":`, error)
      }
    })
  }

  /**
   * Register a hook callback
   *
   * @param {String} hookName - Name of the hook
   * @param {Function} callback - Callback function
   */
  addHook (hookName, callback) {
    if (!this.hooks[hookName]) {
      this.hooks[hookName] = []
    }
    this.hooks[hookName].push(callback)
  }

  /**
   * Remove a hook callback
   *
   * @param {String} hookName - Name of the hook
   * @param {Function} callback - Callback function to remove
   */
  removeHook (hookName, callback) {
    if (!this.hooks[hookName]) return

    this.hooks[hookName] = this.hooks[hookName].filter(cb => cb !== callback)
  }

  /**
   * Get all registered plugins
   *
   * @returns {Array} Array of plugin names
   */
  getPlugins () {
    return this.plugins.map(p => p.plugin.name)
  }
}
