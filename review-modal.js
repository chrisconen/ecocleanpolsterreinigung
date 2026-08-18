// ═══════════════════════════════════════════════════════════
// REVIEW MODAL - PREMIUM UX/UI
// ═══════════════════════════════════════════════════════════

let currentRating = 0;

// Open Modal
function openReviewModal() {
    const modal = document.getElementById('reviewModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close Modal
function closeReviewModal() {
    const modal = document.getElementById('reviewModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    resetReviewForm();
}

// Close on ESC key
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeReviewModal();
    }
});

// ═══════════════════════════════════════════════════════════
// STAR RATING INTERACTION
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function () {
    const stars = document.querySelectorAll('.review-star');
    const starsLabel = document.getElementById('reviewStarsLabel');
    const ratingInput = document.getElementById('ratingInput');

    const ratingTexts = {
        1: '⭐ Schlecht',
        2: '⭐⭐ Ausreichend',
        3: '⭐⭐⭐ Gut',
        4: '⭐⭐⭐⭐ Sehr gut',
        5: '⭐⭐⭐⭐⭐ Ausgezeichnet'
    };

    stars.forEach((star, index) => {
        // Hover effect
        star.addEventListener('mouseenter', function () {
            const rating = parseInt(this.getAttribute('data-rating'));
            highlightStars(rating);
            starsLabel.textContent = ratingTexts[rating];
        });

        // Click to set rating
        star.addEventListener('click', function () {
            currentRating = parseInt(this.getAttribute('data-rating'));
            ratingInput.value = currentRating;
            highlightStars(currentRating);
            starsLabel.textContent = ratingTexts[currentRating];

            // Add selected class
            stars.forEach(s => s.classList.remove('selected'));
            this.classList.add('selected');
        });
    });

    // Reset on mouse leave
    document.getElementById('reviewStars').addEventListener('mouseleave', function () {
        if (currentRating > 0) {
            highlightStars(currentRating);
            starsLabel.textContent = ratingTexts[currentRating];
        } else {
            highlightStars(0);
            starsLabel.textContent = 'Klicken Sie auf die Sterne';
        }
    });

    function highlightStars(rating) {
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('filled');
            } else {
                star.classList.remove('filled');
            }
        });
    }
});

// ═══════════════════════════════════════════════════════════
// FORM VALIDATION & SUBMISSION
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('reviewForm');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Validate
        if (!validateForm()) {
            return;
        }

        // Show loading state
        const submitBtn = document.getElementById('reviewSubmitBtn');
        const submitText = submitBtn.querySelector('.review-submit-text');
        const submitLoading = submitBtn.querySelector('.review-submit-loading');

        submitBtn.disabled = true;
        submitText.style.display = 'none';
        submitLoading.style.display = 'flex';

        // Prepare form data
        const formData = new FormData(form);

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                // Success
                showSuccess();
            } else {
                // Error
                showError();
            }
        } catch (error) {
            console.error('Error:', error);
            showError();
        } finally {
            // Reset button
            submitBtn.disabled = false;
            submitText.style.display = 'block';
            submitLoading.style.display = 'none';
        }
    });
});

function validateForm() {
    let isValid = true;

    // Clear previous errors
    document.querySelectorAll('.review-form-error').forEach(el => el.textContent = '');
    document.querySelectorAll('.review-form-group input, .review-form-group textarea').forEach(el => {
        el.classList.remove('error');
    });

    // Validate rating
    if (currentRating === 0) {
        document.getElementById('reviewStarsLabel').style.color = '#ef4444';
        isValid = false;
    } else {
        document.getElementById('reviewStarsLabel').style.color = '';
    }

    // Validate name
    const name = document.getElementById('reviewName').value.trim();
    if (name.length < 2) {
        showFieldError('reviewName', 'nameError', 'Bitte geben Sie Ihren Namen ein');
        isValid = false;
    }

    // Validate city
    const city = document.getElementById('reviewCity').value.trim();
    if (city.length < 2) {
        showFieldError('reviewCity', 'cityError', 'Bitte geben Sie Ihre Stadt ein');
        isValid = false;
    }

    // Validate comment
    const comment = document.getElementById('reviewComment').value.trim();
    if (comment.length < 10) {
        showFieldError('reviewComment', 'commentError', 'Bitte geben Sie mindestens 10 Zeichen ein');
        isValid = false;
    }

    return isValid;
}

function showFieldError(fieldId, errorId, message) {
    document.getElementById(fieldId).classList.add('error');
    document.getElementById(errorId).textContent = message;
}

function showSuccess() {
    document.getElementById('reviewForm').style.display = 'none';
    document.querySelector('.review-stars-display').style.display = 'none';
    document.getElementById('reviewSuccess').style.display = 'flex';

    // Close modal after 2 seconds
    setTimeout(() => {
        closeReviewModal();
    }, 2000);
}

function showError() {
    document.getElementById('reviewError').style.display = 'flex';

    // Hide error after 3 seconds
    setTimeout(() => {
        document.getElementById('reviewError').style.display = 'none';
    }, 3000);
}

function resetReviewForm() {
    // Reset form
    document.getElementById('reviewForm').reset();
    currentRating = 0;
    document.getElementById('ratingInput').value = '';

    // Reset stars
    document.querySelectorAll('.review-star').forEach(star => {
        star.classList.remove('filled', 'selected');
    });
    document.getElementById('reviewStarsLabel').textContent = 'Klicken Sie auf die Sterne';
    document.getElementById('reviewStarsLabel').style.color = '';

    // Reset errors
    document.querySelectorAll('.review-form-error').forEach(el => el.textContent = '');
    document.querySelectorAll('.review-form-group input, .review-form-group textarea').forEach(el => {
        el.classList.remove('error');
    });

    // Show form, hide messages
    document.getElementById('reviewForm').style.display = 'block';
    document.querySelector('.review-stars-display').style.display = 'block';
    document.getElementById('reviewSuccess').style.display = 'none';
    document.getElementById('reviewError').style.display = 'none';
}
