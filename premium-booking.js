// ═══════════════════════════════════════════════════════════
// ECO CLEAN - KONFIGURATOR MIT N8N BOOKING INTEGRATION
// Version: 2.2.0 - CENTAUR TRIAD Edition
//   v2.1: Zonen-Mindestbestellwerte (0/199/299 €) + feste Anfahrtszeiten
//         (außerhalb Burgenland nur 11:00 / 13:00 Uhr). Basis: Ungarn 9134.
//   v2.2: Termin-Auswahl verbindlich aus dem Kalender (Fix: Default-Termin 20.07./09:00).
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// INTERSECTION OBSERVER FOR SCROLL ANIMATIONS
// ═══════════════════════════════════════════════════════════
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in-view');

            // Handle staggered animations for child elements
            const staggerChildren = entry.target.querySelectorAll('.stagger-child');
            staggerChildren.forEach((child, index) => {
                setTimeout(() => {
                    child.classList.add('in-view');
                }, index * 100);
            });
        }
    });
}, observerOptions);

// Observe all scroll-reveal elements
document.querySelectorAll('.scroll-reveal, .svg-animated, .process-line, .map-container').forEach(el => {
    observer.observe(el);
});

// ═══════════════════════════════════════════════════════════
// N8N BOOKING WEBHOOK CONFIGURATION
// ═══════════════════════════════════════════════════════════
const N8N_CONFIG = {
    webhookUrl: 'https://hub.centaur-lang.dev/webhook/booking-request',
    // Fallback email if n8n is unavailable
    fallbackEmail: 'chris.conen@gmail.com',
    // Country code for this instance (AT = Austria/Burgenland, HU = Hungary/Győr)
    country: 'AT',
    // Default zone for this website
    defaultZone: 'B'
};
// ═══════════════════════════════════════════════════════════
// KONFIGURATOR — Produkte, Extras und Preise kommen aus
// booking-catalog.js. Diese Datei enthält keine Tarifzahlen.
// Der Katalog ist zugleich die Vorlage für den n8n-Mirror.
// ═══════════════════════════════════════════════════════════
const C = window.ECOBookingCatalog;
const RESTRICTED_START_TIMES = C.RESTRICTED_START_TIMES;
const getZoneRule = C.getZoneRule;
const DYNAMIC_CONTENT = { locations: C.LOCATIONS, conditions: C.CONDITIONS };
const STORAGE_KEY = 'eco-konfigurator-v2';
const PILLOW_PRODUCT = 'Zierkissen (nicht waschmaschinengeeignet)';
const PILLOW_HOSTS = ['L-Couch', 'U-Couch', 'Sofa', 'Ottomane / Récamiere'];
const CUSTOMER_TYPES = {
    'Privatkunde': { icon: '🏠', title: 'Für Ihr Zuhause', desc: 'Persönliche Betreuung für Ihr Zuhause' },
    'Geschäftskunde': { icon: '🏢', title: 'Ihr Firmenrabatt', desc: '10% Rabatt auf Reinigung und Extras', badge: '-10%' }
};

const $ = id => document.getElementById(id);
const euro = value => `${Math.round(value)} €`;
const cents = value => value.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Ersatzgrafik, solange für ein Produkt noch kein Foto vorliegt.
const ICONS = {
    polster: '<path d="M8 24v-6a4 4 0 0 1 4-4h24a4 4 0 0 1 4 4v6"/><path d="M8 24a4 4 0 0 0-4 4v6h40v-6a4 4 0 0 0-4-4"/><path d="M12 24h24"/><path d="M8 34v4M40 34v4"/>',
    matratze: '<path d="M6 16h36a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V18a2 2 0 0 1 2-2Z"/><path d="M14 22v4M24 22v4M34 22v4"/>',
    teppich: '<path d="M9 15h30a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V17a2 2 0 0 1 2-2Z"/><path d="M13 33v4M19 33v4M25 33v4M31 33v4M37 33v4"/><path d="M13 11v4M19 11v4M25 11v4M31 11v4M37 11v4"/>',
    auto: '<path d="M6 30h36"/><path d="M8 30v-5l4-8h20l7 8 3 1v4"/><circle cx="16" cy="33" r="3"/><circle cx="34" cy="33" r="3"/>'
};
const svg = key => `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[key] || ICONS.polster}</svg>`;

const state = {
    customerType: 'Privatkunde',
    serviceType: null,      // abgeleitetes Label für die Buchungsdaten
    categories: [],
    quantities: {},
    couchAddons: {},
    conditions: [],
    location: null,
    selectedDate: null,
    selectedSlot: null
};
let started = false;

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            customerType: state.customerType, categories: state.categories,
            quantities: state.quantities, couchAddons: state.couchAddons,
            conditions: state.conditions, location: state.location
        }));
    } catch { /* privater Modus */ }
}

// Gespeicherte Auswahl ist Alt-Bestand: nur übernehmen, was der Katalog heute
// noch kennt, sonst tauchen längst entfernte Positionen im Preis wieder auf.
function restoreState() {
    let stored;
    try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return; }
    if (!stored || typeof stored !== 'object') return;
    state.customerType = stored.customerType === 'Geschäftskunde' ? 'Geschäftskunde' : 'Privatkunde';
    state.categories = (stored.categories || []).filter(id => C.CATEGORIES.some(category => category.id === id));
    state.conditions = (stored.conditions || []).filter(name => Object.hasOwn(C.CONDITIONS, name));
    state.location = C.LOCATIONS[stored.location] ? stored.location : null;
    C.PRODUCTS.forEach(product => {
        const quantity = Math.max(0, Math.min(99, Math.trunc(Number(stored.quantities?.[product.name]) || 0)));
        if (!quantity) return;
        state.quantities[product.name] = quantity;
        const units = Array.isArray(stored.couchAddons?.[product.name]) ? stored.couchAddons[product.name] : [];
        state.couchAddons[product.name] = Array.from({ length: quantity }, (unused, index) =>
            (units[index] || []).filter(id => C.getAddon(id)?.prices[product.name] !== undefined));
    });
}

const quantityOf = name => state.quantities[name] || 0;
const visibleProducts = () => C.PRODUCTS.filter(product =>
    !state.categories.length || state.categories.includes(product.category));

function calculateBooking(selection = state) {
    return C.calculateBooking({ ...selection, zone: C.LOCATIONS[selection.location]?.zone });
}

// ── Schritt 1 und 4: Chips ──────────────────────────────────────────────────
function buildChips(container, items, isSelected, onToggle) {
    container.replaceChildren();
    items.forEach(item => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'cfg-chip';
        chip.append(document.createTextNode(item.label));
        if (item.badge) {
            const badge = document.createElement('small');
            badge.textContent = item.badge;
            chip.append(badge);
        }
        chip.setAttribute('aria-pressed', String(isSelected(item)));
        chip.addEventListener('click', () => { onToggle(item); renderAll(); });
        container.append(chip);
    });
}

function renderCustomerType() {
    buildChips($('cfgCustomer'), [
        { label: 'Privatkunde', value: 'Privatkunde' },
        { label: 'Geschäftskunde', value: 'Geschäftskunde', badge: `−${C.BUSINESS_DISCOUNT_PERCENT}%` }
    ], item => state.customerType === item.value, item => { state.customerType = item.value; });
}

function renderConditions() {
    buildChips($('cfgConditions'), Object.entries(C.CONDITIONS).map(([name, data]) => ({
        label: `${data.icon} ${name}`, value: name, badge: data.badge
    })), item => state.conditions.includes(item.value), item => {
        state.conditions = state.conditions.includes(item.value)
            ? state.conditions.filter(name => name !== item.value)
            : [...state.conditions, item.value];
    });
    const note = $('cfgConditionNote');
    const selected = state.conditions.map(name => `<strong>${C.CONDITIONS[name].title}:</strong> ${C.CONDITIONS[name].desc}`);
    note.hidden = selected.length === 0;
    if (selected.length) $('cfgConditionNoteText').innerHTML = selected.join('<br>');
}

// ── Schritt 2: Kategorien ───────────────────────────────────────────────────
function renderCategories() {
    const container = $('cfgCategories');
    container.replaceChildren();
    C.CATEGORIES.forEach(category => {
        const chosen = state.categories.includes(category.id);
        const count = C.PRODUCTS.filter(product => product.category === category.id)
            .reduce((sum, product) => sum + quantityOf(product.name), 0);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'cfg-cat';
        button.setAttribute('aria-pressed', String(chosen));
        button.innerHTML = svg(category.id);
        const title = document.createElement('strong');
        title.textContent = category.label;
        const desc = document.createElement('span');
        desc.textContent = category.desc;
        button.append(title, desc);
        if (count) {
            const badge = document.createElement('span');
            badge.className = 'cfg-cat-count';
            badge.textContent = `${count} ausgewählt`;
            button.append(badge);
        }
        button.addEventListener('click', () => toggleCategory(category.id));
        container.append(button);
    });
}

