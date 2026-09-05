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
    const existingPlugin = this.plugins.find(p => p.plugin.name === plugin.name)

    if (existingPlugin) {
      console.warn(
        existingPlugin.installed
          ? `Plugin "${plugin.name}" is already registered`
          : `Plugin "${plugin.name}" is already registered but failed to install, see previous error`
      )
      return
    }

    const entry = { plugin, options, installed: false }

    this.plugins.push(entry)

    // If already initialized, install immediately
    if (this.isInitialized && this.context) {
      this.installPlugin(entry)
    }
  }

  /**
   * Install a single plugin
   *
   * @param {Object} entry - Plugin entry ({ plugin, options, installed })
   */
  installPlugin (entry) {
    if (entry.installed) {
      return
    }

    const { plugin, options } = entry

    try {
      const PREVIOUS_AFTER_INIT_HOOK_COUNT = (this.hooks.afterInit || []).length

      plugin.install(this.context, options)

      entry.installed = true

      // Run only this plugin's new afterInit hooks, not already-fired ones from earlier plugins
      if (this.context?.state?.lightbox) {
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

    this.plugins.forEach(entry => {
      this.installPlugin(entry)
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
   * Execute a hook, canceling on the first callback that returns false
   *
   * @param {String} hookName - Name of the hook
   * @param {*} data - Data to pass to hook callbacks
   * @returns {Boolean} False if a callback canceled the action, otherwise true
   */
  executeCancelableHook (hookName, data) {
    const callbacks = this.hooks[hookName] || []

    for (const callback of callbacks) {
      try {
        if (callback(data) === false) {
          return false
        }
      } catch (error) {
        console.error(`Error in hook "${hookName}":`, error)
      }
    }

    return true
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
    if (!this.hooks[hookName]) {
      return
    }

    this.hooks[hookName] = this.hooks[hookName].filter(cb => cb !== callback)
  }

  /**
   * Get all successfully installed plugins
   *
   * @returns {Array} Array of plugin names
   */
  getPlugins () {
    return this.plugins.filter(p => p.installed).map(p => p.plugin.name)
  }
}
