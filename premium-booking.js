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
// ZONE RULES v2.1 — MINDESTBESTELLWERT + BUCHBARE ZEITEN
// Ausgangspunkt (Basis): Ungarn 9134 (Bodonhely, Region Győr)
//   - Burgenland (B):                  kein Mindestwert, freie Zeiten
//   - Angrenzende Bundesländer (W/NÖ/ST): 199 € Mindest, nur 11:00 / 13:00
//   - Weiter entfernt (OÖ/SB/K/T/V):     299 € Mindest, nur 11:00 / 13:00
// Diese Regeln müssen mit dem n8n "The Brain" Node übereinstimmen.
// ═══════════════════════════════════════════════════════════
const RESTRICTED_START_TIMES = ['11:00', '13:00'];
const ZONE_RULES = {
    'B':  { minOrder: 0,   restrictHours: false },  // Burgenland (Heimatregion)
    'W':  { minOrder: 199, restrictHours: true  },  // Wien
    'NÖ': { minOrder: 199, restrictHours: true  },  // Niederösterreich
    'ST': { minOrder: 199, restrictHours: true  },  // Steiermark
    'OÖ': { minOrder: 299, restrictHours: true  },  // Oberösterreich
    'SB': { minOrder: 299, restrictHours: true  },  // Salzburg
    'K':  { minOrder: 299, restrictHours: true  },  // Kärnten
    'T':  { minOrder: 299, restrictHours: true  },  // Tirol
    'V':  { minOrder: 299, restrictHours: true  }   // Vorarlberg
};
function getZoneRule(zone) {
    return ZONE_RULES[zone] || { minOrder: 0, restrictHours: false };
}

// ═══════════════════════════════════════════════════════════
// CONFIGURATOR LOGIC
// ═══════════════════════════════════════════════════════════
const STEPS = [
    { id: 1, label: "Sind Sie Privat- oder Geschäftskunde?", chips: ["Privatkunde", "Geschäftskunde"] },
    { id: 2, label: "Was möchten Sie reinigen lassen?", chips: ["Polstermöbel", "Matratzen", "Beides"] },
    {
        id: 3, label: "Welche Möbelstücke? (Anzahl)", numbers: [
            { name: "L-Couch", price: 119, duration: 60, category: "polster" },
            { name: "U-Couch", price: 159, duration: 90, category: "polster" },
            { name: "Sofa", price: 85, duration: 45, category: "polster" },
            { name: "Sessel", price: 35, duration: 15, category: "polster" },
            { name: "Stuhl", price: 19, duration: 10, category: "polster" },
            { name: "Kindermatratze (Trocken)", price: 29, duration: 20, category: "matratze" },
            { name: "Kindermatratze (Nass)", price: 49, duration: 40, category: "matratze" },
            { name: "Matratze Einzel (Trocken)", price: 39, duration: 30, category: "matratze" },
            { name: "Matratze Einzel (Nass)", price: 69, duration: 45, category: "matratze" },
            { name: "Matratze Doppel (Trocken)", price: 59, duration: 45, category: "matratze" },
            { name: "Matratze Doppel (Nass)", price: 115, duration: 60, category: "matratze" }
        ]
    },
    { id: 4, label: "Besondere Umstände?", chips: ["Haustiere", "Kleinkinder", "Allergiker"], multi: true },
    { id: 5, label: "Wo befinden Sie sich?", select: true }
];

// Per-furniture extras. Prices in EUR and additional working time in minutes.
// Keep this catalog as the single source for UI, totals and booking line items.
const COUCH_ADDONS = [
    { id: 'sleep', name: 'Schlaffunktion / ausziehbare Liegefläche', description: 'Zusätzliche Liegefläche mitreinigen.', prices: { 'L-Couch': 30, 'U-Couch': 40, Sofa: 25 }, durations: { 'L-Couch': 20, 'U-Couch': 20, Sofa: 20 } },
    { id: 'odor', name: 'Hunde- & Katzengerüche behandeln', description: 'Gezielte Geruchsbehandlung. Bei Urin bitte Intensivreinigung wählen.', prices: { 'L-Couch': 25, 'U-Couch': 35, Sofa: 20, Sessel: 10, Stuhl: 5 }, durations: { 'L-Couch': 15, 'U-Couch': 15, Sofa: 15, Sessel: 10, Stuhl: 5 } },
    { id: 'protection', name: 'Imprägnierung / Fleckschutz', description: 'Zusätzlicher Schutz für geeignete Textilbezüge.', prices: { 'L-Couch': 35, 'U-Couch': 45, Sofa: 25, Sessel: 15, Stuhl: 7 }, durations: { 'L-Couch': 15, 'U-Couch': 15, Sofa: 15, Sessel: 10, Stuhl: 5 } },
    { id: 'intensive', name: 'Intensivreinigung bei starker Verschmutzung / Urin', description: 'Zusätzliche Behandlung belasteter Stellen, inklusive Geruchsbehandlung.', prices: { 'L-Couch': 49, 'U-Couch': 59, Sofa: 39, Sessel: 19, Stuhl: 10 }, durations: { 'L-Couch': 30, 'U-Couch': 30, Sofa: 30, Sessel: 15, Stuhl: 10 } },
    { id: 'hair', name: 'Intensive Tierhaarentfernung', description: 'Zusätzlicher Aufwand für festsitzende Hunde- und Katzenhaare.', prices: { 'L-Couch': 20, 'U-Couch': 30, Sofa: 15, Sessel: 10, Stuhl: 5 }, durations: { 'L-Couch': 15, 'U-Couch': 15, Sofa: 15, Sessel: 10, Stuhl: 5 } }
];
const hasCouchAddons = name => COUCH_ADDONS.some(addon => Object.hasOwn(addon.prices, name));