// Eine abgewählte Kategorie darf keine unsichtbaren Positionen zurücklassen.
function toggleCategory(id) {
    if (state.categories.includes(id)) {
        state.categories = state.categories.filter(entry => entry !== id);
        C.PRODUCTS.filter(product => product.category === id).forEach(product => {
            delete state.quantities[product.name];
            delete state.couchAddons[product.name];
        });
    } else {
        state.categories = [...state.categories, id];
    }
    renderAll();
}

// ── Schritt 3: Produktkarten ────────────────────────────────────────────────
function renderProducts() {
    const container = $('cfgProducts');
    container.replaceChildren();
    const groups = C.CATEGORIES.filter(category =>
        visibleProducts().some(product => product.category === category.id));
    groups.forEach(category => {
        const group = document.createElement('div');
        group.className = 'cfg-group';
        const heading = document.createElement('h3');
        heading.textContent = category.label;
        const grid = document.createElement('div');
        grid.className = 'cfg-grid';
        visibleProducts().filter(product => product.category === category.id)
            .forEach(product => grid.append(buildCard(product)));
        group.append(heading, grid);
        container.append(group);
    });
}

function buildCard(product) {
    const quantity = quantityOf(product.name);
    const card = document.createElement('article');
    card.className = 'cfg-card' + (quantity ? ' is-active' : '');
    if (quantity && C.hasAddons(product.name)) card.classList.add('is-open');

    const media = document.createElement('div');
    media.className = 'cfg-media';
    const image = document.createElement('img');
    // Varianten desselben Möbelstücks teilen sich ein Foto (ui.image).
    image.src = `images/config/${product.ui.image || product.ui.id}.webp`;
    image.alt = `${product.name} — Reinigung durch ECO Clean Österreich`;
    image.loading = 'lazy';
    image.decoding = 'async';
    // Fehlt das Foto, tritt das Kategorie-Icon an seine Stelle; Badge und
    // Mengenmarker bleiben erhalten.
    image.addEventListener('error', () => {
        const holder = document.createElement('div');
        holder.innerHTML = svg(product.category);
        image.replaceWith(holder.firstElementChild);
    }, { once: true });
    media.append(image);
    if (product.ui.badge) {
        const badge = document.createElement('span');
        badge.className = 'cfg-badge';
        badge.textContent = product.ui.badge;
        media.append(badge);
    }
    if (quantity) {
        const flag = document.createElement('span');
        flag.className = 'cfg-qty-flag';
        flag.textContent = `${quantity}×`;
        media.append(flag);
    }

    const body = document.createElement('div');
    body.className = 'cfg-card-body';
    const title = document.createElement('h4');
    title.textContent = product.name;
    const blurb = document.createElement('p');
    blurb.className = 'cfg-card-blurb';
    blurb.textContent = product.ui.blurb;
    const price = document.createElement('p');
    price.className = 'cfg-price';
    price.innerHTML = `<strong>${product.price} €</strong> / Stück · ca. ${product.duration} Min.`;
    body.append(title, blurb, price, buildTip(`Was zählt als „${product.name}"?`, product.ui.tip));

    const stepper = document.createElement('div');
    stepper.className = 'cfg-stepper';
    const label = document.createElement('span');
    label.textContent = 'Anzahl';
    const controls = document.createElement('div');
    const minus = stepButton('−', `${product.name}: Anzahl verringern`, () => changeQty(product.name, -1));
    minus.disabled = quantity === 0;
    const count = document.createElement('span');
    count.className = 'cfg-count';
    count.textContent = String(quantity);
    count.setAttribute('aria-live', 'polite');
    count.setAttribute('aria-label', `${product.name}: ${quantity} Stück`);
    controls.append(minus, count, stepButton('+', `${product.name}: Anzahl erhöhen`, () => changeQty(product.name, 1)));
    stepper.append(label, controls);
    body.append(stepper);
    card.append(media, body);

    if (quantity && C.hasAddons(product.name)) card.append(buildExtras(product, quantity));
    return card;
}

function stepButton(glyph, label, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cfg-step-btn';
    button.textContent = glyph;
    button.setAttribute('aria-label', label);
    button.addEventListener('click', onClick);
    return button;
}

function buildTip(summaryText, bodyText) {
    const details = document.createElement('details');
    details.className = 'cfg-tip';
    const summary = document.createElement('summary');
    summary.textContent = summaryText;
    const body = document.createElement('p');
    body.textContent = bodyText;
    details.append(summary, body);
    return details;
}

function changeQty(name, delta) {
    const next = Math.max(0, Math.min(99, quantityOf(name) + delta));
    if (next === 0) {
        delete state.quantities[name];
        delete state.couchAddons[name];
    } else {
        state.quantities[name] = next;
        const units = state.couchAddons[name] || [];
        // Entfernte Stücke nehmen ihre Extras mit — sie dürfen nicht zurückkommen.
        state.couchAddons[name] = Array.from({ length: next }, (unused, index) => units[index] || []);
    }
    renderAll();
}

// ── Extras ──────────────────────────────────────────────────────────────────
// 'unit'-Produkte bekommen pro Stück eine eigene Auswahl, 'all'-Produkte eine
// gemeinsame. Intern ist beides dieselbe Struktur, damit die Preisberechnung
// nur einen Fall kennt.
function buildExtras(product, quantity) {
    const wrapper = document.createElement('div');
    wrapper.className = 'cfg-extras';
    const perUnit = product.addonScope === 'unit';
    const units = perUnit ? Array.from({ length: quantity }, (unused, index) => index) : [0];
    const available = C.addonsFor(product.name);
    const choiceGroups = [...new Set(available.filter(addon => addon.group).map(addon => addon.group))];
    units.forEach(unitIndex => {
        choiceGroups.forEach(groupId => {
            wrapper.append(buildChoiceGroup(product, groupId,
                available.filter(addon => addon.group === groupId), unitIndex, perUnit, quantity));
        });
        const fieldset = document.createElement('fieldset');
        fieldset.className = 'cfg-unit';
        const legend = document.createElement('legend');
        legend.textContent = perUnit
            ? `${product.name}${quantity > 1 ? ` ${unitIndex + 1}` : ''} · Passende Extras`
            : `Extras für alle ${quantity} Stück`;
        fieldset.append(legend);
        available.filter(addon => !addon.group).forEach(addon => {
            fieldset.append(buildAddonRow(product, addon, unitIndex, perUnit, quantity));
        });
        if (PILLOW_HOSTS.includes(product.name) && unitIndex === 0) fieldset.append(buildPillowRow());
        wrapper.append(fieldset);
    });
    const note = document.createElement('p');
    note.textContent = perUnit
        ? 'Die Extras gelten jeweils für ein Möbelstück. Welche Behandlung möglich ist, hängt von Material und Zustand ab — nicht jeder Fleck und nicht jeder Geruch lässt sich vollständig entfernen.'
        : `Diese Auswahl gilt für alle ${quantity} Stück. Welche Behandlung möglich ist, hängt von Material und Zustand ab — nicht jeder Fleck und nicht jeder Geruch lässt sich vollständig entfernen.`;
    wrapper.append(note);
    return wrapper;
}

// Sich ausschließende Pflichtangaben (Material, Florhöhe) als Radiogruppe.
// Die Standardvariante ist im Grundpreis enthalten und setzt keinen Aufschlag.
function buildChoiceGroup(product, groupId, addons, unitIndex, perUnit, quantity) {
    const meta = C.ADDON_GROUPS[groupId];
    const selected = state.couchAddons[product.name]?.[unitIndex] || [];
    const active = addons.find(addon => selected.includes(addon.id));
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'cfg-unit cfg-choice-group';
    const legend = document.createElement('legend');
    legend.textContent = perUnit && quantity > 1
        ? `${product.name} ${unitIndex + 1} · ${meta.label}`
        : `${product.name} · ${meta.label}`;
    fieldset.append(legend);
    const radioName = `${product.ui.id}-${groupId}-${unitIndex}`;

    const option = (id, label, price, tip, description) => {
        const row = document.createElement('label');
        row.className = 'cfg-addon';
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = radioName;
        input.checked = (active?.id || null) === id;
        input.addEventListener('change', () => selectChoice(product, groupId, id, unitIndex, perUnit));
        const name = document.createElement('span');
        name.className = 'cfg-addon-name';
        name.textContent = label;
        const cost = document.createElement('span');
        cost.className = 'cfg-addon-price';
        cost.textContent = price ? `+${price} €` : 'im Preis';
        const desc = document.createElement('p');
        desc.className = 'cfg-addon-desc';
        desc.textContent = description;
        row.append(input, name, cost, desc, buildTip('Wann trifft das zu?', tip));
        return row;
    };

    fieldset.append(option(null, meta.baseLabel, 0, meta.baseTip, 'Standardfall — kein Aufschlag.'));
    addons.forEach(addon => fieldset.append(
        option(addon.id, addon.name, addon.prices[product.name], addon.tip, addon.description)));

    // Was wir nicht reinigen, gehört sichtbar in die Liste — sonst bucht jemand
    // einen Termin, den wir vor Ort absagen müssten.
    if (meta.unavailable) {
        const row = document.createElement('label');
        row.className = 'cfg-addon cfg-addon-blocked';
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = radioName;
        input.disabled = true;
        const name = document.createElement('span');
        name.className = 'cfg-addon-name';
        name.textContent = meta.unavailable.label;
        const cost = document.createElement('span');
        cost.className = 'cfg-addon-price';
        cost.textContent = 'nicht möglich';
        const desc = document.createElement('p');
        desc.className = 'cfg-addon-desc';
        desc.textContent = meta.unavailable.reason;
        row.append(input, name, cost, desc);
        fieldset.append(row);
    }
    return fieldset;
}

