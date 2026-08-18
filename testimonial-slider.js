// Testimonial Slider - 2 kártya látható, 5mp-es automatikus váltás
(function () {
    const slider = document.querySelector('.testimonials-slider');

    if (!slider) return;

    const cards = Array.from(slider.children);
    const totalCards = cards.length;
    let currentIndex = 0;
    let autoSlideInterval;

    // Automatikus slide indítása
    function startAutoSlide() {
        autoSlideInterval = setInterval(() => {
            nextSlide();
        }, 5000); // 5 másodperc
    }

    // Következő slide
    function nextSlide() {
        currentIndex++;

        // Ha az utolsó 2 kártya látható, visszaugrunk az elejére
        if (currentIndex > totalCards - 2) {
            currentIndex = 0;
        }

        updateSliderPosition();
    }

    // Slider pozíció frissítése
    function updateSliderPosition() {
        const cardWidth = cards[0].offsetWidth;
        const gap = 24; // CSS gap érték
        const offset = -(currentIndex * (cardWidth + gap));

        slider.style.transform = `translateX(${offset}px)`;
    }

    // Hover esetén megállítás
    slider.addEventListener('mouseenter', () => {
        clearInterval(autoSlideInterval);
    });

    // Hover után újraindítás
    slider.addEventListener('mouseleave', () => {
        startAutoSlide();
    });

    // Ablak átméretezéskor újraszámolás
    window.addEventListener('resize', () => {
        updateSliderPosition();
    });

    // Indítás
    startAutoSlide();
})();