const DYNAMIC_CONTENT = {
    customerType: {
        "Privatkunde": { discount: 0, title: "Privatkunden-Service", desc: "Persönliche Betreuung für Ihr Zuhause", icon: "🏠" },
        "Geschäftskunde": { discount: 10, title: "Geschäftskunden-Vorteil", desc: "10% Rabatt auf alle Leistungen", icon: "🏢", badge: "-10%" }
    },
    serviceType: {
        "Polstermöbel": { title: "Polsterreinigung", desc: "Tiefenreinigung mit HEPA-Filterung", icon: "🛋️", features: ["HEPA-Filter", "Bio-Mittel"] },
        "Matratzen": { title: "Matratzenreinigung", desc: "UV-C Desinfektion und Tiefenreinigung", icon: "🛏️", features: ["UV-C", "Anti-Allergen"] },
        "Beides": { title: "Komplett-Reinigung", desc: "Das beste Ergebnis für Ihr Zuhause", icon: "✨", badge: "EMPFOHLEN", features: ["Alles inklusive"] }
    },
    conditions: {
        "Haustiere": { title: "Haustiere im Haushalt", desc: "Polstermöbel: Extras einzeln wählen. Matratzen: 10% Aufpreis.", icon: "🐾", surcharge: 0 },
        "Kleinkinder": { title: "Kindersicher", desc: "100% biologische Reinigung", icon: "👶", badge: "BIO", surcharge: 0 },
        "Allergiker": { title: "Anti-Allergen", desc: "99,9% Allergenentfernung", icon: "🌿", badge: "+10%", surcharge: 10 }
    },
    // ═══════════════════════════════════════════════════════════
    // ZONE B LOCATIONS (BURGENLAND / WESTERN BORDER)
    // ═══════════════════════════════════════════════════════════
    locations: {
        // ── BURGENLAND ──────────────────────────────────────────
        "eisenstadt": { name: "Eisenstadt", info: "Landeshauptstadt Burgenland", zone: "B", country: "AT", travelTime: 55 },
        "oberwart": { name: "Oberwart", info: "Südburgenland", zone: "B", country: "AT", travelTime: 70 },
        "neusiedl-am-see": { name: "Neusiedl am See", info: "Seewinkel", zone: "B", country: "AT", travelTime: 60 },
        "neusiedl": { name: "Neusiedl am See", info: "Seewinkel", zone: "B", country: "AT", travelTime: 60 },
        "mattersburg": { name: "Mattersburg", info: "Zentrales Burgenland", zone: "B", country: "AT", travelTime: 50 },
        "guessing": { name: "Güssing", info: "Südburgenland", zone: "B", country: "AT", travelTime: 90 },
        "jennersdorf": { name: "Jennersdorf", info: "Grenzregion", zone: "B", country: "AT", travelTime: 95 },
        "kittsee": { name: "Kittsee", info: "Grenzregion Slowakei", zone: "B", country: "AT", travelTime: 65 },
        "parndorf": { name: "Parndorf", info: "Designer Outlet Region", zone: "B", country: "AT", travelTime: 65 },
        // ── WIEN ────────────────────────────────────────────────
        "wien": { name: "Wien", info: "Bundeshauptstadt", zone: "W", country: "AT", travelTime: 75 },
        // ── NIEDERÖSTERREICH ────────────────────────────────────
        "wiener-neustadt": { name: "Wiener Neustadt", info: "Niederösterreich", zone: "NÖ", country: "AT", travelTime: 60 },
        "st-poelten": { name: "St. Pölten", info: "Landeshauptstadt NÖ", zone: "NÖ", country: "AT", travelTime: 90 },
        "baden": { name: "Baden", aliases: ["Baden bei Wien"], info: "Niederösterreich", zone: "NÖ", country: "AT", travelTime: 70 },
        "krems": { name: "Krems", aliases: ["Krems an der Donau"], info: "Niederösterreich", zone: "NÖ", country: "AT", travelTime: 110 },
        "moedling": { name: "Mödling", info: "Niederösterreich", zone: "NÖ", country: "AT", travelTime: 75 },
        "klosterneuburg": { name: "Klosterneuburg", info: "Niederösterreich", zone: "NÖ", country: "AT", travelTime: 80 },
        "amstetten": { name: "Amstetten", info: "Niederösterreich", zone: "NÖ", country: "AT", travelTime: 150 },
        "schwechat": { name: "Schwechat", info: "Niederösterreich", zone: "NÖ", country: "AT", travelTime: 70 },
        "tulln": { name: "Tulln", aliases: ["Tulln an der Donau"], info: "Niederösterreich", zone: "NÖ", country: "AT", travelTime: 95 },
        "stockerau": { name: "Stockerau", info: "Niederösterreich", zone: "NÖ", country: "AT", travelTime: 90 },
        "korneuburg": { name: "Korneuburg", info: "Niederösterreich", zone: "NÖ", country: "AT", travelTime: 85 },
        "neunkirchen": { name: "Neunkirchen", info: "Niederösterreich", zone: "NÖ", country: "AT", travelTime: 65 },
        // ── STEIERMARK ──────────────────────────────────────────
        "graz": { name: "Graz", info: "Landeshauptstadt Steiermark", zone: "ST", country: "AT", travelTime: 120 },
        "leoben": { name: "Leoben", info: "Steiermark", zone: "ST", country: "AT", travelTime: 145 },
        "kapfenberg": { name: "Kapfenberg", info: "Steiermark", zone: "ST", country: "AT", travelTime: 150 },
        "bruck-an-der-mur": { name: "Bruck an der Mur", info: "Steiermark", zone: "ST", country: "AT", travelTime: 140 },
        "leibnitz": { name: "Leibnitz", info: "Steiermark", zone: "ST", country: "AT", travelTime: 135 },
        "weiz": { name: "Weiz", info: "Steiermark", zone: "ST", country: "AT", travelTime: 130 },
        "feldbach": { name: "Feldbach", info: "Steiermark", zone: "ST", country: "AT", travelTime: 125 },
        "judenburg": { name: "Judenburg", info: "Steiermark", zone: "ST", country: "AT", travelTime: 155 },
        // ── OBERÖSTERREICH ──────────────────────────────────────
        "linz": { name: "Linz", info: "Landeshauptstadt OÖ", zone: "OÖ", country: "AT", travelTime: 200 },
        "wels": { name: "Wels", info: "Oberösterreich", zone: "OÖ", country: "AT", travelTime: 210 },
        "steyr": { name: "Steyr", info: "Oberösterreich", zone: "OÖ", country: "AT", travelTime: 190 },
        "leonding": { name: "Leonding", info: "Oberösterreich", zone: "OÖ", country: "AT", travelTime: 200 },
        "traun": { name: "Traun", info: "Oberösterreich", zone: "OÖ", country: "AT", travelTime: 205 },
        "gmunden": { name: "Gmunden", info: "Oberösterreich", zone: "OÖ", country: "AT", travelTime: 195 },
        "braunau": { name: "Braunau", aliases: ["Braunau am Inn"], info: "Oberösterreich", zone: "OÖ", country: "AT", travelTime: 240 },
        "ried-im-innkreis": { name: "Ried im Innkreis", info: "Oberösterreich", zone: "OÖ", country: "AT", travelTime: 230 },
        // ── SALZBURG ────────────────────────────────────────────
        "salzburg": { name: "Salzburg", info: "Landeshauptstadt Salzburg", zone: "SB", country: "AT", travelTime: 260 },
        "hallein": { name: "Hallein", info: "Salzburg", zone: "SB", country: "AT", travelTime: 265 },
        "wals-siezenheim": { name: "Wals-Siezenheim", info: "Salzburg", zone: "SB", country: "AT", travelTime: 255 },
        "saalfelden": { name: "Saalfelden", aliases: ["Saalfelden am Steinernen Meer"], info: "Salzburg", zone: "SB", country: "AT", travelTime: 290 },
        // ── KÄRNTEN ─────────────────────────────────────────────
        "klagenfurt": { name: "Klagenfurt", aliases: ["Klagenfurt am Wörthersee"], info: "Landeshauptstadt Kärnten", zone: "K", country: "AT", travelTime: 185 },
        "villach": { name: "Villach", info: "Kärnten", zone: "K", country: "AT", travelTime: 200 },
        "wolfsberg": { name: "Wolfsberg", info: "Kärnten", zone: "K", country: "AT", travelTime: 175 },
        "spittal-an-der-drau": { name: "Spittal an der Drau", info: "Kärnten", zone: "K", country: "AT", travelTime: 215 },
        // ── TIROL ───────────────────────────────────────────────
        "innsbruck": { name: "Innsbruck", info: "Landeshauptstadt Tirol", zone: "T", country: "AT", travelTime: 310 },
        "kufstein": { name: "Kufstein", info: "Tirol", zone: "T", country: "AT", travelTime: 280 },
        "hall-in-tirol": { name: "Hall in Tirol", info: "Tirol", zone: "T", country: "AT", travelTime: 315 },
        "woergl": { name: "Wörgl", info: "Tirol", zone: "T", country: "AT", travelTime: 290 },
        "schwaz": { name: "Schwaz", info: "Tirol", zone: "T", country: "AT", travelTime: 320 },
        "telfs": { name: "Telfs", info: "Tirol", zone: "T", country: "AT", travelTime: 310 },
        // ── VORARLBERG ──────────────────────────────────────────
        "bregenz": { name: "Bregenz", info: "Landeshauptstadt Vorarlberg", zone: "V", country: "AT", travelTime: 380 },
        "dornbirn": { name: "Dornbirn", info: "Vorarlberg", zone: "V", country: "AT", travelTime: 375 },
        "feldkirch": { name: "Feldkirch", info: "Vorarlberg", zone: "V", country: "AT", travelTime: 370 },
        "lustenau": { name: "Lustenau", info: "Vorarlberg", zone: "V", country: "AT", travelTime: 378 },
        // ── FALLBACK ────────────────────────────────────────────
        "sonstige": { name: "Sonstige", info: "Wird per Email geklärt", zone: "B", country: "AT", travelTime: 60 }
    }
};