function selectChoice(product, groupId, addonId, unitIndex, perUnit) {
    const groupIds = C.ADDONS.filter(addon => addon.group === groupId).map(addon => addon.id);
    const apply = units => {
        const next = units.filter(id => !groupIds.includes(id));
        if (addonId) next.push(addonId);
        return next;
    };
    const units = state.couchAddons[product.name] || [];
    state.couchAddons[product.name] = perUnit
        ? units.map((entry, index) => (index === unitIndex ? apply(entry || []) : entry || []))
        : units.map(entry => apply(entry || []));
    renderAll();
}

// Kissen werden dort angeboten, wo sie liegen — an der Couch. Gebucht wird
// dabei die reguläre Position „Zierkissen", damit Buchungsdaten und Tarif
// unverändert bleiben.
function buildPillowRow() {
    const product = C.getProduct(PILLOW_PRODUCT);
    const quantity = quantityOf(PILLOW_PRODUCT);
    const row = document.createElement('div');
    row.className = 'cfg-addon cfg-count-row' + (quantity ? ' is-on' : '');
    const name = document.createElement('span');
    name.className = 'cfg-addon-name';
    name.textContent = 'Kissen mitreinigen, die nicht in die Waschmaschine passen';
    const controls = document.createElement('span');
    controls.className = 'cfg-count-controls';
    const minus = stepButton('−', 'Kissen: Anzahl verringern', () => changeQty(PILLOW_PRODUCT, -1));
    minus.disabled = quantity === 0;
    const value = document.createElement('span');
    value.className = 'cfg-count';
    value.textContent = String(quantity);
    controls.append(minus, value, stepButton('+', 'Kissen: Anzahl erhöhen', () => changeQty(PILLOW_PRODUCT, 1)));
    const desc = document.createElement('p');
    desc.className = 'cfg-addon-desc';
    desc.textContent = `${product.price} € pro Kissen · ${quantity ? `derzeit ${quantity} Stück, ` : ''}erscheint als eigene Position in der Übersicht.`;
    row.append(name, controls, desc, buildTip('Welche Kissen sind gemeint?', product.ui.tip));
    return row;
}

function buildAddonRow(product, addon, unitIndex, perUnit, quantity) {
    const selected = state.couchAddons[product.name]?.[unitIndex] || [];
    const blockedByIntensive = addon.id === 'odor' && selected.includes('intensive');
    const unitPrice = addon.prices[product.name];
    const totalPrice = perUnit ? unitPrice : unitPrice * quantity;

    const label = document.createElement('label');
    label.className = 'cfg-addon';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = selected.includes(addon.id);
    input.disabled = blockedByIntensive;
    input.setAttribute('aria-label',
        `${product.name}${perUnit && quantity > 1 ? ` ${unitIndex + 1}` : ''}: ${addon.name}, plus ${totalPrice} Euro`);
    input.addEventListener('change', () => toggleAddon(product, addon.id, unitIndex, perUnit, input.checked));

    const name = document.createElement('span');
    name.className = 'cfg-addon-name';
    name.textContent = addon.name;
    const price = document.createElement('span');
    price.className = 'cfg-addon-price';
    price.textContent = perUnit ? `+${unitPrice} €` : `+${totalPrice} €`;
    const desc = document.createElement('p');
    desc.className = 'cfg-addon-desc';
    desc.textContent = blockedByIntensive
        ? 'Bereits in der gewählten Intensivreinigung enthalten — wird nicht doppelt berechnet.'
        : (!perUnit && quantity > 1 ? `${addon.description} (${unitPrice} € pro Stück)` : addon.description);

    label.append(input, name, price, desc);
    // Bei „Haustiere" die dafür gedachten Extras hervorheben, ohne sie
    // vorauszuwählen — berechnet wird nur, was angehakt ist.
    if (state.conditions.includes('Haustiere') && ['odor', 'hair'].includes(addon.id) && !blockedByIntensive) {
        const hint = document.createElement('span');
        hint.className = 'cfg-addon-hint';
        hint.textContent = 'Passt zu Ihrem Hinweis „Haustiere"';
        label.append(hint);
    }
    label.append(buildTip('Wann lohnt sich das?', addon.tip));
    return label;
}

function toggleAddon(product, addonId, unitIndex, perUnit, checked) {
    const apply = units => {
        let next = units.filter(id => id !== addonId);
        if (checked) next.push(addonId);
        // Die Intensivreinigung enthält die Geruchsbehandlung bereits.
        if (next.includes('intensive')) next = next.filter(id => id !== 'odor');
        return next;
    };
    const units = state.couchAddons[product.name] || [];
    state.couchAddons[product.name] = perUnit
        ? units.map((entry, index) => (index === unitIndex ? apply(entry || []) : entry || []))
        : units.map(entry => apply(entry || []));
    renderAll();
}

// ── Cross-Selling ───────────────────────────────────────────────────────────
function addProduct(name) {
    if (C.getProduct(name)) changeQty(name, 1);
}

// Ohne Filter sind ohnehin alle Kategorien sichtbar — dann genügt der Sprung
// zur passenden Gruppe.
function revealCategory(id) {
    if (state.categories.length && !state.categories.includes(id)) {
        state.categories = [...state.categories, id];
        renderAll();
    }
    const label = C.CATEGORIES.find(category => category.id === id).label;
    [...document.querySelectorAll('#cfgProducts .cfg-group > h3')]
        .find(heading => heading.textContent === label)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function suggestions() {
    const list = [];
    const hasSeating = PILLOW_HOSTS.some(name => quantityOf(name) > 0);
    const chosenAddons = Object.values(state.couchAddons).flat(2);

    if (hasSeating && !quantityOf('Hocker / Pouf')) list.push({
        text: 'Der Fußhocker wird am häufigsten benutzt und ist meist schneller grau als die Couch selbst.',
        label: 'Hocker / Pouf', price: C.getProduct('Hocker / Pouf').price, run: () => addProduct('Hocker / Pouf')
    });
    if (hasSeating && !quantityOf(PILLOW_PRODUCT)) list.push({
        text: 'Große Kissen, die nicht in die Waschmaschine passen, reinigen wir im selben Termin mit.',
        label: 'Zierkissen', price: C.getProduct(PILLOW_PRODUCT).price, run: () => addProduct(PILLOW_PRODUCT)
    });
    if (state.conditions.includes('Haustiere') && hasSeating
        && !chosenAddons.some(id => ['odor', 'hair', 'intensive'].includes(id))) list.push({
            text: 'Sie haben Haustiere angegeben. Tierhaare und Geruch sind zwei getrennte Arbeitsschritte — beide sind optional.',
            label: 'Extras beim Möbelstück wählen',
            run: () => $('cfgStep3').scrollIntoView({ behavior: 'smooth', block: 'start' })
        });
    // Die Anfahrt fällt pro Termin einmal an — der ehrlichste Kombi-Anreiz.
    const usedCategories = new Set(C.PRODUCTS.filter(product => quantityOf(product.name) > 0).map(product => product.category));
    if (usedCategories.size === 1 && !usedCategories.has('matratze')) list.push({
        text: `Die Anfahrt von ${C.TRAVEL_FEE} € fällt pro Termin nur einmal an — Matratzen im selben Termin sparen eine zweite Anfahrt.`,
        label: 'Matratzen dazunehmen', run: () => revealCategory('matratze')
    });
    // Trockenreinigung deckt Flecken und Gerüche nicht ab.
    const dryMattress = C.PRODUCTS.find(product => product.category === 'matratze'
        && product.name.includes('(Trocken)') && quantityOf(product.name) > 0);
    if (dryMattress && state.conditions.some(name => ['Haustiere', 'Kleinkinder'].includes(name))) {
        const wet = C.getProduct(dryMattress.name.replace('(Trocken)', '(Nass)'));
        if (wet && !quantityOf(wet.name)) list.push({
            text: `Bei Flecken und Gerüchen kommt die Trockenreinigung an ihre Grenze — die Nassvariante von „${dryMattress.name}" arbeitet mit Sprühextraktion.`,
            label: wet.name, price: wet.price, run: () => addProduct(wet.name)
        });
    }
    return list.slice(0, 3);
}

function renderSuggestions() {
    const box = $('cfgSuggest');
    const list = suggestions();
    box.hidden = list.length === 0;
    if (!list.length) return;
    const holder = $('cfgSuggestList');
    holder.replaceChildren();
    $('cfgSuggestText').textContent = list[0].text;
    list.forEach(entry => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'cfg-suggest-btn';
        button.append(document.createTextNode(`+ ${entry.label}`));
        if (entry.price) {
            const price = document.createElement('b');
            price.textContent = `${entry.price} €`;
            button.append(price);
        }
        button.addEventListener('click', entry.run);
        holder.append(button);
    });
}

