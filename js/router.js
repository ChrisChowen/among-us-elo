/**
 * Hash-based Router with View Transitions API
 * Handles navigation between sections with smooth "vent" animations
 */

class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.onRouteChange = null;

        // Bind methods
        this.handleHashChange = this.handleHashChange.bind(this);

        // Initialize
        window.addEventListener('hashchange', this.handleHashChange);
        window.addEventListener('load', () => this.handleHashChange());
    }

    /**
     * Register a route handler
     * @param {string} path - Route path (e.g., 'home', 'player/:id')
     * @param {Function} handler - Handler function called when route matches
     */
    register(path, handler) {
        this.routes.set(path, handler);
    }

    /**
     * Navigate to a route
     * @param {string} path - Route to navigate to
     */
    navigate(path) {
        window.location.hash = path;
    }

    /**
     * Parse the current hash and extract route info
     * @returns {Object} Route info with path and params
     */
    parseHash() {
        const hash = window.location.hash.slice(1) || 'home';
        const parts = hash.split('/');
        const path = parts[0];
        const params = parts.slice(1);

        return { path, params, full: hash };
    }

    /**
     * Handle hash change with View Transitions
     */
    async handleHashChange() {
        const { path, params, full } = this.parseHash();

        // Find matching route
        let handler = this.routes.get(path);
        let routeParams = {};

        // Check for parameterized routes if no direct match
        if (!handler) {
            for (const [routePath, routeHandler] of this.routes) {
                if (routePath.includes(':')) {
                    const routeParts = routePath.split('/');
                    if (routeParts[0] === path) {
                        handler = routeHandler;
                        // Extract params
                        routeParts.slice(1).forEach((part, i) => {
                            if (part.startsWith(':')) {
                                routeParams[part.slice(1)] = params[i];
                            }
                        });
                        break;
                    }
                }
            }
        }

        // Default to home if no match
        if (!handler) {
            handler = this.routes.get('home');
        }

        // Perform transition
        await this.transition(path, () => {
            // Hide all pages
            document.querySelectorAll('.page').forEach(page => {
                page.hidden = true;
            });

            // Call route handler
            if (handler) {
                handler(routeParams, params);
            }

            // Update nav state
            this.updateNavState(path);
        });

        // Update current route
        this.currentRoute = { path, params: routeParams };

        // Callback
        if (this.onRouteChange) {
            this.onRouteChange(this.currentRoute);
        }
    }

    /**
     * Perform view transition if supported
     * @param {string} toPath - Destination path
     * @param {Function} updateDOM - Function to update DOM
     */
    async transition(toPath, updateDOM) {
        // Check for View Transitions API support
        if (document.startViewTransition) {
            try {
                const transition = document.startViewTransition(() => {
                    updateDOM();
                });
                await transition.finished;
            } catch (e) {
                // Fallback if transition fails
                updateDOM();
            }
        } else {
            // Fallback for browsers without View Transitions
            updateDOM();
        }
    }

    /**
     * Update navigation active states
     * @param {string} currentPath - Current route path
     */
    updateNavState(currentPath) {
        // Update radial menu active state
        document.querySelectorAll('.radial-item').forEach(item => {
            const href = item.getAttribute('href')?.slice(1);
            item.classList.toggle('active', href === currentPath);
        });
    }

    /**
     * Get current route info
     * @returns {Object} Current route
     */
    getCurrent() {
        return this.currentRoute;
    }
}

// Create and export singleton
const router = new Router();
export default router;
