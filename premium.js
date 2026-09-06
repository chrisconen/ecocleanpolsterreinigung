/* UI-only preview interactions. Geographic data is static; no location tracking. */
document.addEventListener('DOMContentLoaded', async () => {
  const nav = document.getElementById('px-navigation');
  const menuButton = document.querySelector('.px-menu-toggle');
  const servicesMenu = document.querySelector('.px-services-menu');
  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    if (!open) servicesMenu.open = false;
  }
  menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('click', event => {
    if (!event.target.closest('.px-header')) setMenu(false);
    else if (!servicesMenu.contains(event.target)) servicesMenu.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    // Search inputs consume Escape in some browsers; close the modal explicitly.
    if (dialog.open) { event.preventDefault(); dialog.close(); return; }
    if (servicesMenu.open) { servicesMenu.open = false; servicesMenu.querySelector('summary').focus(); }
    else if (nav.classList.contains('is-open')) { setMenu(false); menuButton.focus(); }
  });
  document.addEventListener('focusin', event => {
    if (!servicesMenu.contains(event.target)) servicesMenu.open = false;
  });
  matchMedia('(min-width:961px)').addEventListener('change', () => setMenu(false));

  const dialog = document.querySelector('.px-location-dialog');
  let locationOpener;
  let previousOverflow;
  document.querySelectorAll('[data-open-locations]').forEach(button => button.addEventListener('click', () => {
    locationOpener = button;
    setMenu(false);
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    dialog.scrollTop = 0;
  }));
  dialog.querySelector('.px-dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const box = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow || '';
    // On mobile the navigation opener is hidden after closing the navigation.
    if (locationOpener?.getClientRects().length) locationOpener.focus();
    else menuButton.focus();
  });

  const config = document.getElementById('configurator');
  if (config) {
    document.querySelectorAll('[data-booking]').forEach(button => button.addEventListener('click', event => {
      event.preventDefault();
      setMenu(false);
      startAnimation();
      requestAnimationFrame(() => {
        config.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'instant' : 'smooth', block:'start'});
        config.focus({preventScroll:true});
      });
    }));
    if (location.hash === '#preis') document.querySelector('[data-booking]').click();
    const compare = document.getElementById('px-comparison');
    const updateComparison = () => {
      compare.parentElement.style.setProperty('--reveal', compare.value + '%');
      compare.setAttribute('aria-valuetext', compare.value + ' Prozent Vorher sichtbar');
    };
    compare.addEventListener('input', updateComparison);
    updateComparison();
  }

  let regions;
  try {
    const response = await fetch('premium-locations.json');
    if (!response.ok) throw new Error('Location data unavailable');
    regions = await response.json();
  } catch {
    document.querySelectorAll('[data-city-tiles]').forEach(container => {
      const message = document.createElement('p');
      message.className = 'px-city-empty';
      message.textContent = 'Die Standortauswahl konnte nicht geladen werden. Wir helfen Ihnen telefonisch unter 0664 9975 4216.';
      container.replaceChildren(message);
    });
    return;
  }
  const normalize = value => value.toLocaleLowerCase('de-AT').replaceAll('ß','ss').replaceAll('ö','oe').replaceAll('ä','ae').replaceAll('ü','ue').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  const loose = value => normalize(value).replaceAll('oe','o').replaceAll('ae','a').replaceAll('ue','u').replaceAll('.','');
  document.querySelectorAll('[data-explorer]').forEach(explorer => {
    let selectedRegion = regions.find(region => region.code === explorer.dataset.defaultRegion) || regions[0];
    let selectedService = explorer.dataset.defaultService === 'matratzenreinigung' ? 'matratzenreinigung' : 'polsterreinigung';
    const search = explorer.querySelector('[data-city-search]');
    const regionSelect = explorer.querySelector('[data-region-select]');
    const clear = explorer.querySelector('[data-clear-search]');
    const tiles = explorer.querySelector('[data-city-tiles]');
    function render() {
      const term = loose(search.value);
      const matches = (term ? regions : [selectedRegion]).flatMap(region => region.cities.filter(city => !term || loose(city.name).includes(term) || loose(region.name).includes(term)).map(city => ({...city, region})));
      explorer.querySelector('[data-region-title]').textContent = term ? 'Ihre Suche' : selectedRegion.name;
      explorer.querySelector('[data-region-eyebrow]').textContent = term ? 'PASSENDE STANDORTE' : 'IHRE REGION';
      explorer.querySelector('[data-region-count]').textContent = String(matches.length).padStart(2,'0');
      explorer.querySelector('[data-city-status]').textContent = matches.length + (matches.length === 1 ? ' Stadt gefunden.' : ' Städte gefunden.');
      clear.hidden = !search.value;
      const serviceName = selectedService === 'polsterreinigung' ? 'Polsterreinigung' : 'Matratzenreinigung';
      const fragment = document.createDocumentFragment();
      for (const city of matches) {
        const link = document.createElement('a');
        link.className = 'px-city-tile';
        link.href = selectedService + '-' + city.slug + '.html';
        link.setAttribute('aria-label', serviceName + ' in ' + city.name);
        const name = document.createElement('span');
        name.textContent = city.name;
        if (term) {
          const region = document.createElement('small');
          region.textContent = city.region.name;
          name.append(region);
        }
        const arrow = document.createElement('span');
        arrow.textContent = '↗';
        arrow.setAttribute('aria-hidden','true');
        link.append(name, arrow);
        fragment.append(link);
      }
      if (!matches.length) {
        const empty = document.createElement('p');
        empty.className = 'px-city-empty';
        empty.textContent = 'Kein passender Standort gefunden. Versuchen Sie einen anderen Stadtnamen oder wählen Sie ein Bundesland.';
        fragment.append(empty);
      }
      tiles.replaceChildren(fragment);
      tiles.scrollTop = 0;
      explorer.querySelectorAll('[data-region]').forEach(path => path.setAttribute('aria-pressed', String(!term && path.dataset.region === selectedRegion.code)));
      explorer.querySelectorAll('[data-map-label]').forEach(label => label.classList.toggle('is-selected', !term && label.dataset.mapLabel === selectedRegion.code));
      explorer.querySelector('[data-region-note]').textContent = term ? 'Wählen Sie eine Stadt für Leistungen und Informationen vor Ort. Anfahrt und Termine sehen Sie im Konfigurator.' : (selectedRegion.min ? 'Mindestbestellwert in dieser Region: ' + selectedRegion.min + ' €. ' : 'Kein Mindestbestellwert im Burgenland. ') + 'Anfahrt und verfügbare Termine sehen Sie im Konfigurator.';
    }
    function chooseRegion(code) {
      selectedRegion = regions.find(region => region.code === code) || regions[0];
      regionSelect.value = selectedRegion.code;
      search.value = '';
      render();
    }
    explorer.querySelectorAll('[data-region]').forEach(path => {
      path.addEventListener('click', () => chooseRegion(path.dataset.region));
      path.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); chooseRegion(path.dataset.region); }
      });
    });
    regionSelect.addEventListener('change', () => chooseRegion(regionSelect.value));
    search.addEventListener('input', render);
    clear.addEventListener('click', () => { search.value = ''; render(); search.focus(); });
    explorer.querySelectorAll('[data-service]').forEach(button => button.addEventListener('click', () => {
      selectedService = button.dataset.service;
      explorer.querySelectorAll('[data-service]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
      render();
    }));
    regionSelect.value = selectedRegion.code;
    explorer.querySelectorAll('[data-service]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.service === selectedService)));
    render();
  });
});