// ── Schritt 5: Ort ──────────────────────────────────────────────────────────
function renderLocationOptions() {
    const select = $('location');
    if (select.options.length > 1) return;
    C.REGION_ORDER.forEach(region => {
        const group = document.createElement('optgroup');
        group.label = region;
        Object.entries(C.LOCATIONS)
            .filter(([, location]) => location.region === region)
            .forEach(([key, location]) => {
                const option = document.createElement('option');
                option.value = key;
                const rule = C.getZoneRule(location.zone);
                option.textContent = location.name + (rule.minOrder ? ` · ab ${rule.minOrder} €` : '');
                group.append(option);
            });
        select.append(group);
    });
}

function handleLocationChange(select) {
    state.location = select.value || null;
    renderAll();

    if (state.location && typeof BookingCalendar !== 'undefined') {
        const location = C.LOCATIONS[state.location];
        const wrapper = $('calendarWrapper');
        if (wrapper) { wrapper.style.display = 'block'; wrapper.classList.add('visible'); }
        BookingCalendar.setCity(location.name.split('/')[0]);
        // Außerhalb des Burgenlands sind nur feste Startzeiten fahrbar.
        const rule = getZoneRule(location.zone);
        if (typeof BookingCalendar.setAllowedStartTimes === 'function') {
            BookingCalendar.setAllowedStartTimes(rule.restrictHours ? RESTRICTED_START_TIMES : null);
        }
    }
}

function renderLocationNotes() {
    const location = state.location ? C.LOCATIONS[state.location] : null;
    const rule = getZoneRule(location?.zone);
    $('cfgAddress').hidden = !location;
    const minNote = $('cfgMinNote');
    minNote.hidden = !location || !rule.minOrder;
    if (location && rule.minOrder) {
        $('cfgMinNoteText').innerHTML = `In <strong>${location.name}</strong> gilt ein Mindestbestellwert von <strong>${rule.minOrder} €</strong> inklusive Anfahrt. Kombinieren Sie mehrere Möbelstücke in einem Termin, dann arbeitet der Betrag für Sie statt gegen Sie.`;
    }
    const hoursNote = $('cfgHoursNote');
    hoursNote.hidden = !location || !rule.restrictHours;
    if (location && rule.restrictHours) {
        $('cfgHoursNoteText').innerHTML = `Anfahrt aus dem Burgenland: In <strong>${location.name}</strong> starten wir um <strong>${RESTRICTED_START_TIMES.join(' oder ')} Uhr</strong>. Andere Uhrzeiten lassen sich dort nicht zuverlässig einhalten.`;
    }
}

// ── Preisleiste ─────────────────────────────────────────────────────────────
let displayedTotal = 0;
function animateTotal(target) {
    const element = $('cfgTotal');
    const from = displayedTotal;
    // Erst den richtigen Wert schreiben, dann animieren: im Hintergrund-Tab
    // laufen keine Animationsframes, der Preis muss trotzdem stimmen.
    element.textContent = euro(target);
    if (from === target || document.visibilityState !== 'visible'
        || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        displayedTotal = target;
        return;
    }
    const start = performance.now(), duration = 400;
    const tick = now => {
        const progress = Math.min(1, (now - start) / duration);
        displayedTotal = from + (target - from) * (1 - Math.pow(1 - progress, 3));
        element.textContent = euro(displayedTotal);
        if (progress < 1) requestAnimationFrame(tick);
        else { displayedTotal = target; element.textContent = euro(target); }
    };
    requestAnimationFrame(tick);
}

function renderRail(quote) {
    // Steht in der Leiste gerade ein Ergebnis oder eine Störung, bleibt sie
    // stehen — sonst würde eine Mengenänderung die Bestätigung überschreiben.
    if (!$('cfgTotal')) return;
    const empty = quote.itemCount === 0;
    animateTotal(empty ? 0 : quote.finalTotal);
    $('cfgTotalNote').textContent = empty
        ? 'Noch nichts ausgewählt — der Preis aktualisiert sich bei jeder Änderung.'
        : `Endpreis inkl. Anfahrt und aller gewählten Extras · ${quote.itemCount} Möbelstück${quote.itemCount > 1 ? 'e' : ''}`;

    const lines = $('cfgLines');
    lines.replaceChildren();
    $('cfgEmpty').hidden = !empty;
    quote.services.forEach(item => {
        const row = document.createElement('li');
        if (item.addonId) row.className = 'is-addon';
        const name = document.createElement('span');
        name.textContent = item.addonId
            ? `${item.parentProduct} ${item.parentUnit}: ${C.getAddon(item.addonId).name}`
            : `${item.quantity}× ${item.name}`;
        const price = document.createElement('span');
        price.className = 'cfg-line-price';
        price.textContent = `${item.totalPrice} €`;
        row.append(name, price);
        if (!item.addonId) {
            const drop = document.createElement('button');
            drop.type = 'button';
            drop.className = 'cfg-line-drop';
            drop.textContent = '×';
            drop.setAttribute('aria-label', `${item.name} entfernen`);
            drop.addEventListener('click', () => {
                delete state.quantities[item.name];
                delete state.couchAddons[item.name];
                renderAll();
            });
            row.append(drop);
        }
        lines.append(row);
    });

    const show = (id, condition, text) => {
        const row = $(id);
        row.hidden = !condition;
        if (condition) row.querySelector('strong').textContent = text;
    };
    show('cfgSumBase', quote.baseTotal > 0, `${quote.baseTotal} €`);
    show('cfgSumAddons', quote.addonTotal > 0, `+${quote.addonTotal} €`);
    show('cfgSumDiscount', quote.discountAmount > 0, `−${cents(quote.discountAmount)} €`);
    show('cfgSumCondition', quote.conditionSurcharge > 0, `+${cents(quote.conditionSurcharge)} €`);
    show('cfgSumPets', quote.petSurcharge > 0, `+${cents(quote.petSurcharge)} €`);
    show('cfgSumTravel', !empty, `+${quote.travelFee} €`);
    show('cfgSumMinimum', quote.minimumAdjustment > 0, `+${cents(quote.minimumAdjustment)} €`);
    show('cfgSumRounding', quote.roundingAdjustment !== 0,
        `${quote.roundingAdjustment > 0 ? '+' : ''}${cents(quote.roundingAdjustment)} €`);
    $('cfgSumTotal').querySelector('strong').textContent = empty ? '0 €' : euro(quote.finalTotal);

    const hours = Math.floor(quote.totalDuration / 60), minutes = quote.totalDuration % 60;
    $('cfgDuration').textContent = quote.totalDuration
        ? (hours ? `${hours} h${minutes ? ` ${minutes} Min.` : ''}` : `${minutes} Min.`)
        : '—';

    // Mindestbestellwert als Fortschritt: zeigt, wie viel noch fehlt.
    const bar = $('cfgMinBar');
    bar.hidden = !quote.minimum || empty;
    if (!bar.hidden) {
        const reached = quote.minimumAdjustment === 0;
        const current = quote.finalTotal - quote.minimumAdjustment;
        bar.classList.toggle('is-reached', reached);
        $('cfgMinFill').style.width = `${Math.min(100, (current / quote.minimum) * 100)}%`;
        $('cfgMinText').textContent = reached
            ? `Mindestbestellwert von ${quote.minimum} € erreicht.`
            : `Noch ${euro(quote.minimum - current)} bis zum Mindestbestellwert von ${quote.minimum} € — dieser Betrag wird sonst als Differenz aufgeschlagen.`;
    }

    $('submitBtn').disabled = empty;
    $('cfgBarTotal').textContent = empty ? '0 €' : euro(quote.finalTotal);
    $('cfgBarNote').textContent = empty ? 'Noch keine Auswahl' : `${quote.itemCount} Stück · inkl. Anfahrt`;
}

function renderProgress(quote) {
    const done = [
        Boolean(state.customerType),
        state.categories.length > 0 || quote.itemCount > 0,
        quote.itemCount > 0,
        quote.itemCount > 0,
        Boolean(state.location),
        Boolean(state.selectedSlot)
    ];
    $('cfgProgress').querySelectorAll('span').forEach((bar, index) => {
        bar.classList.toggle('is-done', Boolean(done[index]));
    });
    [1, 2, 3, 4, 5, 6].forEach(step => {
        $(`cfgStep${step}`)?.classList.toggle('is-done', Boolean(done[step - 1]));
    });
}

