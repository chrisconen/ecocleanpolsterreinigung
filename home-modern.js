/* Native, keyboard-accessible interactions. Booking remains owned by main.js. */
document.addEventListener('DOMContentLoaded', () => {
  const menu = document.getElementById('ec-menu');
  const toggle = document.querySelector('.ec-menu-toggle');
  const setMenu = (open, returnFocus = false) => {
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    if (returnFocus) toggle.focus();
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false, true);
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.ec-header')) setMenu(false);
  });
  const desktop = matchMedia('(min-width: 961px)');
  desktop.addEventListener('change', () => setMenu(false));

  if (!document.getElementById('configurator')) return;

  document.querySelectorAll('[data-open-booking], [data-booking-button]').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      startAnimation();
    });
  });
  // Prices are read from the same catalog as the configurator.
  document.querySelectorAll('[data-product-price]').forEach(element => {
    const product = STEPS.find(step => step.numbers)?.numbers.find(item => item.name === element.dataset.productPrice);
    if (product) element.textContent = product.price.toLocaleString('de-AT');
  });
  const range = document.getElementById('comparison-range');
  range.addEventListener('input', () => {
    range.parentElement.style.setProperty('--reveal', `${range.value}%`);
    range.setAttribute('aria-valuetext', `${range.value} Prozent Vorher sichtbar`);
  });
  // The existing calendar renders clickable divs; expose their keyboard behavior
  // without changing its date selection, availability or booking contracts.
  const calendar = document.getElementById('calendarWrapper');
  const enhanceCalendar = () => {
    calendar.querySelectorAll('.calendar-day[onclick], .slot-item[onclick]').forEach(element => {
      if (element.hasAttribute('role')) return;
      element.setAttribute('role', 'button');
      element.tabIndex = 0;
      const date = element.getAttribute('onclick').match(/'(\d{4}-\d{2}-\d{2})'/)?.[1];
      if (date) element.setAttribute('aria-label', `Termin am ${new Date(`${date}T12:00:00`).toLocaleDateString('de-AT', {day:'numeric',month:'long',year:'numeric'})} auswählen`);
    });
    const navigation = calendar.querySelectorAll('.calendar-nav-btn');
    navigation.forEach((button, index) => button.setAttribute('aria-label', index === 0 ? 'Vorheriger Monat' : 'Nächster Monat'));
  };
  new MutationObserver(enhanceCalendar).observe(calendar, {childList:true,subtree:true});
  enhanceCalendar();
  calendar.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[role="button"]')) {
      event.preventDefault();
      event.target.click();
    }
  });
  // Do not let the mobile action bar cover the customer fields or mobile keyboard.
  const sticky = document.querySelector('.ec-mobile-action');
  const booking = document.getElementById('configurator');
  new IntersectionObserver(entries => {
    sticky.hidden = entries[0].isIntersecting && booking.classList.contains('active');
    sticky.style.display = sticky.hidden ? 'none' : '';
  }, {threshold: 0}).observe(booking);
});
