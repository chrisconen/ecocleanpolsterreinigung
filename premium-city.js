/* City-page interactions. The shared navigation stays in premium.js. */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.ba-slider-wrap').forEach(wrap => {
    const after = wrap.querySelector('.ba-img-after');
    const line = wrap.querySelector('.ba-slider-line');
    const handle = wrap.querySelector('.ba-slider-handle');
    if (!after || !line || !handle) return;
    const range = document.createElement('input');
    range.type = 'range';
    range.min = '0';
    range.max = '100';
    range.value = '50';
    range.className = 'px-city-comparison';
    range.setAttribute('aria-label', 'Vorher-Nachher-Vergleich verschieben');
    const update = () => {
      after.style.clipPath = `inset(0 ${100 - Number(range.value)}% 0 0)`;
      line.style.left = range.value + '%';
      handle.style.left = range.value + '%';
      range.setAttribute('aria-valuetext', range.value + ' Prozent Vergleich sichtbar');
    };
    range.addEventListener('input', update);
    wrap.append(range);
    update();
  });
});