// ── Gesamt-Render ───────────────────────────────────────────────────────────
function updateSummary() { renderAll(); }

function renderAll() {
    const quote = calculateBooking();
    // Abgeleitetes Label für die Buchungsdaten und die Badges.
    const used = C.CATEGORIES.filter(category =>
        C.PRODUCTS.some(product => product.category === category.id && quantityOf(product.name) > 0));
    state.serviceType = used.map(category => category.label).join(' + ') || null;

    renderCustomerType();
    renderCategories();
    renderProducts();
    renderConditions();
    renderSuggestions();
    renderLocationNotes();
    renderRail(quote);
    renderProgress(quote);
    updateHeroBadges();
    saveState();

    // Eine längere Reinigung darf keinen bereits bestätigten, kürzeren Slot behalten.
    if (typeof BookingCalendar !== 'undefined' && BookingCalendar.setRequiredDuration) {
        if (BookingCalendar.state.requiredDuration !== quote.totalDuration) {
            if (BookingCalendar.getSelectedSlot()) {
                BookingCalendar.backToCalendar();
                state.selectedSlot = null;
                state.selectedDate = null;
            }
            BookingCalendar.setRequiredDuration(quote.totalDuration);
        }
    }
    renderAppointment(state.selectedSlot
        ? { date: state.selectedDate, slot: state.selectedSlot, isFirstSlot: state.selectedSlot.isFirstSlot }
        : null);
}

function resetConfigurator() {
    state.customerType = 'Privatkunde';
    state.categories = [];
    state.quantities = {};
    state.couchAddons = {};
    state.conditions = [];
    state.location = null;
    state.selectedDate = null;
    state.selectedSlot = null;
    $('location').value = '';
    ['street', 'plz', 'city', 'contactName', 'contactEmail', 'contactEmailConfirm', 'contactPhone', 'contactMessage']
        .forEach(id => { const field = $(id); if (field) field.value = ''; });
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* privater Modus */ }
    renderAll();
}

// ═══════════════════════════════════════════════════════════
// UPDATE HERO BADGES (Desktop + Mobile)
// ═══════════════════════════════════════════════════════════
function updateHeroBadges() {
    const heroBadges = document.getElementById('heroBadges');
    const mobileBadgeList = document.getElementById('mobileBadgeList');
    const mobileBadgeCount = document.getElementById('mobileBadgeCount');
    const mobileBadgeBar = document.getElementById('mobileBadgeBar');

    const badges = [];

    // Build badges array in CHRONOLOGICAL order (booking flow)
    // 1. Customer Type
    if (state.customerType && CUSTOMER_TYPES[state.customerType]) {
        badges.push(CUSTOMER_TYPES[state.customerType]);
    }

    // 2. Gewählte Kategorien — ein Badge pro tatsächlich belegter Kategorie
    C.CATEGORIES.filter(category => C.PRODUCTS.some(product =>
        product.category === category.id && (state.quantities[product.name] || 0) > 0))
        .forEach(category => badges.push({
            icon: '🧽', title: category.label, desc: category.desc
        }));

    // 3. Conditions (in order they were selected)
    state.conditions.forEach(cond => {
        if (DYNAMIC_CONTENT.conditions[cond]) {
            badges.push(DYNAMIC_CONTENT.conditions[cond]);
        }
    });

    // 4. Location
    if (state.location && DYNAMIC_CONTENT.locations[state.location]) {
        const loc = DYNAMIC_CONTENT.locations[state.location];
        badges.push({
            icon: "📍",
            title: loc.name,
            desc: `${loc.info} · 20 € Anfahrt`
        });

        // 5. Mindestbestellwert – prominent highlight badge (zonenabhängig: 199 € / 299 €)
        const locMin = getZoneRule(loc.zone).minOrder;
        if (locMin > 0) {
            badges.push({
                icon: "📦",
                title: `Mindestbestellwert: ${locMin} €`,
                desc: "Kombinieren Sie Couch, Sessel & Matratzen in einem Termin.",
                badge: "WICHTIG",
                highlight: true
            });
        }

        // 5b. Feste Anfahrtszeiten – außerhalb Burgenland nur 11:00 / 13:00 Uhr
        if (getZoneRule(loc.zone).restrictHours) {
            badges.push({
                icon: "🕐",
                title: "Termine um 11:00 oder 13:00 Uhr",
                desc: "In dieser Region beginnt die Reinigung um 11:00 oder 13:00 Uhr.",
                badge: "INFO"
            });
        }
    }

    // Update badge count
    if (mobileBadgeCount) {
        mobileBadgeCount.textContent = badges.length;
    }

    // Show/hide mobile badge bar
    if (mobileBadgeBar) {
        if (badges.length > 0) {
            mobileBadgeBar.classList.remove('hidden');
        } else {
            mobileBadgeBar.classList.add('hidden');
        }
    }

    // Render to DESKTOP (hero-badges) - OPTIMIZED: Only add NEW badges
    if (heroBadges) {
        // Get current badge titles to compare
        const existingBadges = Array.from(heroBadges.querySelectorAll('.hero-badge-item'))
            .map(el => el.dataset.badgeTitle);

        // Show container if we have badges
        if (badges.length > 0) {
            heroBadges.classList.add('visible');

            // Only add badges that don't exist yet
            badges.forEach((data, index) => {
                const badgeTitle = data.title;

                // Check if this badge already exists
                if (!existingBadges.includes(badgeTitle)) {
                    const badgeEl = createBadgeElement(data);
                    badgeEl.dataset.badgeTitle = badgeTitle; // Store title for comparison
                    heroBadges.appendChild(badgeEl);

                    // Immediate animation for new badge
                    setTimeout(() => {
                        badgeEl.classList.add('visible');
                    }, 50);
                }
            });

            // Remove badges that are no longer in the list
            const currentBadgeTitles = badges.map(b => b.title);
            Array.from(heroBadges.querySelectorAll('.hero-badge-item')).forEach(el => {
                if (!currentBadgeTitles.includes(el.dataset.badgeTitle)) {
                    el.remove();
                }
            });
        } else {
            heroBadges.classList.remove('visible');
            heroBadges.innerHTML = ''; // Clear all if no badges
        }
    }

    // Render to MOBILE (mobile-badge-list)
    if (mobileBadgeList) {
        mobileBadgeList.innerHTML = '';

        badges.forEach((data) => {
            const badgeEl = createMobileBadgeElement(data);
            mobileBadgeList.appendChild(badgeEl);
        });
    }
}

// Create desktop badge element
function createBadgeElement(data) {
    const div = document.createElement('div');
    div.className = 'hero-badge-item' + (data.highlight ? ' hero-badge-highlight' : '');

    const tag = data.badge ? `<div class="hero-badge-tag">${data.badge}</div>` : '';

    div.innerHTML = `
        <div class="hero-badge-icon">${data.icon}</div>
        <div class="hero-badge-content">
            <div class="hero-badge-title">${data.title}</div>
            <div class="hero-badge-desc">${data.desc}</div>
        </div>
        ${tag}
    `;

    return div;
}

// Create mobile badge element
function createMobileBadgeElement(data) {
    const div = document.createElement('div');
    div.className = 'mobile-badge-item' + (data.highlight ? ' mobile-badge-highlight' : '');

    const tag = data.badge ? `<div class="mobile-badge-item-tag">${data.badge}</div>` : '';

    div.innerHTML = `
        <div class="mobile-badge-item-icon">${data.icon}</div>
        <div class="mobile-badge-item-content">
            <div class="mobile-badge-item-title">${data.title}</div>
            <div class="mobile-badge-item-desc">${data.desc}</div>
        </div>
        ${tag}
    `;

    return div;
}

// Toggle mobile badge bar expand/collapse
function toggleMobileBadges() {
    const mobileBadgeBar = document.getElementById('mobileBadgeBar');
    if (mobileBadgeBar) {
        mobileBadgeBar.classList.toggle('expanded');
    }
}

// ═══════════════════════════════════════════════════════════
// SUBMIT FORM WITH N8N WEBHOOK INTEGRATION
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// PRÜFUNG DER EINGABEN
// Jeder Fehler wird dort angezeigt, wo er entstanden ist, und
// zusätzlich über dem Buchen-Knopf zusammengefasst. Kein alert():
// das reisst den Kunden aus dem Formular und sagt ihm nicht,
// welches Feld gemeint ist.
// ═══════════════════════════════════════════════════════════
const FIELD_ORDER = ['location', 'street', 'plz', 'city', 'contactName', 'contactEmail',
    'contactEmailConfirm', 'contactPhone'];

function fieldNote(id) {
    const field = document.getElementById(id);
    const holder = field?.closest('.cfg-field') || field?.parentElement;
    return { field, holder };
}

