/**
 * Debug utilities for tracking component rendering and error handling
 */

// Enable or disable debug logging
const DEBUG_MODE = true;

/**
 * Log component mounting with timing information
 * @param {string} componentName - Name of the component being mounted
 */
export const logComponentMount = (componentName) => {
  if (!DEBUG_MODE) return;
  console.log(`[DEBUG] ${componentName} mounted at ${new Date().toISOString()}`); 
};

/**
 * Log component updates with timing information
 * @param {string} componentName - Name of the component being updated
 * @param {Object} prevProps - Previous props
 * @param {Object} nextProps - Next props
 */
export const logComponentUpdate = (componentName, prevProps, nextProps) => {
  if (!DEBUG_MODE) return;
  console.log(`[DEBUG] ${componentName} updated at ${new Date().toISOString()}`);
};

/**
 * Log API calls with timing information
 * @param {string} endpoint - API endpoint being called
 * @param {string} method - HTTP method (GET, POST, etc.)
 */
export const logApiCall = (endpoint, method = 'GET') => {
  if (!DEBUG_MODE) return;
  console.log(`[DEBUG] API ${method} call to ${endpoint} at ${new Date().toISOString()}`);
};

/**
 * Log API responses
 * @param {string} endpoint - API endpoint that was called
 * @param {Object} response - Response data
 * @param {boolean} isError - Whether this is an error response
 */
export const logApiResponse = (endpoint, response, isError = false) => {
  if (!DEBUG_MODE) return;
  if (isError) {
    console.error(`[DEBUG] API error from ${endpoint}:`, response);
  } else {
    console.log(`[DEBUG] API response from ${endpoint}:`, response);
  }
};

/**
 * Log context provider state changes
 * @param {string} contextName - Name of the context
 * @param {Object} state - Current state
 */
export const logContextState = (contextName, state) => {
  if (!DEBUG_MODE) return;
  console.log(`[DEBUG] ${contextName} state updated:`, state);
};

/**
 * Log router navigation
 * @param {string} path - Path being navigated to
 */
export const logNavigation = (path) => {
  if (!DEBUG_MODE) return;
  console.log(`[DEBUG] Navigation to ${path} at ${new Date().toISOString()}`);
};

/**
 * Enhanced error logger that provides more context
 * @param {Error} error - Error object
 * @param {string} source - Source of the error (component name, function, etc.)
 * @param {Object} additionalData - Any additional data that might help debug
 */
export const logError = (error, source, additionalData = {}) => {
  if (!DEBUG_MODE) return;
  console.error(`[DEBUG ERROR] Error in ${source}:`, error);
  if (Object.keys(additionalData).length > 0) {
    console.error('[DEBUG ERROR] Additional context:', additionalData);
  }
  
  // Log stack trace if available
  if (error && error.stack) {
    console.error('[DEBUG ERROR] Stack trace:', error.stack);
  }
};