const state = {
    customerType: null,
    serviceType: null,
    quantities: {},
    couchAddons: {},
    conditions: [],
    location: null,
    selectedDate: null,
    selectedSlot: null  // 🆕 ÚJ v3.1
};
let started = false;

// ═══════════════════════════════════════════════════════════
// CALENDAR DATE SELECTION HANDLER
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    const calendarContainer = document.getElementById('bookingCalendar');
    if (calendarContainer) {
        calendarContainer.addEventListener('dateSelected', (event) => {
            // 🆕 TELJES SLOT ADATOK MENTÉSE (v3.1)
            state.selectedDate = event.detail.date;
            state.selectedSlot = event.detail.slot;  // 🆕 ÚJ!

            console.log('📅 Slot selected:', {
                date: state.selectedDate,
                slot: state.selectedSlot,
                startTime: state.selectedSlot?.startTime,
                isFirstSlot: event.detail.isFirstSlot,
                flexibilityAccepted: event.detail.flexibilityAccepted
            });

            // 🆕 NE HÍVD AZ updateSummary()-t! Az újrarendereli a naptárat!
            // updateSummary();  // ← TÖRÖLVE!

            // Update timing display ONLY
            const timingText = document.getElementById('timingText');
            if (timingText && event.detail.date && event.detail.slot) {
                const formattedDate = new Date(event.detail.date).toLocaleDateString('de-AT', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short'
                });

                // 🆕 HASZNÁLD A SLOT STARTTIME-OT!
                const slotTime = event.detail.slot.startTime;
                const timeInfo = event.detail.isFirstSlot
                    ? ` um ${slotTime}`
                    : ` ~${slotTime} (±30 Min)`;

                timingText.innerHTML = `📅 ${formattedDate}${timeInfo}`;
                document.getElementById('summaryTiming').style.display = 'flex';
            }
        });
    }

    // ═══════════════════════════════════════════════════════════
    // 🆕 AUTO-START CONFIGURATOR FROM URL PARAMETER
    // ═══════════════════════════════════════════════════════════
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('start') === 'true') {
        // Small delay to ensure page is fully loaded
        setTimeout(() => {
            startAnimation();
            // Remove parameter from URL without reload
            window.history.replaceState({}, document.title, window.location.pathname);
        }, 500);
    }
});

function typeWriter(el, text, speed = 35) {
    return new Promise(resolve => {
        el.innerHTML = '';
        let i = 0;
        function type() {
            if (i < text.length) {
                const char = document.createElement('span');
                char.className = 'typewriter-char';
                char.textContent = text[i];
                el.appendChild(char);
                setTimeout(() => char.classList.add('visible'), 10);
                i++;
                setTimeout(type, speed);
            } else { resolve(); }
        }
        type();
    });
}

const delay = ms => new Promise(r => setTimeout(r, ms));

function buildChips(containerId, items, stepId, multi = false) {
    const container = document.getElementById(containerId);
    items.forEach(text => {
        const chip = document.createElement('button');
        chip.className = 'config-chip';
        chip.type = 'button';
        chip.setAttribute('aria-pressed', 'false');
        chip.textContent = text;
        chip.onclick = () => handleChipClick(chip, container, text, stepId, multi);
        container.appendChild(chip);
    });
}