function setFieldError(id, message) {
    const { field, holder } = fieldNote(id);
    if (!field || !holder) return;
    let note = holder.querySelector('.cfg-field-error');
    if (!message) {
        field.removeAttribute('aria-invalid');
        field.removeAttribute('aria-describedby');
        note?.remove();
        return;
    }
    if (!note) {
        note = document.createElement('p');
        note.className = 'cfg-field-error';
        note.id = `${id}-error`;
        holder.append(note);
    }
    note.textContent = message;
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', note.id);
}

function clearProblems() {
    FIELD_ORDER.forEach(id => setFieldError(id, ''));
    const box = document.getElementById('cfgFormError');
    if (box) { box.hidden = true; box.replaceChildren(); }
}

// Alles, was einer Buchung im Weg steht — in der Reihenfolge des Formulars,
// damit der Kunde oben anfängt und nicht hin- und herspringt.
function collectProblems() {
    const problems = [];
    const value = id => document.getElementById(id)?.value.trim() || '';
    const add = (message, field, step) => problems.push({ message, field, step });

    if (calculateBooking().itemCount === 0)
        add('Wählen Sie mindestens ein Möbelstück aus.', null, 'cfgStep3');

    if (!state.location) add('Wählen Sie Ihre Stadt oder Region aus.', 'location', 'cfgStep5');
    else {
        if (!value('street')) add('Bitte geben Sie Straße und Hausnummer an.', 'street', 'cfgStep5');
        if (!/^\d{4}$/.test(value('plz'))) add('Die PLZ besteht aus vier Ziffern.', 'plz', 'cfgStep5');
        if (!value('city')) add('Bitte geben Sie den Ort an.', 'city', 'cfgStep5');
    }

    // Ohne bestätigten Termin gibt es keine Buchung — der Kalender ist Pflicht.
    if (!state.selectedDate || !state.selectedSlot?.startTime)
        add('Wählen Sie im Kalender einen Tag und eine Uhrzeit und übernehmen Sie den Termin.', null, 'cfgStep6');
    else if (getZoneRule(C.LOCATIONS[state.location]?.zone).restrictHours
        && !RESTRICTED_START_TIMES.includes(state.selectedSlot.startTime))
        add(`In dieser Region beginnen wir um ${RESTRICTED_START_TIMES.join(' oder ')} Uhr. Bitte wählen Sie eine dieser Zeiten.`,
            null, 'cfgStep6');

    if (!value('contactName')) add('Bitte geben Sie Ihren Namen an.', 'contactName', 'cfgStep6');
    const email = value('contactEmail');
    if (!email) add('Ohne E-Mail-Adresse können wir Ihnen die Bestätigung nicht schicken.', 'contactEmail', 'cfgStep6');
    else if (!isValidEmail(email)) add('Diese E-Mail-Adresse sieht nicht vollständig aus.', 'contactEmail', 'cfgStep6');
    const confirm = value('contactEmailConfirm');
    if (!confirm) add('Bitte wiederholen Sie Ihre E-Mail-Adresse.', 'contactEmailConfirm', 'cfgStep6');
    else if (confirm !== email) add('Die beiden E-Mail-Adressen stimmen nicht überein.', 'contactEmailConfirm', 'cfgStep6');
    // Zahlen zählen, nicht Zeichen: +43 660 123 45 67 ist genauso gültig wie 06601234567.
    if ((value('contactPhone').match(/\d/g) || []).length < 7)
        add('Bitte geben Sie eine erreichbare Telefonnummer an.', 'contactPhone', 'cfgStep6');

    return problems;
}

function showProblems(problems) {
    clearProblems();
    problems.forEach(problem => { if (problem.field) setFieldError(problem.field, problem.message); });

    const box = document.getElementById('cfgFormError');
    if (box) {
        box.replaceChildren();
        const title = document.createElement('strong');
        title.textContent = problems.length === 1
            ? 'Es fehlt noch eine Angabe:'
            : `Es fehlen noch ${problems.length} Angaben:`;
        const list = document.createElement('ul');
        problems.forEach(problem => {
            const entry = document.createElement('li');
            const jump = document.createElement('button');
            jump.type = 'button';
            jump.textContent = problem.message;
            jump.addEventListener('click', () => focusProblem(problem));
            entry.append(jump);
            list.append(entry);
        });
        box.append(title, list);
        box.hidden = false;
    }
    focusProblem(problems[0]);
}

function focusProblem(problem) {
    if (!problem) return;
    const field = problem.field && document.getElementById(problem.field);
    const target = field || document.getElementById(problem.step);
    target?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        block: field ? 'center' : 'start'
    });
    if (field) setTimeout(() => field.focus({ preventScroll: true }), 300);
}

// Sobald der Kunde ein bemängeltes Feld korrigiert, verschwindet die Meldung.
function wireLiveValidation() {
    FIELD_ORDER.forEach(id => {
        const field = document.getElementById(id);
        const clear = () => { if (field.getAttribute('aria-invalid') === 'true') setFieldError(id, ''); };
        // `change` deckt die Auswahlliste ab, `input` die Textfelder.
        field?.addEventListener('input', clear);
        field?.addEventListener('change', clear);
    });
    // Die Wiederholung prüft gegen die erste Adresse, sobald beide gefüllt sind.
    const email = document.getElementById('contactEmail');
    const confirm = document.getElementById('contactEmailConfirm');
    const compare = () => {
        if (!confirm.value.trim() || !email.value.trim()) return;
        setFieldError('contactEmailConfirm',
            confirm.value.trim() === email.value.trim() ? '' : 'Die beiden E-Mail-Adressen stimmen nicht überein.');
    };
    confirm?.addEventListener('blur', compare);
    email?.addEventListener('blur', compare);
}

function submitForm() {
    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const message = document.getElementById('contactMessage').value.trim();

    // Der Kalender ist die alleinige Wahrheit für den Termin — vor der Prüfung
    // von dort lesen, damit ein bestätigter Slot nicht als "fehlt" gemeldet wird.
    if (typeof BookingCalendar !== 'undefined') {
        state.selectedDate = BookingCalendar.getSelectedDate();
        state.selectedSlot = BookingCalendar.getSelectedSlot();
    }

    const problems = collectProblems();
    if (problems.length) {
        showProblems(problems);
        return;
    }
    clearProblems();
    const phone = document.getElementById('contactPhone').value.trim();

    const quote = calculateBooking();

    // ═══════════════════════════════════════════════════════════
    // BUILD SERVICES ARRAY FOR N8N
    // ═══════════════════════════════════════════════════════════
    const { services, totalDuration } = quote;

    // ═══════════════════════════════════════════════════════════
    // GET LOCATION DATA WITH ZONE INFO + EXACT ADDRESS
    // ═══════════════════════════════════════════════════════════
    const locationData = state.location ? DYNAMIC_CONTENT.locations[state.location] : null;
    const cityName = locationData ? locationData.name.split('/')[0] : 'Nicht ausgewählt';
    const zone = locationData ? locationData.zone : N8N_CONFIG.defaultZone;
    const country = locationData ? locationData.country : N8N_CONFIG.country;

    // Get exact address from Step 6
    const street = document.getElementById('street')?.value.trim() || '';
    const plz = document.getElementById('plz')?.value.trim() || '';
    const city = document.getElementById('city')?.value.trim() || '';

    // Combine into full address
    const fullAddress = street && plz && city
        ? `${street}, ${plz} ${city}, Österreich`
        : cityName;

    // ═══════════════════════════════════════════════════════════
    // CREATE BOOKING PAYLOAD FOR N8N WEBHOOK
    // ═══════════════════════════════════════════════════════════
    const estimatedPrice = quote.finalTotal;

    const bookingPayload = {
        // Source identification
        source: 'eco-clean-burgenland',
        country: country,
        language: 'de',

        // Customer info
        customer: {
            name: name,
            email: email,
            phone: phone || null,
            type: state.customerType || 'Privatkunde',
            message: message || null
        },

        // 🎯 FULL ADDRESS STRING (for Google Calendar location field)
        location: fullAddress,

        // Location Details & Zone (CRITICAL for Geo-Clustering)
        locationDetails: {
            locationKey: state.location,
            address: fullAddress,
            street: street,
            plz: plz,
            city: city,
            region: cityName,
            zone: zone,
            country: country,
            travelTime: locationData ? locationData.travelTime : 60,
            // 🆕 v2.1: Zonenregeln mitschicken, damit "The Brain" identisch prüfen kann
            minOrder: getZoneRule(zone).minOrder,
            restrictHours: getZoneRule(zone).restrictHours
        },

        // Services requested
        services: services,

        // Booking details
        booking: {
            serviceType: state.serviceType || 'Nicht ausgewählt',
            conditions: state.conditions,
            preferredDate: state.selectedDate || null,

            // 🆕 JAVÍTOTT SLOT ADATOK (v3.1)
            selectedSlot: state.selectedSlot ? {
                startTime: state.selectedSlot.startTime,
                maxDuration: state.selectedSlot.maxDuration,
                isFirstSlot: state.selectedSlot.isFirstSlot || false,
                isBaseSlot: state.selectedSlot.isBaseSlot || false
            } : null,

            // 🆕 KÖZVETLEN HOZZÁFÉRÉS
            slotStartTime: state.selectedSlot?.startTime || null,
            isFirstSlot: state.selectedSlot?.isFirstSlot || false,
            flexibilityAccepted: typeof BookingCalendar !== 'undefined'
                ? BookingCalendar.state?.flexibilityAccepted || false
                : false
        },

        // Calculated totals
        totals: {
            estimatedPrice: parseFloat(estimatedPrice),
            currency: 'EUR',
            estimatedDuration: totalDuration,
            itemCount: quote.itemCount,
            basePrice: quote.baseTotal,
            addonsPrice: quote.addonTotal,
            subtotal: quote.subtotal
        },

        // Metadata
        meta: {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            referrer: document.referrer || null
        }
    };

    // Console log for debugging
    console.log('🐴 CENTAUR BOOKING PAYLOAD:', JSON.stringify(bookingPayload, null, 2));

    // Show loading state
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.querySelector('.cta-text').style.display = 'none';
    btn.querySelector('.cta-loading').style.display = 'inline';

    // ═══════════════════════════════════════════════════════════
    // SEND TO N8N WEBHOOK
    // ═══════════════════════════════════════════════════════════
    fetch(N8N_CONFIG.webhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(bookingPayload)
    })
        .then(async response => {
            const data = await response.json();
            // Business/validation rejections must never become fallback emails.
            if (!response.ok && !data.error) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return data;
        })
        .then(data => {
            console.log('✅ N8N Response:', data);

            if (data.available === true) {
                // SUCCESS - Booking slot available
                showBookingSuccess(data, bookingPayload);
            } else if (data.error === 'QUOTE_CHANGED') {
                showQuoteChangedError(data);
            } else if (data.error === 'ZONE_MISMATCH' || data.error === 'ZONE_INCOMPATIBLE') {
                // Zone mismatch - day reserved for different zone
                showZoneMismatchError(data);
            } else if (data.error === 'DAY_FULL') {
                // Day is full
                showDayFullError(data);
            } else if (data.error) {
                // Other error (z. B. MIN_ORDER, TIME_NOT_ALLOWED, OUT_OF_SERVICE_AREA)
                showBookingError(data);
            } else {
                showBookingError({ message: 'Die Buchung konnte nicht bestätigt werden. Bitte kontaktieren Sie uns, bevor Sie erneut buchen.' });
            }
        })
        .catch(error => {
            console.error('❌ N8N Error:', error);
            // Fallback to FormSubmit if n8n fails
            fallbackToFormSubmit(bookingPayload);
        })
        .finally(() => {
            // Reset button state
            btn.disabled = false;
            btn.querySelector('.cta-text').style.display = 'inline';
            btn.querySelector('.cta-loading').style.display = 'none';
        });
}

