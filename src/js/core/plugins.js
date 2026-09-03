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
      const PREVIOUS_AFTER_INIT_HOOK_COUNT = (this.hooks.afterInit || []).length

      plugin.install(this.context, options)

      // If lightbox already exists, run only this plugin's newly registered
      // afterInit hooks, so other plugins' already-fired hooks don't run again
      if (this.context && this.context.state && this.context.state.lightbox) {
        const NEW_AFTER_INIT_HOOKS = (this.hooks.afterInit || []).slice(PREVIOUS_AFTER_INIT_HOOK_COUNT)

        this.runCallbacks('afterInit', NEW_AFTER_INIT_HOOKS, { state: this.context.state })
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
    this.runCallbacks(hookName, this.hooks[hookName] || [], data)
  }

  /**
   * Run a list of hook callbacks, isolating failures per callback
   *
   * @param {String} hookName - Name of the hook, used for error logging
   * @param {Array} callbacks - Callbacks to run
   * @param {*} data - Data to pass to the callbacks
   */
  runCallbacks (hookName, callbacks, data) {
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