function handleChipClick(chip, container, value, stepId, multi) {
    if (multi) {
        chip.classList.toggle('selected');
        if (chip.classList.contains('selected')) {
            if (!state.conditions.includes(value)) state.conditions.push(value);
        } else {
            state.conditions = state.conditions.filter(c => c !== value);
        }
    } else {
        container.querySelectorAll('.config-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        if (stepId === 1) state.customerType = value;
        if (stepId === 2) { state.serviceType = value; updateVisibleProducts(); }
    }
    container.querySelectorAll('.config-chip').forEach(button => {
        button.setAttribute('aria-pressed', String(button.classList.contains('selected')));
    });
    updateSummary();
    updateHeroBadges();
}

function buildNumbers(containerId, items) {
    const container = document.getElementById(containerId);
    items.forEach(item => {
        state.quantities[item.name] = 0;
        const div = document.createElement('div');
        // Slug generation for class based targeting
        const slug = item.name.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[()]/g, '') // Remove parenthesis
            .replace(/couch/g, 'couch')
            .replace(/ü/g, 'ue')
            .replace(/ö/g, 'oe')
            .replace(/ä/g, 'ae');

        div.className = `config-num-item config-item-${slug}`;
        div.dataset.category = item.category;
        div.dataset.product = item.name;
        div.innerHTML = `
                <div class="config-product-row">
                    <span class="config-num-label">${item.name}</span>
                    <div class="config-num-controls">
                        <button type="button" class="config-num-btn" aria-label="${item.name}: Anzahl verringern" onclick="changeQty('${item.name}', -1)">−</button>
                        <span class="config-num-value" id="qty-${item.name.replace(/\s/g, '-')}">0</span>
                        <button type="button" class="config-num-btn" aria-label="${item.name}: Anzahl erhöhen" onclick="changeQty('${item.name}', 1)">+</button>
                    </div>
                </div>
                `;
        if (hasCouchAddons(item.name)) {
            div.classList.add('config-couch-item');
            const addons = document.createElement('div');
            addons.className = 'config-couch-addons';
            addons.hidden = true;
            div.appendChild(addons);
        }
        container.appendChild(div);
    });
}

function renderCouchAddons(name) {
    if (!hasCouchAddons(name)) return;
    const quantity = state.quantities[name] || 0;
    const units = state.couchAddons[name] || [];
    units.length = quantity;
    for (let index = 0; index < quantity; index++) units[index] ||= [];
    state.couchAddons[name] = units;
    const item = Array.from(document.querySelectorAll('#numbers3 .config-num-item'))
        .find(element => element.dataset.product === name);
    const container = item.querySelector('.config-couch-addons');
    container.hidden = quantity === 0;
    container.replaceChildren();
    units.forEach((selected, unitIndex) => {
        const fieldset = document.createElement('fieldset');
        fieldset.className = 'config-addon-unit';
        const legend = document.createElement('legend');
        legend.textContent = `${name}${quantity > 1 ? ` ${unitIndex + 1}` : ''} · Passende Extras`;
        fieldset.appendChild(legend);
        COUCH_ADDONS.forEach(addon => {
            if (!Object.hasOwn(addon.prices, name)) return;
            const label = document.createElement('label');
            label.className = 'config-addon-option';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = addon.id;
            checkbox.checked = selected.includes(addon.id);
            checkbox.dataset.addon = addon.id;
            checkbox.setAttribute('aria-label', `${name} ${unitIndex + 1}: ${addon.name}, +${addon.prices[name]} Euro`);
            const copy = document.createElement('span');
            copy.className = 'config-addon-copy';
            const title = document.createElement('span');
            title.textContent = addon.name;
            const description = document.createElement('small');
            description.textContent = addon.description;
            copy.append(title, description);
            const price = document.createElement('strong');
            price.className = 'config-addon-price';
            price.textContent = `+${addon.prices[name]} €`;
            label.append(checkbox, copy, price);
            fieldset.appendChild(label);
            checkbox.addEventListener('change', () => {
                let next = state.couchAddons[name][unitIndex].filter(id => id !== addon.id);
                if (checkbox.checked) next.push(addon.id);
                // The intensive treatment already includes odor treatment.
                if (next.includes('intensive')) next = next.filter(id => id !== 'odor');
                state.couchAddons[name][unitIndex] = next;
                syncAddonInputs(fieldset, next);
                updateSummary();
            });
        });
        syncAddonInputs(fieldset, selected);
        container.appendChild(fieldset);
    });
    if (quantity > 0) {
        const note = document.createElement('p');
        note.className = 'config-addon-note';
        note.textContent = 'Optional, je Möbelstück. Behandlung je nach Material und Zustand; vollständige Flecken- oder Geruchsentfernung kann nicht garantiert werden.';
        container.appendChild(note);
    }
}

function syncAddonInputs(fieldset, selected) {
    fieldset.querySelectorAll('input').forEach(input => {
        input.checked = selected.includes(input.value);
        input.disabled = input.value === 'odor' && selected.includes('intensive');
        if (input.value === 'odor') {
            input.closest('label').querySelector('small').textContent = input.disabled
                ? 'In der gewählten Intensivreinigung bereits enthalten.'
                : COUCH_ADDONS.find(addon => addon.id === 'odor').description;
        }
    });
}

function getSelectedServices(selection = state) {
    const services = [];
    STEPS[2].numbers.forEach(product => {
        const quantity = selection.quantities[product.name] || 0;
        const visible = selection.serviceType === 'Beides'
            || (selection.serviceType === 'Polstermöbel' && product.category === 'polster')
            || (selection.serviceType === 'Matratzen' && product.category === 'matratze');
        if (!visible || quantity <= 0) return;
        services.push({ name: product.name, quantity, pricePerUnit: product.price,
            totalPrice: product.price * quantity, duration: product.duration * quantity, category: product.category });
        (selection.couchAddons[product.name] || []).slice(0, quantity).forEach((selected, unitIndex) => {
            COUCH_ADDONS.forEach(addon => {
                if (!selected.includes(addon.id) || addon.prices[product.name] === undefined) return;
                if (addon.id === 'odor' && selected.includes('intensive')) return;
                services.push({
                    name: `${product.name} ${unitIndex + 1}: ${addon.name}`,
                    quantity: 1, pricePerUnit: addon.prices[product.name], totalPrice: addon.prices[product.name],
                    duration: addon.durations[product.name], category: product.category, addonId: addon.id,
                    parentProduct: product.name, parentUnit: unitIndex + 1
                });
            });
        });
    });
    return services;
}

