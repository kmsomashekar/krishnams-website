/**
 * FORTUNE 500 PORTFOLIO SYSTEM SCRIPTS
 * Vanilla JS Engine optimized for high frame-rates and zero layouts thrashing.
 */

document.addEventListener('DOMContentLoaded', () => {

    // 1. HARDWARE-ACCELERATED ACCESSIBLE MOBILE MENU NAV OVERLAY
    const navToggle = document.querySelector('.mobile-nav-toggle');
    const primaryNav = document.querySelector('#primary-navigation');
    const navLinks = document.querySelectorAll('.nav-link');

    if (navToggle && primaryNav) {
        navToggle.addEventListener('click', () => {
            const isMenuExpanded = navToggle.getAttribute('aria-expanded') === 'true';
            
            navToggle.setAttribute('aria-expanded', !isMenuExpanded);
            primaryNav.classList.toggle('open');
            
            // Restrict container page scroll tracking while viewport menu is active
            document.body.style.overflow = isMenuExpanded ? '' : 'hidden';
        });

        // Close structural overlay whenever target menu links are selected
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (primaryNav.classList.contains('open')) {
                    navToggle.setAttribute('aria-expanded', 'false');
                    primaryNav.classList.remove('open');
                    document.body.style.overflow = '';
                }
            });
        });
    }

    // 2. PASSIVE HIGH-PERFORMANCE INTERSECTION OBSERVER FOR VISUAL ELEMENTS
    const revealElements = document.querySelectorAll('.scroll-reveal');

    if ('IntersectionObserver' in window) {
        const revealOptions = {
            root: null,
            threshold: 0.05,
            rootMargin: '0px 0px -50px 0px'
        };

        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Inject operational visual metrics immediately
                    entry.target.classList.add('revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, revealOptions);

        revealElements.forEach(element => revealObserver.observe(element));
    } else {
        // Fallback context structure for legacy indexing configurations
        revealElements.forEach(element => element.classList.add('revealed'));
    }

    // 3. INTUITIVE ACTIVE LINKS SYNC VIA CONTAINER SCROLL MONITORING
    const trackingSections = document.querySelectorAll('section[id]');
    
    const handleActiveLinkHighlighting = () => {
        const thresholdLine = window.scrollY + 160;

        trackingSections.forEach(section => {
            const sectionTopPos = section.offsetTop;
            const sectionTotalHeight = section.offsetHeight;
            const targetId = section.getAttribute('id');

            if (thresholdLine >= sectionTopPos && thresholdLine < sectionTopPos + sectionTotalHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${targetId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    };

    // Throttled Scroll Engine to minimize main thread blocking
    let scrollEventTimeout;
    window.addEventListener('scroll', () => {
        if (!scrollEventTimeout) {
            window.requestAnimationFrame(() => {
                handleActiveLinkHighlighting();
                scrollEventTimeout = false;
            });
            scrollEventTimeout = true;
        }
    }, { passive: true });

});