// ═══════════════════════════════════════════════════════════
// SUCCESS & ERROR HANDLERS
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// RÜCKMELDUNGEN
// Ergebnis und Fehler erscheinen dort, wo der Kunde gerade
// hinschaut: in der Preisleiste, an der Stelle der Zusammen-
// fassung. Ein Fehler nimmt ihm die Auswahl nicht weg.
// ═══════════════════════════════════════════════════════════
function escapeBookingHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

const RESULT_ICONS = {
    success: '<polyline points="20 6 9 17 4 12"/>',
    warning: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="7" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
};

// kind: 'success' | 'warning'. `rows` sind Beschriftung/Wert-Paare,
// `actions` die Knöpfe darunter.
function showRailPanel(kind, { title, text, rows = [], note, actions = [] }) {
    const rail = document.getElementById('configSummary');
    if (!rail) return;
    rail.classList.add('cfg-rail-result');
    rail.replaceChildren();

    const panel = document.createElement('div');
    panel.className = `cfg-result is-${kind}`;
    panel.setAttribute('role', kind === 'success' ? 'status' : 'alert');

    const icon = document.createElement('span');
    icon.className = 'cfg-result-icon';
    icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${RESULT_ICONS[kind]}</svg>`;

    const heading = document.createElement('h3');
    heading.textContent = title;
    const body = document.createElement('p');
    body.textContent = text;
    panel.append(icon, heading, body);

    if (rows.length) {
        const list = document.createElement('dl');
        list.className = 'cfg-result-rows';
        rows.forEach(([label, value]) => {
            const term = document.createElement('dt');
            term.textContent = label;
            const detail = document.createElement('dd');
            detail.textContent = value;
            list.append(term, detail);
        });
        panel.append(list);
    }
    if (note) {
        const small = document.createElement('p');
        small.className = 'cfg-result-note';
        small.textContent = note;
        panel.append(small);
    }
    if (actions.length) {
        const bar = document.createElement('div');
        bar.className = 'cfg-result-actions';
        actions.forEach(action => {
            const element = document.createElement(action.href ? 'a' : 'button');
            if (action.href) element.href = action.href;
            else element.type = 'button';
            element.className = action.primary ? 'cfg-result-cta' : 'cfg-result-link';
            element.textContent = action.label;
            if (action.run) element.addEventListener('click', action.run);
            bar.append(element);
        });
        panel.append(bar);
    }
    rail.append(panel);
    // Die mobile Preisleiste passt nicht mehr zum Ergebnis.
    document.querySelector('.cfg-bar')?.setAttribute('hidden', '');
    rail.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        block: 'center'
    });
}

const formatBookingDate = value => {
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? String(value)
        : date.toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

function showBookingSuccess(data, payload) {
    const start = data.slot?.startTime || payload.booking.slotStartTime;
    const duration = data.duration || payload.totals.estimatedDuration;
    const [hour, minute] = String(start).split(':').map(Number);
    const endMinutes = hour * 60 + minute + duration;
    const end = data.slot?.endTime
        || `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    lockConfigurator(true);
    showRailPanel('success', {
        title: 'Termin gebucht',
        text: `Danke, ${payload.customer.name}. Ihr Termin steht fest — die Bestätigung geht an ${payload.customer.email}.`,
        rows: [
            ['Termin', formatBookingDate(data.slot?.date || payload.booking.preferredDate)],
            ['Uhrzeit', `${start} – ${end} Uhr`],
            ['Adresse', payload.location],
            ['Gesamtpreis', `${payload.totals.estimatedPrice} € inkl. Anfahrt`]
        ],
        note: 'Sie müssen nichts vorbereiten. Sorgen Sie nur dafür, dass die Möbelstücke frei zugänglich sind — den Rest bringen wir mit.',
        actions: [
            { label: 'Termin als PDF speichern', primary: true, run: () => window.print() },
            { label: 'Frage zum Termin? 0664 9975 4216', href: 'tel:+4366499754216' }
        ]
    });
}

function showZoneMismatchError(data) {
    showRailPanel('warning', {
        title: 'Dieser Tag geht sich nicht aus',
        text: data.message || 'An diesem Tag sind wir bereits in einer anderen Region unterwegs. Bitte wählen Sie einen anderen Tag im Kalender.',
        note: 'Es wurde nichts gebucht und nichts berechnet. Ihre Zusammenstellung bleibt erhalten.',
        actions: [{ label: 'Anderen Tag wählen', primary: true, run: retryBooking }]
    });
}

function showDayFullError(data) {
    showRailPanel('warning', {
        title: 'Dieser Tag ist ausgebucht',
        text: data.message || 'An diesem Tag ist leider kein Termin mehr frei.',
        note: data.suggestion?.message || 'Es wurde nichts gebucht. Ihre Zusammenstellung bleibt erhalten.',
        actions: [{ label: 'Anderen Tag wählen', primary: true, run: retryBooking }]
    });
}

function showBookingError(data) {
    showRailPanel('warning', {
        title: 'Die Buchung ist nicht durchgegangen',
        text: data.message || 'Wir konnten den Termin gerade nicht abschließen. Bitte versuchen Sie es noch einmal oder rufen Sie uns an.',
        note: 'Es wurde nichts gebucht und nichts berechnet. Ihre Zusammenstellung bleibt erhalten.',
        actions: [
            { label: 'Erneut versuchen', primary: true, run: retryBooking },
            { label: 'Anrufen: 0664 9975 4216', href: 'tel:+4366499754216' }
        ]
    });
}

function showSuccessMessage() {
    showRailPanel('success', {
        title: 'Anfrage ist bei uns',
        text: 'Der Terminkalender war gerade nicht erreichbar, Ihre Anfrage haben wir aber vollständig erhalten. Wir bestätigen den Termin innerhalb von 24 Stunden per E-Mail.',
        note: 'Bitte warten Sie unsere Rückmeldung ab, bevor Sie erneut buchen.',
        actions: [{ label: 'Anrufen: 0664 9975 4216', href: 'tel:+4366499754216' }]
    });
}