// The n8n build embeds this exact pure calculation and its catalog. Keep DOM
// access in updateSummary; pricing must also run without a browser on the server.
function calculateBooking(selection = state) {
    const services = getSelectedServices(selection);
    const baseTotal = services.reduce((sum, item) => sum + (item.addonId ? 0 : item.totalPrice), 0);
    const addonTotal = services.reduce((sum, item) => sum + (item.addonId ? item.totalPrice : 0), 0);
    const subtotal = baseTotal + addonTotal;
    const discountFactor = selection.customerType === 'Geschäftskunde' ? 0.9 : 1;
    const conditionPercent = Math.max(0, ...selection.conditions.map(condition => DYNAMIC_CONTENT.conditions[condition]?.surcharge || 0));
    // Preserve the existing pet treatment for mattresses. Upholstery
    // treatments are charged exclusively through their explicitly selected extras.
    const otherFurnitureTotal = services.filter(item => !item.addonId && !hasCouchAddons(item.name))
        .reduce((sum, item) => sum + item.totalPrice, 0);
    const petSurcharge = selection.conditions.includes('Haustiere') && conditionPercent === 0
        ? otherFurnitureTotal * 0.1 * discountFactor : 0;
    const zone = DYNAMIC_CONTENT.locations[selection.location]?.zone;
    const minimum = getZoneRule(zone).minOrder;
    const subtotalAfterDiscount = subtotal * discountFactor;
    const conditionSurcharge = subtotalAfterDiscount * conditionPercent / 100;
    const beforeMinimum = subtotalAfterDiscount + conditionSurcharge + petSurcharge + 20;
    const minimumAdjustment = Math.max(0, (subtotal > 0 ? minimum : 0) - beforeMinimum);
    const finalTotal = Math.round(beforeMinimum + minimumAdjustment);
    const cents = value => Math.round((value + Number.EPSILON) * 100) / 100;
    const discountAmount = cents(subtotal - subtotalAfterDiscount);
    const roundingAdjustment = cents(finalTotal - (subtotal - discountAmount
        + cents(conditionSurcharge) + cents(petSurcharge) + 20 + cents(minimumAdjustment)));
    return { services, baseTotal, addonTotal, subtotal, finalTotal, conditionPercent, petSurcharge, otherFurnitureTotal,
        discountPercent: discountFactor === 1 ? 0 : 10, discountAmount,
        subtotalAfterDiscount: cents(subtotalAfterDiscount), conditionSurcharge: cents(conditionSurcharge),
        travelFee: 20, minimum, minimumAdjustment: cents(minimumAdjustment), roundingAdjustment,
        totalDuration: services.reduce((sum, item) => sum + item.duration, 0),
        itemCount: services.filter(item => !item.addonId).reduce((sum, item) => sum + item.quantity, 0) };
}

function updateVisibleProducts() {
    const step3 = document.getElementById('step3');
    const items = document.querySelectorAll('#numbers3 .config-num-item');

    // Hide Step 3 entirely if no service type selected
    if (!state.serviceType) {
        if (step3) step3.style.display = 'none';
        items.forEach(item => item.style.display = 'none');
        return;
    }

    // Show Step 3
    if (step3) {
        step3.style.display = 'block';
        const productLabel = document.getElementById('label3');
        if (productLabel) {
            productLabel.textContent = STEPS.find(step => step.id === 3).label;
            productLabel.classList.add('visible');
        }
        // Ensure visibility class is there if called after animation
        if (!step3.classList.contains('visible') && started) {
            step3.classList.add('visible');
            document.getElementById('num3').classList.add('visible');
        }
    }

    items.forEach(item => {
        const cat = item.dataset.category;
        let shouldShow = false;

        if (state.serviceType === 'Polstermöbel') shouldShow = (cat === 'polster');
        else if (state.serviceType === 'Matratzen') shouldShow = (cat === 'matratze');
        else shouldShow = true; // Beides or fallback

        item.style.display = shouldShow ? 'flex' : 'none';
        if (!shouldShow) {
            const name = item.dataset.product;
            state.quantities[name] = 0;
            document.getElementById(`qty-${name.replace(/\s/g, '-')}`).textContent = '0';
            renderCouchAddons(name);
        }
        if (shouldShow && started) item.classList.add('visible');
    });
}

function changeQty(name, delta) {
    state.quantities[name] = Math.max(0, (state.quantities[name] || 0) + delta);
    document.getElementById(`qty-${name.replace(/\s/g, '-')}`).textContent = state.quantities[name];
    renderCouchAddons(name);
    updateSummary();
    updateHeroBadges();
}

function handleLocationChange(select) {
    state.location = select.value;
    updateSummary();
    updateHeroBadges();

    // Show Step 6 (Address fields) when location is selected
    const step6 = document.getElementById('step6');
    if (step6) {
        if (state.location) {
            step6.style.display = 'block';
            step6.classList.add('visible');  // ✅ FONTOS: opacity: 1
        } else {
            step6.style.display = 'none';
            step6.classList.remove('visible');
        }
    }

    // ═══════════════════════════════════════════════════════════
    // TRIGGER CALENDAR UPDATE
    // ═══════════════════════════════════════════════════════════
    if (state.location && typeof BookingCalendar !== 'undefined') {
        const locationData = DYNAMIC_CONTENT.locations[state.location];
        if (locationData) {
            // Show calendar container if hidden
            const calendarWrapper = document.getElementById('calendarWrapper');
            if (calendarWrapper) {
                calendarWrapper.style.display = 'block';
                calendarWrapper.classList.add('visible');
            }

            // Update calendar with selected city
            BookingCalendar.setCity(locationData.name.split('/')[0]);

            // 🆕 ZEIT-EINSCHRÄNKUNG (v2.1): außerhalb Burgenland nur 11:00 / 13:00 Uhr.
            // Der Kalender (booking-calendar.js) muss setAllowedStartTimes() umsetzen:
            //   - Array  → nur diese Startzeiten anbieten
            //   - null   → keine Einschränkung (Burgenland)
            const rule = getZoneRule(locationData.zone);
            if (typeof BookingCalendar.setAllowedStartTimes === 'function') {
                BookingCalendar.setAllowedStartTimes(rule.restrictHours ? RESTRICTED_START_TIMES : null);
            }
        }
    }
}

