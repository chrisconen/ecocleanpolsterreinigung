// ═══════════════════════════════════════════════════════════
// ECO CLEAN - MEGA NAVIGATION
// Desktop: Hover | Mobile: Click Accordion
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
    
    // ═══════════════════════════════════════════════════════════
    // MOBILE MENU TOGGLE
    // ═══════════════════════════════════════════════════════════
    
    const navToggle = document.querySelector('.nav-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (navToggle && mobileMenu) {
        navToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            mobileMenu.classList.toggle('active');
            document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
        });
    }
    
    // ═══════════════════════════════════════════════════════════
    // MOBILE MEGA DROPDOWN (Level 1: Polsterreinigung/Matratzenreinigung)
    // ═══════════════════════════════════════════════════════════
    
    const mobileMegaBtns = document.querySelectorAll('.mobile-mega-btn');
    
    mobileMegaBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const parent = this.closest('.mobile-mega');
            
            // Close other mega dropdowns
            document.querySelectorAll('.mobile-mega').forEach(mega => {
                if (mega !== parent) {
                    mega.classList.remove('active');
                }
            });
            
            // Toggle current
            parent.classList.toggle('active');
        });
    });
    
    // ═══════════════════════════════════════════════════════════
    // MOBILE BUNDESLAND DROPDOWN (Level 2: Städte)
    // ═══════════════════════════════════════════════════════════
    
    const mobileBundeslandBtns = document.querySelectorAll('.mobile-bundesland-btn');
    
    mobileBundeslandBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const parent = this.closest('.mobile-bundesland');
            
            // Close other bundesland dropdowns within same mega
            const siblingBundeslaender = parent.parentElement.querySelectorAll('.mobile-bundesland');
            siblingBundeslaender.forEach(bl => {
                if (bl !== parent) {
                    bl.classList.remove('active');
                }
            });
            
            // Toggle current
            parent.classList.toggle('active');
        });
    });
    
    // ═══════════════════════════════════════════════════════════
    // CLOSE MOBILE MENU ON LINK CLICK
    // ═══════════════════════════════════════════════════════════
    
    const mobileLinks = document.querySelectorAll('.mobile-city-link, .mobile-menu-cta');
    
    mobileLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (mobileMenu) {
                mobileMenu.classList.remove('active');
                navToggle.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
    
    // ═══════════════════════════════════════════════════════════
    // CLOSE MOBILE MENU ON ESC KEY
    // ═══════════════════════════════════════════════════════════
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && mobileMenu && mobileMenu.classList.contains('active')) {
            mobileMenu.classList.remove('active');
            navToggle.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
    
    // ═══════════════════════════════════════════════════════════
    // DESKTOP: Keep dropdown open when moving to cities
    // ═══════════════════════════════════════════════════════════
    
    // This is handled purely by CSS :hover, but we add a small
    // delay tolerance for better UX
    
    const navMegas = document.querySelectorAll('.nav-mega');
    
    navMegas.forEach(mega => {
        let timeout;
        
        mega.addEventListener('mouseleave', function() {
            timeout = setTimeout(() => {
                // CSS handles this, but we could add class removal here if needed
            }, 100);
        });
        
        mega.addEventListener('mouseenter', function() {
            clearTimeout(timeout);
        });
    });
    
});
