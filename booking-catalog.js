/* ═══════════════════════════════════════════════════════════════════════════
   ECO CLEAN — BOOKING CATALOG (single source of truth)

   This file holds the products, the per-item extras and the pure price
   calculation. It touches no DOM, so the identical code runs in the browser,
   in the n8n "Normalize Payload" node and in the offline self-check.

   ⚠ TRUST BOUNDARY: the browser quote is client-controlled input. The booking
   service must recalculate with this catalog before accepting a booking.
   Whenever prices, durations or product names change here, the n8n mirror has
   to be republished with the same build — otherwise the server answers
   QUOTE_CHANGED and no booking is created.

   Product `name` values are the wire format. Existing names must not be
   renamed without migrating n8n and the stored bookings.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.ECOBookingCatalog = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    // ── Categories ───────────────────────────────────────────────────────────
    const CATEGORIES = [
        { id: 'polster', label: 'Polstermöbel', desc: 'Couch, Sofa, Sessel, Stühle, Kissen' },
        { id: 'matratze', label: 'Matratzen', desc: 'Kinder-, Einzel- und Doppelmatratzen' },
        { id: 'teppich', label: 'Teppiche', desc: 'Nach Größe — vom Läufer bis zum Wohnzimmerteppich' },
        { id: 'auto', label: 'Autopolster', desc: 'Einzelne Sitze oder der komplette Innenraum' }
    ];

    // ── Products ─────────────────────────────────────────────────────────────
    // price: EUR per piece · duration: working minutes per piece
    // addonScope: 'unit' → extras are chosen for each individual piece
    //             'all'  → one choice applies to every piece of that product
    // ui.*: display only. The n8n mirror ignores it.
    const PRODUCTS = [
        // ── Polstermöbel ─────────────────────────────────────────────────────
        {
            name: 'L-Couch', price: 119, duration: 60, category: 'polster', addonScope: 'unit',
            ui: {
                id: 'l-couch', badge: 'Beliebt',
                blurb: 'Eckcouch mit einer Verlängerung',
                tip: 'Eine Couch mit genau einem angesetzten Längsteil (Ottomane) — von oben betrachtet ein „L". Gemessen wird die längste Seite. Sitz-, Rücken- und Armflächen sind im Preis enthalten.'
            }
        },
        {
            name: 'U-Couch', price: 159, duration: 90, category: 'polster', addonScope: 'unit',
            ui: {
                id: 'u-couch',
                blurb: 'Wohnlandschaft mit zwei Verlängerungen',
                tip: 'Große Wohnlandschaft mit zwei angesetzten Teilen. Für sehr große Anlagen ab etwa fünf Metern melden wir uns vor dem Termin kurz zur Abstimmung.'
            }
        },
        {
            name: 'Sofa', price: 85, duration: 45, category: 'polster', addonScope: 'unit',
            ui: {
                id: 'sofa',
                blurb: '2- bis 3-Sitzer ohne Eckteil',
                tip: 'Gerades Sofa ohne Eckteil, bis etwa drei Sitzplätze. Lose Sitz- und Rückenkissen reinigen wir beidseitig mit.'
            }
        },
        {
            name: 'Ottomane / Récamiere', price: 65, duration: 35, category: 'polster', addonScope: 'unit',
            ui: {
                id: 'ottomane', badge: 'Neu',
                blurb: 'Liegeteil oder Anbauelement',
                tip: 'Einzelnes Liege- oder Anbauelement. Wählen Sie diesen Punkt, wenn das Teil separat neben Ihrer Couch steht — ist es fest angebaut, ist es bereits in der L- oder U-Couch enthalten.'
            }
        },
        {
            name: 'Sessel', price: 35, duration: 15, category: 'polster', addonScope: 'unit',
            ui: { id: 'sessel', blurb: 'Einzelsessel, Ohrensessel', tip: 'Einzelsessel jeder Bauart, auch Ohren- und Relaxsessel. Bei Relaxsesseln fahren wir die Mechanik für die Reinigung aus.' }
        },
        {
            name: 'Hocker / Pouf', price: 29, duration: 15, category: 'polster', addonScope: 'all',
            ui: {
                id: 'hocker', badge: 'Neu',
                blurb: 'Fußhocker, Pouf, Sitzwürfel',
                tip: 'Der Fußhocker zu Ihrer Couch. Er wird am häufigsten benutzt und daher am schnellsten grau — deshalb lohnt es sich, ihn zusammen mit der Couch zu buchen. Die Extras gelten für alle gewählten Hocker gemeinsam.'
            }
        },
        {
            name: 'Stuhl', price: 19, duration: 10, category: 'polster', addonScope: 'all',
            ui: { id: 'stuhl', blurb: 'Esszimmer- und Polsterstuhl', tip: 'Gepolsterte Sitzfläche und, falls vorhanden, Rückenpolster. Vollholz- und Kunststoffstühle brauchen keine Polsterreinigung.' }
        },
        {
            name: 'Bürostuhl', price: 25, duration: 15, category: 'polster', addonScope: 'all',
            ui: {
                id: 'buerostuhl', badge: 'Neu',
                blurb: 'Drehstuhl mit Stoff- oder Netzbezug',
                tip: 'Sitz, Rücken und Armauflagen. Netzbezüge trocknen schneller als Stoffpolster. Für Büros mit vielen Arbeitsplätzen erstellen wir gerne ein eigenes Angebot.'
            }
        },
        {
            name: 'Barhocker', price: 15, duration: 8, category: 'polster', addonScope: 'all',
            ui: { id: 'barhocker', badge: 'Neu', blurb: 'Gepolsterte Sitzfläche', tip: 'Kleine gepolsterte Sitzfläche mit oder ohne Lehne — typisch an Küchen- und Bartresen.' }
        },
        {
            name: 'Zierkissen (nicht waschmaschinengeeignet)', price: 12, duration: 10, category: 'polster', addonScope: 'all',
            ui: {
                id: 'zierkissen', badge: 'Neu',
                blurb: 'Pro Kissen · zu groß für die Waschmaschine',
                tip: 'Für große Zier- und Bodenkissen, die nicht in die Waschmaschine passen oder deren Bezug nicht abnehmbar ist. Wir reinigen beide Seiten und den Kern oberflächlich mit. Kissen mit waschbarem Bezug sparen Sie sich — die dürfen ganz normal in die Maschine.'
            }
        },

        // ── Matratzen ────────────────────────────────────────────────────────
        {
            name: 'Kindermatratze (Trocken)', price: 29, duration: 20, category: 'matratze', addonScope: 'unit',
            ui: { id: 'matratze-kind-trocken', image: 'matratze-kind', blurb: 'Absaugen mit HEPA-Filter', tip: 'Trockenreinigung: Tiefenabsaugung mit HEPA-Filter, ohne Feuchtigkeit. Die Matratze ist sofort wieder nutzbar. Passend bei Staub und Hausstaubmilben.' }
        },
        {
            name: 'Kindermatratze (Nass)', price: 49, duration: 40, category: 'matratze', addonScope: 'unit',
            ui: { id: 'matratze-kind-nass', image: 'matratze-kind', blurb: 'Sprühextraktion bei Flecken', tip: 'Nassreinigung mit Sprühextraktion — die richtige Wahl bei Flecken und Gerüchen. Die Matratze braucht danach je nach Raumklima etwa 6–12 Stunden zum Durchtrocknen.' }
        },
        {
            name: 'Matratze Einzel (Trocken)', price: 39, duration: 30, category: 'matratze', addonScope: 'unit',
            ui: { id: 'matratze-einzel-trocken', image: 'matratze-einzel', blurb: 'Bis 100 cm Breite', tip: 'Bis etwa 100 cm Breite. Trockenreinigung ohne Feuchtigkeit, sofort wieder nutzbar.' }
        },
        {
            name: 'Matratze Einzel (Nass)', price: 69, duration: 45, category: 'matratze', addonScope: 'unit',
            ui: { id: 'matratze-einzel-nass', image: 'matratze-einzel', blurb: 'Bis 100 cm · bei Flecken', tip: 'Bis etwa 100 cm Breite, mit Sprühextraktion. Empfohlen bei sichtbaren Flecken. Trocknungszeit etwa 6–12 Stunden.' }
        },
        {
            name: 'Matratze Doppel (Trocken)', price: 59, duration: 45, category: 'matratze', addonScope: 'unit',
            ui: { id: 'matratze-doppel-trocken', image: 'matratze-doppel', blurb: 'Ab 120 cm Breite', tip: 'Ab etwa 120 cm Breite. Trockenreinigung ohne Feuchtigkeit. Bei zwei getrennten Matratzen im Doppelbett wählen Sie bitte zweimal „Einzel".' }
        },
        {
            name: 'Matratze Doppel (Nass)', price: 115, duration: 60, category: 'matratze', addonScope: 'unit',
            ui: { id: 'matratze-doppel-nass', image: 'matratze-doppel', badge: 'Gründlichste Variante', blurb: 'Ab 120 cm · bei Flecken', tip: 'Ab etwa 120 cm Breite, mit Sprühextraktion. Die gründlichste Variante bei Flecken und Gerüchen. Trocknungszeit etwa 6–12 Stunden.' }
        },

        // ── Teppiche ─────────────────────────────────────────────────────────
        // Die Größe bestimmt den Grundpreis, Material und Florhöhe kommen als
        // Auswahl pro Teppich dazu. Shaggy reinigen wir nicht — siehe NOT_OFFERED.
        {
            name: 'Teppich bis 4 m²', price: 49, duration: 40, category: 'teppich', addonScope: 'unit',
            ui: { id: 'teppich-s', image: 'teppich', badge: 'Neu', blurb: 'z. B. 160 × 230 cm', tip: 'Bis etwa 4 m² — der übliche Läufer oder Vorleger. Material und Florhöhe wählen Sie direkt darunter, denn beides ändert den Aufwand deutlich.' }
        },
        {
            name: 'Teppich 4–9 m²', price: 89, duration: 70, category: 'teppich', addonScope: 'unit',
            ui: { id: 'teppich-m', image: 'teppich', badge: 'Neu', blurb: 'z. B. 200 × 300 cm', tip: 'Etwa 4–9 m² — der klassische Wohnzimmerteppich. Messen Sie im Zweifel Länge × Breite und wählen Sie die passende Stufe.' }
        },
        {
            name: 'Teppich ab 9 m²', price: 129, duration: 100, category: 'teppich', addonScope: 'unit',
            ui: { id: 'teppich-l', image: 'teppich', badge: 'Neu', blurb: 'Große Flächen ab 300 × 300 cm', tip: 'Ab etwa 9 m². Bei sehr großen Stücken melden wir uns vor dem Termin kurz, damit Zeitfenster und Preis zusammenpassen.' }
        },
        {
            name: 'Teppichboden bis 15 m²', price: 99, duration: 75, category: 'teppich', addonScope: 'unit',
            ui: { id: 'teppichboden-s', image: 'teppichboden', badge: 'Neu', blurb: 'Verlegte Fläche · ein Zimmer', tip: 'Fest verlegter Teppichboden bis etwa 15 m² — ein normales Zimmer. Wir reinigen die freie Fläche; Möbel rücken wir nur, wenn sie zu zweit tragbar sind.' }
        },
        {
            name: 'Teppichboden 15–30 m²', price: 169, duration: 130, category: 'teppich', addonScope: 'unit',
            ui: { id: 'teppichboden-m', image: 'teppichboden', badge: 'Neu', blurb: 'Verlegte Fläche · zwei Zimmer', tip: 'Fest verlegter Teppichboden von etwa 15 bis 30 m². Rechnen Sie Raumlänge × Raumbreite und ziehen Sie fest verbaute Möbel ab.' }
        },
        {
            name: 'Teppichboden ab 30 m²', price: 239, duration: 190, category: 'teppich', addonScope: 'unit',
            ui: { id: 'teppichboden-l', image: 'teppichboden', badge: 'Neu', blurb: 'Verlegte Fläche · große Räume', tip: 'Fest verlegter Teppichboden ab etwa 30 m². Für Büros, Hotels und Veranstaltungsräume erstellen wir ein eigenes Angebot mit Termin außerhalb der Betriebszeiten.' }
        },

        // ── Autopolster ──────────────────────────────────────────────────────
        {
            name: 'Autositz (einzeln)', price: 35, duration: 25, category: 'auto', addonScope: 'all',
            ui: { id: 'autositz', badge: 'Neu', blurb: 'Pro Sitz · Stoff und Alcantara', tip: 'Ein einzelner Stoff- oder Alcantara-Sitz inklusive Sitzfläche, Lehne und Seitenwangen. Leder behandeln wir nicht mit dieser Technik.' }
        },
        {
            name: 'Auto-Innenraum komplett', price: 149, duration: 120, category: 'auto', addonScope: 'unit',
            ui: { id: 'auto-komplett', badge: 'Neu', blurb: 'Alle Sitze, Teppiche, Kofferraum', tip: 'PKW-Innenraum komplett: alle Stoffsitze, Fußraumteppiche, Kofferraum und Himmel, sofern textil. Für Busse, Wohnmobile und Transporter erstellen wir ein eigenes Angebot.' }
        }
    ];

    // ── Per-item extras ──────────────────────────────────────────────────────
    // A product without an entry in `prices` simply does not offer that extra.
    const ADDONS = [
        {
            id: 'sleep',
            name: 'Ausziehbare Liegefläche mitreinigen',
            description: 'Wir klappen die Schlaffunktion aus und reinigen die zusätzliche Liegefläche mit.',
            tip: 'Nur bei Schlafcouches sinnvoll. Die ausgeklappte Liegefläche ist eine eigene, meist ungeschützte Stoffschicht — sie wird ohne diese Option nicht mitgereinigt. Bitte räumen Sie Bettzeug vorher heraus.',
            prices: { 'L-Couch': 30, 'U-Couch': 40, 'Sofa': 25, 'Ottomane / Récamiere': 25 },
            durations: { 'L-Couch': 20, 'U-Couch': 20, 'Sofa': 20, 'Ottomane / Récamiere': 20 }
        },
        {
            id: 'odor',
            name: 'Geruchsbehandlung bei Haustieren',
            description: 'Zusätzliche Behandlung von Hunde- und Katzengerüchen. Bei Urinflecken wählen Sie bitte die Intensivreinigung.',
            tip: 'Wirkt gegen anhaftende Tiergerüche im Bezug. Tief in Schaum oder Federn eingezogener Urin lässt sich damit nicht sicher entfernen — dafür ist die Intensivreinigung gedacht, in der diese Behandlung bereits enthalten ist.',
            prices: { 'L-Couch': 25, 'U-Couch': 35, 'Sofa': 20, 'Ottomane / Récamiere': 20, 'Sessel': 10, 'Hocker / Pouf': 10, 'Stuhl': 5, 'Bürostuhl': 8, 'Barhocker': 5, 'Zierkissen (nicht waschmaschinengeeignet)': 4, 'Teppich bis 4 m²': 15, 'Teppich 4–9 m²': 25, 'Teppich ab 9 m²': 35, 'Teppichboden bis 15 m²': 25, 'Teppichboden 15–30 m²': 40, 'Teppichboden ab 30 m²': 55, 'Autositz (einzeln)': 10, 'Auto-Innenraum komplett': 35 },
            durations: { 'L-Couch': 15, 'U-Couch': 15, 'Sofa': 15, 'Ottomane / Récamiere': 15, 'Sessel': 10, 'Hocker / Pouf': 10, 'Stuhl': 5, 'Bürostuhl': 8, 'Barhocker': 5, 'Zierkissen (nicht waschmaschinengeeignet)': 5, 'Teppich bis 4 m²': 15, 'Teppich 4–9 m²': 20, 'Teppich ab 9 m²': 25, 'Teppichboden bis 15 m²': 25, 'Teppichboden 15–30 m²': 35, 'Teppichboden ab 30 m²': 45, 'Autositz (einzeln)': 10, 'Auto-Innenraum komplett': 30 }
        },
        {
            id: 'protection',
            name: 'Imprägnierung zum Fleckschutz',
            description: 'Zusätzlicher Fleckschutz für geeignete Textilbezüge.',
            tip: 'Nach der Reinigung aufgetragen. Flüssigkeiten perlen länger ab, sodass Sie mehr Zeit zum Auftupfen haben. Ob ein Bezug geeignet ist, hängt vom Material ab — wir prüfen es vor Ort und rechnen die Option ab, wenn wir sie nicht anwenden können.',
            prices: { 'L-Couch': 35, 'U-Couch': 45, 'Sofa': 25, 'Ottomane / Récamiere': 25, 'Sessel': 15, 'Hocker / Pouf': 12, 'Stuhl': 7, 'Bürostuhl': 10, 'Barhocker': 6, 'Zierkissen (nicht waschmaschinengeeignet)': 5, 'Teppich bis 4 m²': 20, 'Teppich 4–9 m²': 35, 'Teppich ab 9 m²': 49, 'Teppichboden bis 15 m²': 35, 'Teppichboden 15–30 m²': 55, 'Teppichboden ab 30 m²': 79, 'Autositz (einzeln)': 12, 'Auto-Innenraum komplett': 39 },
            durations: { 'L-Couch': 15, 'U-Couch': 15, 'Sofa': 15, 'Ottomane / Récamiere': 15, 'Sessel': 10, 'Hocker / Pouf': 10, 'Stuhl': 5, 'Bürostuhl': 8, 'Barhocker': 5, 'Zierkissen (nicht waschmaschinengeeignet)': 5, 'Teppich bis 4 m²': 15, 'Teppich 4–9 m²': 20, 'Teppich ab 9 m²': 25, 'Teppichboden bis 15 m²': 25, 'Teppichboden 15–30 m²': 35, 'Teppichboden ab 30 m²': 50, 'Autositz (einzeln)': 10, 'Auto-Innenraum komplett': 30 }
        },
        {
            id: 'intensive',
            name: 'Intensivreinigung bei starken Verschmutzungen / Urin',
            description: 'Zusätzliche Reinigung stark verschmutzter Stellen, einschließlich Geruchsbehandlung.',
            tip: 'Mehrere Reinigungsdurchgänge mit längerer Einwirkzeit für eingetrocknete Flecken, Urin und Erbrochenes. Die Geruchsbehandlung ist enthalten und wird deshalb nicht zusätzlich berechnet. Eine vollständige Entfernung alter Flecken können wir nicht zusichern.',
            prices: { 'L-Couch': 49, 'U-Couch': 59, 'Sofa': 39, 'Ottomane / Récamiere': 35, 'Sessel': 19, 'Hocker / Pouf': 19, 'Stuhl': 10, 'Bürostuhl': 15, 'Barhocker': 9, 'Zierkissen (nicht waschmaschinengeeignet)': 8, 'Teppich bis 4 m²': 29, 'Teppich 4–9 m²': 49, 'Teppich ab 9 m²': 69, 'Teppichboden bis 15 m²': 49, 'Teppichboden 15–30 m²': 79, 'Teppichboden ab 30 m²': 109, 'Autositz (einzeln)': 19, 'Auto-Innenraum komplett': 59 },
            durations: { 'L-Couch': 30, 'U-Couch': 30, 'Sofa': 30, 'Ottomane / Récamiere': 25, 'Sessel': 15, 'Hocker / Pouf': 15, 'Stuhl': 10, 'Bürostuhl': 12, 'Barhocker': 8, 'Zierkissen (nicht waschmaschinengeeignet)': 8, 'Teppich bis 4 m²': 25, 'Teppich 4–9 m²': 35, 'Teppich ab 9 m²': 45, 'Teppichboden bis 15 m²': 40, 'Teppichboden 15–30 m²': 60, 'Teppichboden ab 30 m²': 80, 'Autositz (einzeln)': 15, 'Auto-Innenraum komplett': 45 }
        },
        {
            id: 'hair',
            name: 'Festsitzende Tierhaare entfernen',
            description: 'Für Hunde- und Katzenhaare, die sich tief im Bezug festgesetzt haben.',
            tip: 'Ein eigener Arbeitsgang vor der Reinigung. Haare, die sich in Cord, Bouclé oder Velours regelrecht verhakt haben, gehen mit dem normalen Absaugen nicht heraus. Unabhängig von der Geruchsbehandlung — Haare und Geruch sind zwei verschiedene Probleme.',
            prices: { 'L-Couch': 20, 'U-Couch': 30, 'Sofa': 15, 'Ottomane / Récamiere': 15, 'Sessel': 10, 'Hocker / Pouf': 10, 'Stuhl': 5, 'Bürostuhl': 8, 'Barhocker': 5, 'Zierkissen (nicht waschmaschinengeeignet)': 4, 'Teppich bis 4 m²': 15, 'Teppich 4–9 m²': 25, 'Teppich ab 9 m²': 35, 'Teppichboden bis 15 m²': 25, 'Teppichboden 15–30 m²': 40, 'Teppichboden ab 30 m²': 55, 'Autositz (einzeln)': 10, 'Auto-Innenraum komplett': 29 },
            durations: { 'L-Couch': 15, 'U-Couch': 15, 'Sofa': 15, 'Ottomane / Récamiere': 15, 'Sessel': 10, 'Hocker / Pouf': 10, 'Stuhl': 5, 'Bürostuhl': 8, 'Barhocker': 5, 'Zierkissen (nicht waschmaschinengeeignet)': 5, 'Teppich bis 4 m²': 15, 'Teppich 4–9 m²': 20, 'Teppich ab 9 m²': 25, 'Teppichboden bis 15 m²': 25, 'Teppichboden 15–30 m²': 35, 'Teppichboden ab 30 m²': 45, 'Autositz (einzeln)': 10, 'Auto-Innenraum komplett': 29 }
        },

        // ── Teppich: Material und Florhöhe ───────────────────────────────────
        // `group` macht die Optionen gegenseitig ausschließend. Ohne Auswahl
        // gilt der Grundpreis (Kunstfaser, Kurzflor) — deshalb kostet die
        // Standardvariante nichts extra und taucht als Aufschlag nicht auf.
        {
            id: 'wool', group: 'material',
            name: 'Wolle oder Naturfaser',
            description: 'Schonendere Reinigung mit weniger Feuchtigkeit und längerer Trocknungszeit.',
            tip: 'Wolle, Baumwolle, Jute und Sisal vertragen weder viel Wasser noch aggressive Mittel. Wir arbeiten langsamer, mit angepasstem pH-Wert und geringerem Feuchtigkeitseintrag — das kostet mehr Zeit, verhindert aber Einlaufen, Ausbluten und Wellenbildung.',
            prices: { 'Teppich bis 4 m²': 15, 'Teppich 4–9 m²': 25, 'Teppich ab 9 m²': 35, 'Teppichboden bis 15 m²': 25, 'Teppichboden 15–30 m²': 40, 'Teppichboden ab 30 m²': 55 },
            durations: { 'Teppich bis 4 m²': 10, 'Teppich 4–9 m²': 15, 'Teppich ab 9 m²': 20, 'Teppichboden bis 15 m²': 15, 'Teppichboden 15–30 m²': 25, 'Teppichboden ab 30 m²': 35 }
        },
        {
            id: 'pile-mid', group: 'pile',
            name: 'Mittelflor (ca. 10–25 mm)',
            description: 'Mehr Faserlänge bedeutet mehr Durchgänge und längeres Absaugen.',
            tip: 'Ab etwa einem Zentimeter Florhöhe kommt die Düse nicht mehr in einem Zug bis zum Rücken durch. Wir arbeiten kreuzweise in mehreren Bahnen — dadurch dauert die Fläche länger als bei Kurzflor.',
            prices: { 'Teppich bis 4 m²': 12, 'Teppich 4–9 m²': 22, 'Teppich ab 9 m²': 30, 'Teppichboden bis 15 m²': 20, 'Teppichboden 15–30 m²': 35, 'Teppichboden ab 30 m²': 45 },
            durations: { 'Teppich bis 4 m²': 10, 'Teppich 4–9 m²': 15, 'Teppich ab 9 m²': 20, 'Teppichboden bis 15 m²': 15, 'Teppichboden 15–30 m²': 20, 'Teppichboden ab 30 m²': 30 }
        },
        {
            id: 'pile-high', group: 'pile',
            name: 'Hochflor / Langflor (ca. 25–40 mm)',
            description: 'Deutlich höherer Aufwand beim Reinigen und beim Trocknen.',
            tip: 'Langer Flor speichert viel Wasser und muss Strähne für Strähne bearbeitet werden. Planen Sie eine längere Trocknungszeit ein und lassen Sie den Teppich danach gut durchlüften. Über etwa 40 mm (Shaggy) reinigen wir nicht.',
            prices: { 'Teppich bis 4 m²': 25, 'Teppich 4–9 m²': 40, 'Teppich ab 9 m²': 55, 'Teppichboden bis 15 m²': 35, 'Teppichboden 15–30 m²': 55, 'Teppichboden ab 30 m²': 75 },
            durations: { 'Teppich bis 4 m²': 20, 'Teppich 4–9 m²': 30, 'Teppich ab 9 m²': 40, 'Teppichboden bis 15 m²': 25, 'Teppichboden 15–30 m²': 40, 'Teppichboden ab 30 m²': 55 }
        }
    ];

    // Beschriftung der sich ausschließenden Auswahlgruppen. `baseLabel` ist die
    // im Grundpreis enthaltene Variante — sie setzt keinen Aufschlag.
    const ADDON_GROUPS = {
        material: {
            label: 'Material',
            baseLabel: 'Kunstfaser / Synthetik',
            baseTip: 'Polypropylen, Polyester, Nylon und Mischgewebe. Der unempfindlichste Fall — im Grundpreis enthalten.'
        },
        pile: {
            label: 'Florhöhe',
            baseLabel: 'Kurzflor (bis ca. 10 mm)',
            baseTip: 'Flachgewebe, Kelim, Sisal-Optik und kurzflorige Auslegware. Im Grundpreis enthalten.',
            unavailable: {
                label: 'Shaggy / Langhaar über ca. 40 mm',
                reason: 'Shaggy-Teppiche reinigen wir nicht. Die langen Fasern verfilzen beim Absaugen mit unserer Technik und trocknen im Kern nicht zuverlässig durch — das Ergebnis würde weder Ihnen noch uns gefallen. Für diese Teppiche ist eine Teppichwäscherei mit Tauchbad die richtige Adresse.'
            }
        }
    };

    // ── Conditions ───────────────────────────────────────────────────────────
    // The pet surcharge stays on products that have no explicit pet extras
    // (mattresses). Upholstery, rugs and cars are charged only through the
    // extras the customer actually selected.
    const CONDITIONS = {
        'Haustiere': { icon: '🐾', title: 'Haustiere im Haushalt', desc: 'Wählen Sie die passenden Extras direkt beim Möbelstück. Bei Matratzen beträgt der Aufpreis 10%.', surcharge: 0 },
        'Kleinkinder': { icon: '👶', title: 'Kleinkinder im Haushalt', desc: 'Wir arbeiten ausschließlich mit Mitteln, die danach keine Rückstände hinterlassen.', badge: 'BIO', surcharge: 0 },
        'Allergiker': { icon: '🌿', title: 'Zusatzbehandlung für Allergiker', desc: 'Zusätzliche Behandlung zur Entfernung von Allergenen.', badge: '+10%', surcharge: 10 }
    };

    // ── Zones ────────────────────────────────────────────────────────────────
    const RESTRICTED_START_TIMES = ['11:00', '13:00'];
    const ZONE_RULES = {
        'B': { minOrder: 0, restrictHours: false },
        'W': { minOrder: 199, restrictHours: true },
        'NÖ': { minOrder: 199, restrictHours: true },
        'ST': { minOrder: 199, restrictHours: true },
        'OÖ': { minOrder: 299, restrictHours: true },
        'SB': { minOrder: 299, restrictHours: true },
        'K': { minOrder: 299, restrictHours: true },
        'T': { minOrder: 299, restrictHours: true },
        'V': { minOrder: 299, restrictHours: true }
    };
    // PLZ plausibility. A mistyped PLZ silently moves the booking into the wrong
    // geo-cluster in n8n and blocks that whole day in the calendar (real case:
    // "3701 Deutschkreuz" instead of 7301 resolved to cluster LINZ, so 24.09.
    // went red for every further booking). Warning only, never a hard block —
    // border PLZ are genuinely ambiguous: Jennersdorf is Burgenland but carries
    // 8380, Kittsee 2421, Braunau 5280 = OÖ, St. Valentin 4300 = NÖ. The table is
    // verified against every city in LOCATIONS by test-plz-validation.js — extend
    // it there first when a real address is rejected.
    const ZONE_PLZ_PREFIXES = {
        'B': ['7', '24', '83'],  // + Kittsee/Bruckneudorf (24xx), Bezirk Jennersdorf (838x)
        'W': ['1'],
        'NÖ': ['2', '3', '43'],  // + St. Valentin und Umgebung (43xx)
        'ST': ['8'],
        'OÖ': ['4', '52', '53'], // + Innviertel/Salzkammergut (Braunau 5280)
        'SB': ['5'],
        'K': ['9'],
        'T': ['6', '99'],        // + Osttirol (Lienz 99xx)
        'V': ['6']
    };

    const TRAVEL_FEE = 20;
    const BUSINESS_DISCOUNT_PERCENT = 10;

    // Locations decide the zone, and the zone decides the minimum order and the
    // bookable start times — so they belong to the pricing catalog, not to the UI.
    // `region` only groups the picker. Keys are the wire format (locationKey).
    const LOCATIONS = {
        'eisenstadt': { name: 'Eisenstadt', region: 'Burgenland', info: 'Landeshauptstadt Burgenland', zone: 'B', country: 'AT', travelTime: 55 },
        'oberwart': { name: 'Oberwart', region: 'Burgenland', info: 'Südburgenland', zone: 'B', country: 'AT', travelTime: 70 },
        'neusiedl-am-see': { name: 'Neusiedl am See', aliases: ['Neusiedl'], region: 'Burgenland', info: 'Seewinkel', zone: 'B', country: 'AT', travelTime: 60 },
        'mattersburg': { name: 'Mattersburg', region: 'Burgenland', info: 'Zentrales Burgenland', zone: 'B', country: 'AT', travelTime: 50 },
        'guessing': { name: 'Güssing', region: 'Burgenland', info: 'Südburgenland', zone: 'B', country: 'AT', travelTime: 90 },
        'jennersdorf': { name: 'Jennersdorf', region: 'Burgenland', info: 'Grenzregion', zone: 'B', country: 'AT', travelTime: 95 },
        'kittsee': { name: 'Kittsee', region: 'Burgenland', info: 'Grenzregion Slowakei', zone: 'B', country: 'AT', travelTime: 65 },
        'parndorf': { name: 'Parndorf', region: 'Burgenland', info: 'Designer Outlet Region', zone: 'B', country: 'AT', travelTime: 65 },
        'wien': { name: 'Wien', region: 'Wien', info: 'Bundeshauptstadt', zone: 'W', country: 'AT', travelTime: 75 },
        'wiener-neustadt': { name: 'Wiener Neustadt', region: 'Niederösterreich', info: 'Niederösterreich', zone: 'NÖ', country: 'AT', travelTime: 60 },
        'st-poelten': { name: 'St. Pölten', region: 'Niederösterreich', info: 'Landeshauptstadt NÖ', zone: 'NÖ', country: 'AT', travelTime: 90 },
        'baden': { name: 'Baden', aliases: ['Baden bei Wien'], region: 'Niederösterreich', info: 'Niederösterreich', zone: 'NÖ', country: 'AT', travelTime: 70 },
        'krems': { name: 'Krems', aliases: ['Krems an der Donau'], region: 'Niederösterreich', info: 'Niederösterreich', zone: 'NÖ', country: 'AT', travelTime: 110 },
        'moedling': { name: 'Mödling', region: 'Niederösterreich', info: 'Niederösterreich', zone: 'NÖ', country: 'AT', travelTime: 75 },
        'klosterneuburg': { name: 'Klosterneuburg', region: 'Niederösterreich', info: 'Niederösterreich', zone: 'NÖ', country: 'AT', travelTime: 80 },
        'amstetten': { name: 'Amstetten', region: 'Niederösterreich', info: 'Niederösterreich', zone: 'NÖ', country: 'AT', travelTime: 150 },
        'schwechat': { name: 'Schwechat', region: 'Niederösterreich', info: 'Niederösterreich', zone: 'NÖ', country: 'AT', travelTime: 70 },
        'tulln': { name: 'Tulln', aliases: ['Tulln an der Donau'], region: 'Niederösterreich', info: 'Niederösterreich', zone: 'NÖ', country: 'AT', travelTime: 95 },
        'stockerau': { name: 'Stockerau', region: 'Niederösterreich', info: 'Niederösterreich', zone: 'NÖ', country: 'AT', travelTime: 90 },
        'korneuburg': { name: 'Korneuburg', region: 'Niederösterreich', info: 'Niederösterreich', zone: 'NÖ', country: 'AT', travelTime: 85 },
        'neunkirchen': { name: 'Neunkirchen', region: 'Niederösterreich', info: 'Niederösterreich', zone: 'NÖ', country: 'AT', travelTime: 65 },
        'graz': { name: 'Graz', region: 'Steiermark', info: 'Landeshauptstadt Steiermark', zone: 'ST', country: 'AT', travelTime: 120 },
        'leoben': { name: 'Leoben', region: 'Steiermark', info: 'Steiermark', zone: 'ST', country: 'AT', travelTime: 145 },
        'kapfenberg': { name: 'Kapfenberg', region: 'Steiermark', info: 'Steiermark', zone: 'ST', country: 'AT', travelTime: 150 },
        'bruck-an-der-mur': { name: 'Bruck an der Mur', region: 'Steiermark', info: 'Steiermark', zone: 'ST', country: 'AT', travelTime: 140 },
        'leibnitz': { name: 'Leibnitz', region: 'Steiermark', info: 'Steiermark', zone: 'ST', country: 'AT', travelTime: 135 },
        'weiz': { name: 'Weiz', region: 'Steiermark', info: 'Steiermark', zone: 'ST', country: 'AT', travelTime: 130 },
        'feldbach': { name: 'Feldbach', region: 'Steiermark', info: 'Steiermark', zone: 'ST', country: 'AT', travelTime: 125 },
        'judenburg': { name: 'Judenburg', region: 'Steiermark', info: 'Steiermark', zone: 'ST', country: 'AT', travelTime: 155 },
        'linz': { name: 'Linz', region: 'Oberösterreich', info: 'Landeshauptstadt OÖ', zone: 'OÖ', country: 'AT', travelTime: 200 },
        'wels': { name: 'Wels', region: 'Oberösterreich', info: 'Oberösterreich', zone: 'OÖ', country: 'AT', travelTime: 210 },
        'steyr': { name: 'Steyr', region: 'Oberösterreich', info: 'Oberösterreich', zone: 'OÖ', country: 'AT', travelTime: 190 },
        'leonding': { name: 'Leonding', region: 'Oberösterreich', info: 'Oberösterreich', zone: 'OÖ', country: 'AT', travelTime: 200 },
        'traun': { name: 'Traun', region: 'Oberösterreich', info: 'Oberösterreich', zone: 'OÖ', country: 'AT', travelTime: 205 },
        'gmunden': { name: 'Gmunden', region: 'Oberösterreich', info: 'Oberösterreich', zone: 'OÖ', country: 'AT', travelTime: 195 },
        'braunau': { name: 'Braunau', aliases: ['Braunau am Inn'], region: 'Oberösterreich', info: 'Oberösterreich', zone: 'OÖ', country: 'AT', travelTime: 240 },
        'ried-im-innkreis': { name: 'Ried im Innkreis', region: 'Oberösterreich', info: 'Oberösterreich', zone: 'OÖ', country: 'AT', travelTime: 230 },
        'salzburg': { name: 'Salzburg', region: 'Salzburg', info: 'Landeshauptstadt Salzburg', zone: 'SB', country: 'AT', travelTime: 260 },
        'hallein': { name: 'Hallein', region: 'Salzburg', info: 'Salzburg', zone: 'SB', country: 'AT', travelTime: 265 },
        'wals-siezenheim': { name: 'Wals-Siezenheim', region: 'Salzburg', info: 'Salzburg', zone: 'SB', country: 'AT', travelTime: 255 },
        'saalfelden': { name: 'Saalfelden', aliases: ['Saalfelden am Steinernen Meer'], region: 'Salzburg', info: 'Salzburg', zone: 'SB', country: 'AT', travelTime: 290 },
        'klagenfurt': { name: 'Klagenfurt', aliases: ['Klagenfurt am Wörthersee'], region: 'Kärnten', info: 'Landeshauptstadt Kärnten', zone: 'K', country: 'AT', travelTime: 185 },
        'villach': { name: 'Villach', region: 'Kärnten', info: 'Kärnten', zone: 'K', country: 'AT', travelTime: 200 },
        'wolfsberg': { name: 'Wolfsberg', region: 'Kärnten', info: 'Kärnten', zone: 'K', country: 'AT', travelTime: 175 },
        'spittal-an-der-drau': { name: 'Spittal an der Drau', region: 'Kärnten', info: 'Kärnten', zone: 'K', country: 'AT', travelTime: 215 },
        'innsbruck': { name: 'Innsbruck', region: 'Tirol', info: 'Landeshauptstadt Tirol', zone: 'T', country: 'AT', travelTime: 310 },
        'kufstein': { name: 'Kufstein', region: 'Tirol', info: 'Tirol', zone: 'T', country: 'AT', travelTime: 280 },
        'hall-in-tirol': { name: 'Hall in Tirol', region: 'Tirol', info: 'Tirol', zone: 'T', country: 'AT', travelTime: 315 },
        'woergl': { name: 'Wörgl', region: 'Tirol', info: 'Tirol', zone: 'T', country: 'AT', travelTime: 290 },
        'schwaz': { name: 'Schwaz', region: 'Tirol', info: 'Tirol', zone: 'T', country: 'AT', travelTime: 320 },
        'telfs': { name: 'Telfs', region: 'Tirol', info: 'Tirol', zone: 'T', country: 'AT', travelTime: 310 },
        'bregenz': { name: 'Bregenz', region: 'Vorarlberg', info: 'Landeshauptstadt Vorarlberg', zone: 'V', country: 'AT', travelTime: 380 },
        'dornbirn': { name: 'Dornbirn', region: 'Vorarlberg', info: 'Vorarlberg', zone: 'V', country: 'AT', travelTime: 375 },
        'feldkirch': { name: 'Feldkirch', region: 'Vorarlberg', info: 'Vorarlberg', zone: 'V', country: 'AT', travelTime: 370 },
        'lustenau': { name: 'Lustenau', region: 'Vorarlberg', info: 'Vorarlberg', zone: 'V', country: 'AT', travelTime: 378 }
    };
    // Picker order. Home region first, then by distance — the same order the
    // minimum order value grows in.
    const REGION_ORDER = ['Burgenland', 'Wien', 'Niederösterreich', 'Steiermark',
        'Oberösterreich', 'Salzburg', 'Kärnten', 'Tirol', 'Vorarlberg'];

    const getZoneRule = zone => ZONE_RULES[zone] || { minOrder: 0, restrictHours: false };
    const isValidPlz = plz => /^\d{4}$/.test(String(plz || '').trim());
    // true when the PLZ is plausible for that zone, or when we cannot tell.
    const plzMatchesZone = (plz, zone) => {
        const prefixes = ZONE_PLZ_PREFIXES[zone];
        if (!prefixes) return true;
        return prefixes.some(prefix => String(plz || '').trim().startsWith(prefix));
    };
    const getProduct = name => PRODUCTS.find(product => product.name === name);
    const getAddon = id => ADDONS.find(addon => addon.id === id);
    const addonsFor = name => ADDONS.filter(addon => Object.hasOwn(addon.prices, name));
    const hasAddons = name => addonsFor(name).length > 0;

    // ── Selection → line items ───────────────────────────────────────────────
    // selection: { customerType, quantities{name:n}, couchAddons{name:[[addonId]]},
    //              conditions[], zone }
    //
    // The category chips only filter the visible list — they are deliberately NOT
    // a pricing input. Deselecting a category deletes its quantities in the UI, so
    // browser and booking service price the exact same basket and no hidden
    // position can drift between the two.
    function getSelectedServices(selection) {
        const services = [];
        PRODUCTS.forEach(product => {
            const quantity = Math.max(0, Math.trunc(Number(selection.quantities?.[product.name]) || 0));
            if (quantity <= 0) return;
            services.push({
                name: product.name, quantity, pricePerUnit: product.price,
                totalPrice: product.price * quantity, duration: product.duration * quantity,
                category: product.category
            });
            const units = selection.couchAddons?.[product.name] || [];
            units.slice(0, quantity).forEach((selected, unitIndex) => {
                const usedGroups = new Set();
                (selected || []).forEach(addonId => {
                    const addon = getAddon(addonId);
                    if (!addon || addon.prices[product.name] === undefined) return;
                    // The intensive treatment already contains the odor treatment.
                    if (addonId === 'odor' && selected.includes('intensive')) return;
                    // Options of one group exclude each other — a tampered payload
                    // must not bill two materials or two pile heights at once.
                    if (addon.group) {
                        if (usedGroups.has(addon.group)) return;
                        usedGroups.add(addon.group);
                    }
                    services.push({
                        name: `${product.name} ${unitIndex + 1}: ${addon.name}`,
                        quantity: 1,
                        pricePerUnit: addon.prices[product.name],
                        totalPrice: addon.prices[product.name],
                        duration: addon.durations[product.name],
                        category: product.category,
                        addonId, parentProduct: product.name, parentUnit: unitIndex + 1
                    });
                });
            });
        });
        return services;
    }

    // ── Price calculation ────────────────────────────────────────────────────
    // Order of operations (must match the n8n mirror exactly):
    //   subtotal → business discount → allergy % → mattress pet % → travel fee
    //   → top up to the regional minimum → round to whole euros
    function calculateBooking(selection) {
        const services = getSelectedServices(selection);
        const baseTotal = services.reduce((sum, item) => sum + (item.addonId ? 0 : item.totalPrice), 0);
        const addonTotal = services.reduce((sum, item) => sum + (item.addonId ? item.totalPrice : 0), 0);
        const subtotal = baseTotal + addonTotal;
        const conditions = selection.conditions || [];
        const discountFactor = selection.customerType === 'Geschäftskunde' ? 1 - BUSINESS_DISCOUNT_PERCENT / 100 : 1;
        const conditionPercent = Math.max(0, ...conditions.map(condition => CONDITIONS[condition]?.surcharge || 0));
        const otherFurnitureTotal = services
            .filter(item => !item.addonId && !hasAddons(item.name))
            .reduce((sum, item) => sum + item.totalPrice, 0);
        const petSurcharge = conditions.includes('Haustiere') && conditionPercent === 0
            ? otherFurnitureTotal * 0.1 * discountFactor : 0;
        const minimum = getZoneRule(selection.zone).minOrder;
        const subtotalAfterDiscount = subtotal * discountFactor;
        const conditionSurcharge = subtotalAfterDiscount * conditionPercent / 100;
        const beforeMinimum = subtotalAfterDiscount + conditionSurcharge + petSurcharge + TRAVEL_FEE;
        const minimumAdjustment = Math.max(0, (subtotal > 0 ? minimum : 0) - beforeMinimum);
        const finalTotal = Math.round(beforeMinimum + minimumAdjustment);
        const cents = value => Math.round((value + Number.EPSILON) * 100) / 100;
        const discountAmount = cents(subtotal - subtotalAfterDiscount);
        const roundingAdjustment = cents(finalTotal - (subtotal - discountAmount
            + cents(conditionSurcharge) + cents(petSurcharge) + TRAVEL_FEE + cents(minimumAdjustment)));
        return {
            services, baseTotal, addonTotal, subtotal, finalTotal, conditionPercent, petSurcharge,
            otherFurnitureTotal, discountPercent: discountFactor === 1 ? 0 : BUSINESS_DISCOUNT_PERCENT,
            discountAmount, subtotalAfterDiscount: cents(subtotalAfterDiscount),
            conditionSurcharge: cents(conditionSurcharge), travelFee: TRAVEL_FEE, minimum,
            minimumAdjustment: cents(minimumAdjustment), roundingAdjustment,
            totalDuration: services.reduce((sum, item) => sum + item.duration, 0),
            itemCount: services.filter(item => !item.addonId).reduce((sum, item) => sum + item.quantity, 0)
        };
    }

    return {
        CATEGORIES, PRODUCTS, ADDONS, ADDON_GROUPS, CONDITIONS, ZONE_RULES, RESTRICTED_START_TIMES,
        LOCATIONS, REGION_ORDER, TRAVEL_FEE, BUSINESS_DISCOUNT_PERCENT, ZONE_PLZ_PREFIXES,
        getZoneRule, isValidPlz, plzMatchesZone, getProduct, getAddon, addonsFor, hasAddons,
        getSelectedServices, calculateBooking
    };
}));