function updateSummary() {
    const quote = calculateBooking();
    const { baseTotal, totalDuration, finalTotal } = quote;
    const items = quote.services.map(item => `${item.quantity}× ${item.name} · ${item.totalPrice} €`);
    document.getElementById('basePrice').textContent = baseTotal;
    document.getElementById('summaryAddons').hidden = quote.addonTotal === 0;
    document.getElementById('addonsPrice').textContent = quote.addonTotal;
    document.getElementById('summaryConditions').hidden = quote.conditionPercent === 0;
    document.getElementById('conditionPercent').textContent = quote.conditionPercent;
    document.getElementById('summaryPets').hidden = quote.petSurcharge === 0;
    document.getElementById('petsPrice').textContent = quote.petSurcharge.toLocaleString('de-AT', { maximumFractionDigits: 2 });
    document.getElementById('summaryMinimumAdjustment').hidden = quote.minimumAdjustment === 0;
    document.getElementById('minimumAdjustmentPrice').textContent = quote.minimumAdjustment.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('summaryRounding').hidden = quote.roundingAdjustment === 0;
    document.getElementById('roundingPrice').textContent = (quote.roundingAdjustment > 0 ? '+' : '')
        + quote.roundingAdjustment.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.querySelectorAll('#chips4 .config-chip').forEach(chip => {
        if (chip.textContent.startsWith('Haustiere')) {
            chip.textContent = quote.otherFurnitureTotal > 0
                ? 'Haustiere (+10% auf Matratzen)'
                : 'Haustiere (Hinweis, kostenlos)';
        }
    });

    // 1. ÜGYFÉLTÍPUS KEDVEZMÉNY
    if (state.customerType === 'Geschäftskunde') {
        document.getElementById('summaryDiscount').style.display = 'flex';
    } else {
        document.getElementById('summaryDiscount').style.display = 'none';
    }

    // 3. ANFAHRTSKOSTEN (fix 20€)
    const anfahrtskosten = 20;
    const anfahrtEl = document.getElementById('summaryAnfahrt');
    if (anfahrtEl) {
        anfahrtEl.style.display = 'flex';
        document.getElementById('anfahrtAmount').textContent = `+${anfahrtskosten}`;
    }

    // 4b. MINDESTBESTELLWERT (zonenabhängig: 0 € Burgenland / 199 € angrenzend / 299 € weiter entfernt)
    const zone = (state.location && DYNAMIC_CONTENT.locations[state.location])
        ? DYNAMIC_CONTENT.locations[state.location].zone : null;
    const zoneMinOrder = getZoneRule(zone).minOrder;
    const mindestEl = document.getElementById('summaryMindest');
    if (zoneMinOrder > 0 && baseTotal > 0) {
        if (mindestEl) {
            mindestEl.style.display = 'flex';
            // Optional: falls ein Betrags-Element existiert, den korrekten Mindestwert anzeigen
            const mindestAmountEl = document.getElementById('mindestAmount');
            if (mindestAmountEl) mindestAmountEl.textContent = zoneMinOrder;
            else {
                const minimumLabel = mindestEl.querySelector('strong');
                if (minimumLabel) minimumLabel.textContent = `${zoneMinOrder} €`;
            }
        }
    } else if (mindestEl) {
        mindestEl.style.display = 'none';
    }

    // Eredmény megjelenítése (kerekítve)
    document.getElementById('totalPrice').textContent = Math.round(finalTotal);

    // 5. Időtartam
    const hours = Math.floor(totalDuration / 60), mins = totalDuration % 60;
    document.getElementById('totalDuration').textContent = hours > 0
        ? `${hours}h ${mins > 0 ? mins + 'min' : ''}`
        : `${mins} Min.`;

    // 6. Kiválasztott tételek
    document.getElementById('summaryItems').innerHTML = items.length
        ? items.map(i => `<span class="config-summary-item">${i}</span>`).join('')
        : '<span class="config-summary-item">Noch keine Auswahl</span>';

    // 7. Helyszín
    if (state.location && DYNAMIC_CONTENT.locations[state.location]) {
        document.getElementById('summaryLocation').style.display = 'flex';
        document.getElementById('locationText').innerHTML = `Standort: <strong>${DYNAMIC_CONTENT.locations[state.location].name}</strong>`;
    } else {
        document.getElementById('summaryLocation').style.display = 'none';
    }

    // 🆕 UPDATE CALENDAR WITH REQUIRED DURATION
    if (typeof BookingCalendar !== 'undefined' && BookingCalendar.setRequiredDuration) {
        if (BookingCalendar.state.requiredDuration !== totalDuration) {
            // A longer order must not retain a previously confirmed, shorter slot.
            if (BookingCalendar.getSelectedSlot()) {
                BookingCalendar.backToCalendar();
                state.selectedSlot = null;
                state.selectedDate = null;
                document.getElementById('summaryTiming').style.display = 'none';
            }
            BookingCalendar.setRequiredDuration(totalDuration);
        }
    }
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
    if (state.customerType && DYNAMIC_CONTENT.customerType[state.customerType]) {
        badges.push(DYNAMIC_CONTENT.customerType[state.customerType]);
    }

    // 2. Service Type
    if (state.serviceType && DYNAMIC_CONTENT.serviceType[state.serviceType]) {
        badges.push(DYNAMIC_CONTENT.serviceType[state.serviceType]);
    }

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
            desc: `${loc.info} - 20€ Anfahrtskosten`
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
                desc: "In dieser Region bieten wir feste Anfahrtszeiten an.",
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
function submitForm() {
    // Get contact field values
    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const phone = document.getElementById('contactPhone').value.trim();
    const message = document.getElementById('contactMessage').value.trim();

    // Validate required fields
    let hasError = false;

    document.querySelectorAll('.config-input, .config-textarea').forEach(el => {
        el.classList.remove('error');
    });

    if (!name) {
        document.getElementById('contactName').classList.add('error');
        hasError = true;
    }

    if (!email || !isValidEmail(email)) {
        document.getElementById('contactEmail').classList.add('error');
        hasError = true;
    }

    if (!phone) {
        document.getElementById('contactPhone').classList.add('error');
        hasError = true;
    }

    // Validate email confirmation
    const emailConfirm = document.getElementById('contactEmailConfirm');
    if (emailConfirm) {
        const confirmEmail = emailConfirm.value.trim();

        if (!confirmEmail) {
            emailConfirm.classList.add('error');
            hasError = true;
        } else if (email !== confirmEmail) {
            emailConfirm.classList.add('error');
            alert('Die E-Mail-Adressen stimmen nicht überein!');
            return;
        }
    }

    // Validate address fields (Step 6)
    if (state.location) {
        const streetInput = document.getElementById('street');
        const plzInput = document.getElementById('plz');
        const cityInput = document.getElementById('city');

        if (!streetInput?.value.trim()) {
            streetInput?.classList.add('error');
            hasError = true;
        }
        if (!plzInput?.value.trim()) {
            plzInput?.classList.add('error');
            hasError = true;
        }
        if (!cityInput?.value.trim()) {
            cityInput?.classList.add('error');
            hasError = true;
        }
    }

    if (hasError) {
        return;
    }

    // 🆕 SLOT VALIDÁCIÓ (v3.1)
    if (typeof BookingCalendar !== 'undefined') {
        if (!BookingCalendar.isValid()) {
            const errorMsg = BookingCalendar.getValidationMessage();
            alert(errorMsg || 'Bitte wählen Sie einen Termin aus.');
            return;
        }
    }

    // 🆕 v2.2 ROOT-CAUSE FIX: Termin-Auswahl VERBINDLICH direkt aus dem Kalender lesen.
    // Der Kalender ist die alleinige Wahrheit — der lokale state.* kann veraltet oder
    // leer sein (setCity() setzt die Kalenderauswahl zurück, ohne den lokalen State zu
    // leeren; das dateSelected-Event feuert nur bei Slot-Bestätigung). Ohne diese
    // Absicherung ging preferredDate/slotStartTime als null raus → Server-Default
    // (fälschlich 20.07. / 09:00 statt der gewählten Zeit).
    if (typeof BookingCalendar !== 'undefined') {
        state.selectedDate = BookingCalendar.getSelectedDate();
        state.selectedSlot = BookingCalendar.getSelectedSlot();
    }
    // Harte Absicherung: ohne Datum UND Uhrzeit KEINE Buchung senden.
    if (!state.selectedDate || !state.selectedSlot || !state.selectedSlot.startTime) {
        alert('Bitte wählen und bestätigen Sie zuerst einen Termin im Kalender (Datum + Uhrzeit).');
        return;
    }

    // 🆕 ZEIT-VALIDIERUNG (v2.1): außerhalb Burgenland nur 11:00 / 13:00 Uhr
    const _locRule = (state.location && DYNAMIC_CONTENT.locations[state.location])
        ? getZoneRule(DYNAMIC_CONTENT.locations[state.location].zone)
        : { restrictHours: false };
    const _slotStart = state.selectedSlot?.startTime;
    if (_locRule.restrictHours && _slotStart && !RESTRICTED_START_TIMES.includes(_slotStart)) {
        alert('In dieser Region sind Termine nur um 11:00 oder 13:00 Uhr möglich. Bitte wählen Sie eine dieser Uhrzeiten im Kalender.');
        return;
    }

    // Check if any products selected
    const quote = calculateBooking();
    const hasProducts = quote.itemCount > 0;
    if (!hasProducts) {
        alert('Bitte wählen Sie mindestens ein Produkt aus.');
        return;
    }

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

function showBookingSuccess(data, payload) {
    const summary = document.getElementById('configSummary');

    // 🆕 HASZNÁLD A STATE-ET!
    const slotStartTime = data.slot?.startTime || payload.booking.slotStartTime;
    const duration = data.duration || payload.totals.estimatedDuration;

    const [startH, startM] = slotStartTime.split(':').map(Number);
    const endMinutes = startH * 60 + startM + duration;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const slotEndTime = data.slot?.endTime || `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

    const slotInfo = `
        <div class="booking-slot-info">
            <p><strong>📅 Termin:</strong> ${escapeBookingHtml(data.slot?.date || payload.booking.preferredDate)}</p>
            <p><strong>🕐 Zeit:</strong> ${escapeBookingHtml(slotStartTime)} - ${escapeBookingHtml(slotEndTime)}</p>
        </div>
    `;

    summary.innerHTML = `
        <div class="config-success">
            <div class="config-success-icon">
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h4 class="config-success-title">Anfrage erfolgreich gesendet!</h4>
            <p class="config-success-text">Vielen Dank, ${escapeBookingHtml(payload.customer.name)}!</p>
            ${slotInfo}
            <p class="config-success-text">Bei Fragen kontaktieren Sie uns gerne unter <a href="mailto:info@ecocleanposlterreinigung.at">info@ecocleanposlterreinigung.at
            </a>.</p>
        </div>
    `;
}

function showZoneMismatchError(data) {
    const summary = document.getElementById('configSummary');
    summary.innerHTML = `
        <div class="config-error">
            <div class="config-error-icon">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h4 class="config-error-title">Terminkonflikt</h4>
            <p class="config-error-text">${data.message || 'Der gewählte Tag ist bereits für eine andere Region reserviert.'}</p>
            <button class="config-retry-btn" onclick="location.reload()">
                Anderen Tag wählen
            </button>
        </div>
    `;
}

function showDayFullError(data) {
    const summary = document.getElementById('configSummary');
    summary.innerHTML = `
        <div class="config-error">
            <div class="config-error-icon">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h4 class="config-error-title">Tag ausgebucht</h4>
            <p class="config-error-text">${data.message || 'Der gewählte Tag ist leider bereits voll ausgebucht.'}</p>
            ${data.suggestion ? `<p class="config-suggestion">${data.suggestion.message}</p>` : ''}
            <button class="config-retry-btn" onclick="location.reload()">
                Neuen Termin anfragen
            </button>
        </div>
    `;
}

function showBookingError(data) {
    const summary = document.getElementById('configSummary');
    summary.innerHTML = `
        <div class="config-error">
            <div class="config-error-icon">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h4 class="config-error-title">Fehler aufgetreten</h4>
            <p class="config-error-text">${escapeBookingHtml(data.message || 'Bitte versuchen Sie es später erneut oder rufen Sie uns an.')}</p>
            <a href="tel:+4366499754216" class="config-phone-btn">
                📞 0664 9975 4216
            </a>
        </div>
    `;
}

function escapeBookingHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function showQuoteChangedError(data) {
    // Keep the current selections visible; a new quote requires a fresh review.
    document.getElementById('bookingQuoteError')?.remove();
    const notice = document.createElement('div');
    notice.id = 'bookingQuoteError';
    notice.className = 'config-error';
    notice.setAttribute('role', 'alert');
    const message = document.createElement('p');
    message.textContent = data.message || 'Bitte laden Sie das aktuelle Angebot und bestätigen Sie es erneut.';
    notice.appendChild(message);
    const pricing = data.details?.pricing;
    if (pricing && Number.isFinite(pricing.finalPrice)) {
        const amount = document.createElement('p');
        amount.textContent = `Aktueller Gesamtpreis: ${pricing.finalPrice.toLocaleString('de-AT')} € inkl. Anfahrt. Es wurde kein Termin gebucht.`;
        notice.appendChild(amount);
    }
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'config-retry-btn';
    retry.textContent = 'Aktuelles Angebot laden';
    retry.onclick = () => window.location.reload();
    notice.appendChild(retry);
    document.querySelector('.config-contact').prepend(notice);
}

// ═══════════════════════════════════════════════════════════
// FALLBACK TO FORMSUBMIT IF N8N FAILS
// ═══════════════════════════════════════════════════════════
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

function showSuccessMessage() {
    const summary = document.getElementById('configSummary');
    summary.innerHTML = `
        <div class="config-success">
            <div class="config-success-icon">
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h4 class="config-success-title">Anfrage erfolgreich gesendet!</h4>
            <p class="config-success-text">Vielen Dank! Wir melden uns innerhalb von 24 Stunden bei Ihnen.</p>
        </div>
    `;
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ═══════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════
function init() {
    buildChips('chips1', STEPS[0].chips, 1);
    buildChips('chips2', STEPS[1].chips, 2);
    buildNumbers('numbers3', STEPS[2].numbers);
    buildChips('chips4', STEPS[3].chips, 4, true);
    document.querySelectorAll('#chips4 .config-chip').forEach(chip => {
        if (chip.textContent === 'Haustiere') chip.textContent = 'Haustiere (Hinweis, kostenlos)';
        if (chip.textContent === 'Allergiker') chip.textContent = 'Allergiker (+10%)';
    });
    // STEPS[5] eltávolítva - nem létezik (a tömb 5 elemű, 0-4 index).
    // Az 5. lépés (STEPS[4]) egy select-mező, a 6. "lépés" a naptár, nem chip.

    // Initialize visibility (Hide Step 3 initially)
    updateVisibleProducts();

    console.log('ECO Clean Konfigurator v2.2.0 - CENTAUR TRIAD Edition');
    console.log('n8n Webhook:', N8N_CONFIG.webhookUrl);
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

function startAnimation() {
    // The homepage keeps the offer in its own section. Every CTA returns to it,
    // including repeat clicks after the configurator has already been opened.
    if (document.body.classList.contains('px-site')) {
        const destination = document.getElementById('configurator');
        destination.classList.add('active');
        requestAnimationFrame(() => {
            destination.focus({ preventScroll: true });
            destination.scrollIntoView({
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
                block: 'start'
            });
        });
    }
    if (started) {
        // Already started, do nothing
        return;
    }
    started = true;

    // 1. Activate Button
    const btn = document.getElementById('startBtn');
    btn.classList.add('active');
    btn.innerHTML = 'Konfigurator aktiv <span style="color:var(--color-accent)">●</span>';

    // 2. Show Configurator & Hide Hero Image
    const config = document.getElementById('configurator');
    const panel = document.getElementById('configPanel');
    const heroImage = document.getElementById('heroImage');

    // Fade out hero image
    if (heroImage) {
        heroImage.style.opacity = '0';
        setTimeout(() => {
            heroImage.style.display = 'none';
        }, 500);
    }

    config.classList.add('active');
    panel.classList.add('active');

    // 3. Show Header Immediately
    setTimeout(() => {
        document.getElementById('configHeader').classList.add('visible');
        document.getElementById('configIcon').classList.add('visible');

        const title = document.getElementById('configTitle');
        title.textContent = 'Preis-Konfigurator';

        document.getElementById('configBadge').classList.add('visible');
        document.getElementById('badgeText').textContent = 'LIVE';
    }, 300);

    // 4. Show All Steps Quickly
    let delayCounter = 500;
    STEPS.forEach((step, index) => {
        // Skip Step 3 - it appears only after category selection
        if (step.id === 3) return;

        setTimeout(() => {
            const stepEl = document.getElementById(`step${step.id}`);
            if (!stepEl) return;

            stepEl.classList.add('visible');

            // Show Label
            const label = document.getElementById(`label${step.id}`);
            if (label && step.label) {
                label.textContent = step.label;
                label.classList.add('visible');
            }

            // Show Number
            const num = document.getElementById(`num${step.id}`);
            if (num) num.classList.add('visible');

            // Show Items
            const internalElements = stepEl.querySelectorAll('.config-chip, .config-num-item, .config-select-wrap');
            internalElements.forEach((el, i) => {
                setTimeout(() => {
                    el.classList.add('visible');
                }, i * 50);
            });

        }, delayCounter);
        delayCounter += 200; // Much faster - 200ms between steps
    });

    // 5. Show Summary
    setTimeout(() => {
        document.getElementById('configSummary').classList.add('visible');
    }, delayCounter + 100);
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

    // ═══════════════════════════════════════════════════════════
    // EMAIL CONFIRMATION VALIDATION (Real-time)
    // ═══════════════════════════════════════════════════════════
    const emailInput = document.getElementById('contactEmail');
    const emailConfirm = document.getElementById('contactEmailConfirm');
    const emailConfirmError = document.getElementById('emailConfirmError');

    if (emailInput && emailConfirm && emailConfirmError) {
        // Validate on email confirmation input
        emailConfirm.addEventListener('input', function () {
            const email = emailInput.value.trim();
            const confirmEmail = emailConfirm.value.trim();

            // Only validate if confirmation field has content
            if (confirmEmail.length > 0) {
                if (email !== confirmEmail) {
                    // Mismatch - show error
                    emailConfirm.classList.remove('success');
                    emailConfirm.classList.add('error');
                    emailConfirmError.style.display = 'block';
                } else {
                    // Match - show success
                    emailConfirm.classList.remove('error');
                    emailConfirm.classList.add('success');
                    emailConfirmError.style.display = 'none';
                }
            } else {
                // Empty - reset
                emailConfirm.classList.remove('error', 'success');
                emailConfirmError.style.display = 'none';
            }
        });

        // Also validate when original email changes
        emailInput.addEventListener('input', function () {
            const email = emailInput.value.trim();
            const confirmEmail = emailConfirm.value.trim();

            // Only validate if confirmation field has content
            if (confirmEmail.length > 0) {
                if (email !== confirmEmail) {
                    emailConfirm.classList.remove('success');
                    emailConfirm.classList.add('error');
                    emailConfirmError.style.display = 'block';
                } else {
                    emailConfirm.classList.remove('error');
                    emailConfirm.classList.add('success');
                    emailConfirmError.style.display = 'none';
                }
            }
        });
    }
});
