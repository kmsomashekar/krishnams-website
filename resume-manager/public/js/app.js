import { API } from './api.js';

// Clean view component states aligned with rapid tracking objectives
const views = {
    dashboard: () => `<div class="placeholder-card"><h2>Dashboard View</h2><p>Quick stats and active daily application pipeline view.</p></div>`,
    resumes: () => `<div class="placeholder-card"><h2>Resume Library</h2><p>Manage Master & Tailored document versions.</p></div>`,
    opportunities: () => `<div class="placeholder-card"><h2>Job Opportunities</h2><p>Track applications pipelines and record target matching workflows.</p></div>`,
    contacts: () => `<div class="placeholder-card"><h2>Contacts & Recruiters</h2><p>Track direct interactions, questions, and network profiles.</p></div>`
};

class AppRouter {
    constructor() {
        this.viewport = document.getElementById('view-viewport');
        this.titleElement = document.getElementById('view-title');
        this.navItems = document.querySelectorAll('.nav-item');
        
        this.init();
    }

    init() {
        // Wire navigation events
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const viewName = item.getAttribute('data-view');
                window.location.hash = viewName;
                this.navigate(viewName);
            });
        });

        // Initialize route match
        window.addEventListener('hashchange', () => {
            const viewName = window.location.hash.replace('#', '') || 'dashboard';
            this.navigate(viewName);
        });

        // Initial launch routing verification
        const initialView = window.location.hash.replace('#', '') || 'dashboard';
        this.navigate(initialView);
        
        // Background connectivity confirmation test via modular same-origin client
        API.checkHealth().then(data => {
            console.log(`[System Core Init] Health validation confirmed. Environment: ${data.environment}`);
        }).catch(() => {
            console.warn('[System Core Init] API health unreachable. Confirm local worker is live.');
        });
    }

    navigate(viewName) {
        if (!views[viewName]) viewName = 'dashboard';
        
        // Update styling highlight states
        this.navItems.forEach(item => {
            if (item.getAttribute('data-view') === viewName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Inject target view layer markup
        this.viewport.innerHTML = views[viewName]();
        this.titleElement.textContent = viewName.charAt(0).toUpperCase() + viewName.slice(1);
    }
}

// Instantiate core UI application routing framework
document.addEventListener('DOMContentLoaded', () => {
    new AppRouter();
});