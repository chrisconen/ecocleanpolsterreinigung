// ═══════════════════════════════════════════════════════════
// PROCESS ACCORDION TOGGLE
// ═══════════════════════════════════════════════════════════

function toggleProcessStep(button) {
    const item = button.closest('.process-accordion-item');
    const wasActive = item.classList.contains('active');

    // Close all other items
    document.querySelectorAll('.process-accordion-item').forEach(otherItem => {
        if (otherItem !== item) {
            otherItem.classList.remove('active');
        }
    });

    // Toggle current item
    if (wasActive) {
        item.classList.remove('active');
    } else {
        item.classList.add('active');
    }
}

// Auto-open first item on page load
document.addEventListener('DOMContentLoaded', function () {
    const firstItem = document.querySelector('.process-accordion-item');
    if (firstItem) {
        setTimeout(() => {
            firstItem.classList.add('active');
        }, 800);
    }
});