// Nach einer bestätigten Buchung darf niemand mehr an der Auswahl drehen —
// sonst zeigt das Formular etwas anderes an, als tatsächlich gebucht wurde.
function lockConfigurator(locked) {
    const body = document.querySelector('.config-body');
    if (!body) return;
    body.classList.toggle('is-locked', locked);
    body.querySelectorAll('.cfg-main input, .cfg-main select, .cfg-main textarea, .cfg-main button')
        .forEach(element => { element.disabled = locked; });
}

// Zurück zum Formular, ohne die Zusammenstellung zu verlieren.
function retryBooking() {
    const rail = document.getElementById('configSummary');
    lockConfigurator(false);
    rail.classList.remove('cfg-rail-result');
    rail.replaceChildren(...RAIL_TEMPLATE.cloneNode(true).childNodes);
    document.querySelector('.cfg-bar')?.removeAttribute('hidden');
    wireRail();
    renderAll();
    document.getElementById('cfgStep6')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showQuoteChangedError(data) {
    // Preis oder Dauer haben sich geändert: Auswahl stehen lassen und den
    // neuen Betrag zeigen, bevor irgendetwas gebucht wird.
    document.getElementById('bookingQuoteError')?.remove();
    const notice = document.createElement('div');
    notice.id = 'bookingQuoteError';
    notice.className = 'cfg-alert is-warning';
    notice.setAttribute('role', 'alert');
    const title = document.createElement('strong');
    title.textContent = 'Der Preis hat sich geändert';
    const message = document.createElement('p');
    message.textContent = data.message
        || 'Bitte prüfen Sie den aktualisierten Preis, bevor Sie buchen. Es wurde kein Termin gebucht.';
    notice.append(title, message);
    const pricing = data.details?.pricing;
    if (pricing && Number.isFinite(pricing.finalPrice)) {
        const amount = document.createElement('p');
        amount.textContent = `Aktueller Gesamtpreis: ${pricing.finalPrice.toLocaleString('de-AT')} € inkl. Anfahrt.`;
        notice.append(amount);
    }
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'cfg-result-cta';
    retry.textContent = 'Aktuelles Angebot laden';
    retry.addEventListener('click', () => window.location.reload());
    notice.append(retry);
    (document.querySelector('.cfg-rail-body') || document.getElementById('cfgStep6'))?.prepend(notice);
    notice.scrollIntoView({ behavior: 'smooth', block: 'center' });
}


function fallbackToFormSubmit(payload) {
    console.log('⚠️ Falling back to FormSubmit...');

    // Populate hidden form fields
    document.getElementById('form_name').value = payload.customer.name;
    document.getElementById('form_email').value = payload.customer.email;
    document.getElementById('form_phone').value = payload.customer.phone || 'Nicht angegeben';
    document.getElementById('form_message').value = payload.customer.message || 'Keine Nachricht';
    document.getElementById('form_customerType').value = payload.customer.type;
    document.getElementById('form_serviceType').value = payload.booking.serviceType;

    const itemsList = payload.services.map(s => `${s.quantity}× ${s.name} (${s.totalPrice} €)`).join(', ');
    document.getElementById('form_items').value = itemsList || 'Keine';
    document.getElementById('form_conditions').value = payload.booking.conditions.length > 0
        ? payload.booking.conditions.join(', ')
        : 'Keine';
    document.getElementById('form_location').value = payload.location;
    document.getElementById('form_price').value = `€${payload.totals.estimatedPrice}`;
    document.getElementById('form_duration').value = `${payload.totals.estimatedDuration} Min.`;

    // Submit via AJAX
    const formData = new FormData(document.getElementById('contactForm'));

    fetch(`https://formsubmit.co/ajax/${N8N_CONFIG.fallbackEmail}`, {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSuccessMessage();
            } else {
                throw new Error('FormSubmit failed');
            }
        })
        .catch(error => {
            console.error('FormSubmit Error:', error);
            // Last resort: submit form normally
            document.getElementById('contactForm').submit();
        });
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ═══════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// KALENDER — der bestätigte Slot ist Teil der Buchung, nicht
// nur eine Anzeige. Ohne Datum und Uhrzeit wird nicht gebucht.
// ═══════════════════════════════════════════════════════════
function wireCalendar() {
    const container = document.getElementById('bookingCalendar');
    if (!container) return;
    container.addEventListener('dateSelected', event => {
        state.selectedDate = event.detail.date;
        state.selectedSlot = event.detail.slot;
        // Kein renderAll(): das würde den Kalender neu aufbauen und die
        // gerade bestätigte Auswahl wieder verwerfen.
        renderAppointment(event.detail);
        renderProgress(calculateBooking());
    });
}

function renderAppointment(detail) {
    const row = document.getElementById('cfgSumAppointment');
    if (!row) return;
    if (!detail?.date || !detail?.slot) { row.hidden = true; return; }
    const date = new Date(detail.date).toLocaleDateString('de-AT', { weekday: 'short', day: 'numeric', month: 'short' });
    const time = detail.slot.startTime;
    row.hidden = false;
    row.querySelector('strong').textContent = detail.isFirstSlot
        ? `${date}, ${time} Uhr`
        : `${date}, ca. ${time} Uhr (±30 Min.)`;
}

let RAIL_TEMPLATE = null;

function wireRail() {
    document.getElementById('cfgReset')?.addEventListener('click', resetConfigurator);
    document.getElementById('cfgPrint')?.addEventListener('click', () => window.print());
}

function init() {
    if (!document.getElementById('cfgProducts')) return;   // Seite ohne Konfigurator
    // Der Rechner steht offen da — Kopfzeile und Panel brauchen keinen Klick.
    document.getElementById('configurator')?.classList.add('active');
    document.getElementById('configPanel')?.classList.add('active');
    document.getElementById('configHeader')?.classList.add('visible');
    document.getElementById('configIcon')?.classList.add('visible');
    document.getElementById('configBadge')?.classList.add('visible');
    const title = document.getElementById('configTitle');
    if (title) title.textContent = 'Preis berechnen und Termin wählen';
    const badgeText = document.getElementById('badgeText');
    if (badgeText) badgeText.textContent = 'LIVE';

    wireCalendar();
    renderLocationOptions();
    restoreState();
    if (state.location) {
        document.getElementById('location').value = state.location;
        handleLocationChange(document.getElementById('location'));
    }
    // Kopie der leeren Preisleiste: nach einer Fehlermeldung wird sie daraus
    // wiederhergestellt, damit die Zusammenstellung nicht verloren geht.
    RAIL_TEMPLATE = document.getElementById('configSummary').cloneNode(true);
    wireRail();
    wireLiveValidation();
    document.getElementById('cfgBarCta')?.addEventListener('click', () =>
        document.getElementById('cfgStep6').scrollIntoView({ behavior: 'smooth', block: 'start' }));
    renderAll();

    // Direkteinstieg aus einer Kampagne oder von einer Unterseite.
    if (new URLSearchParams(window.location.search).get('start') === 'true') {
        setTimeout(() => {
            startAnimation();
            window.history.replaceState({}, document.title, window.location.pathname);
        }, 300);
    }
}

// Wait for DOM to be fully loaded before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // DOM already loaded
    init();
}

// ═══════════════════════════════════════════════════════════
// ANIMATION LOGIC
// ═══════════════════════════════════════════════════════════

// Der Konfigurator ist jetzt von Anfang an sichtbar; die CTAs springen nur noch
// dorthin. Kein stufenweises Einblenden mehr — wer den Preis sucht, soll ihn
// sofort sehen und nicht auf eine Animation warten.
function startAnimation() {
    const destination = document.getElementById('configurator');
    if (!destination) return;
    destination.classList.add('active');
    document.getElementById('configPanel')?.classList.add('active');
    requestAnimationFrame(() => {
        destination.focus({ preventScroll: true });
        destination.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
            block: 'start'
        });
    });
    if (started) return;
    started = true;
    const title = document.getElementById('configTitle');
    if (title) title.textContent = 'Preis berechnen und Termin wählen';
    document.getElementById('badgeText') && (document.getElementById('badgeText').textContent = 'LIVE');
    document.getElementById('configHeader')?.classList.add('visible');
    document.getElementById('configIcon')?.classList.add('visible');
    document.getElementById('configBadge')?.classList.add('visible');
}

// Kept for backward compatibility
async function animateStep(index) { return; }

function scrollToConfigurator() {
    startAnimation();
}

// ═══════════════════════════════════════════════════════════
// ENSURE START BUTTON WORKS
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function () {
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', function (e) {
            e.preventDefault();
            startAnimation();
        });
    }

    // Feldprüfung: siehe wireLiveValidation(), dort mit sichtbaren Meldungen.
});
