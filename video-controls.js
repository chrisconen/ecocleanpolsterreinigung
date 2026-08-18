// ═══════════════════════════════════════════════════════════
// TECHNOLOGY VIDEO CONTROLS
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function () {
    const video = document.getElementById('techVideo');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const muteBtn = document.getElementById('muteBtn');

    if (!video || !playPauseBtn || !muteBtn) return;

    const playIcon = playPauseBtn.querySelector('.play-icon');
    const pauseIcon = playPauseBtn.querySelector('.pause-icon');
    const volumeIcon = muteBtn.querySelector('.volume-icon');
    const muteIcon = muteBtn.querySelector('.mute-icon');

    // Play/Pause Toggle
    playPauseBtn.addEventListener('click', function () {
        if (video.paused) {
            video.play();
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        } else {
            video.pause();
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        }
    });

    // Mute/Unmute Toggle
    muteBtn.addEventListener('click', function () {
        if (video.muted) {
            video.muted = false;
            muteIcon.style.display = 'none';
            volumeIcon.style.display = 'block';
        } else {
            video.muted = true;
            muteIcon.style.display = 'block';
            volumeIcon.style.display = 'none';
        }
    });

    // Update button state when video ends
    video.addEventListener('ended', function () {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
    });
});
