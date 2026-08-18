// ═══════════════════════════════════════════════════════════════════════════════
// 🐴 ECO CLEAN - SMART BOOKING CALENDAR v3.1
// ═══════════════════════════════════════════════════════════════════════════════
// CENTAUR TRIAD Edition - "World's First Intelligent Booking Engine"
//
// Features:
// - Dynamic slot selection (09:00, 11:00, 13:00 base + dynamic)
// - Real-time slot availability based on duration
// - ±30 minute flexibility warnings
// - Zone-based geo-clustering integration
// - Beautiful modern UI
//
// v3.1 (2026-07-15):
//   - setAllowedStartTimes(): außerhalb Burgenland nur bestimmte Startzeiten (11:00 / 13:00)
// ═══════════════════════════════════════════════════════════════════════════════

const BookingCalendar = {
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    config: {
        availabilityEndpoint: 'https://hub.centaur-lang.dev/webhook/check-availability',
        monthsToShow: 2,
        language: 'de',
        minAdvanceDays: 1,
        baseSlots: ['09:00', '11:00', '13:00']
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    state: {
        currentMonth: new Date(),
        selectedDate: null,
        selectedSlot: null,
        selectedCity: null,
        availabilityData: null,
        isLoading: false,
        requiredDuration: 0,
        flexibilityAccepted: false,
        view: 'calendar', // 'calendar' or 'slots'
        allowedStartTimes: null // 🆕 v3.1: null = alle Zeiten; Array = nur diese Startzeiten
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // LOCALIZATION
    // ═══════════════════════════════════════════════════════════════════════════
    i18n: {
        de: {
            months: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
                'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
            weekdays: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
            selectCity: 'Bitte wählen Sie zuerst Ihren Standort',
            loading: 'Verfügbarkeit wird geladen...',
            free: 'Verfügbar',
            limited: 'Teilweise verfügbar',
            zoneBlocked: 'Andere Region',
            full: 'Ausgebucht',
            notEnoughTime: 'Nicht genug Zeit',
            weekend: 'Wochenende',
            past: 'Vergangen',
            selectSlot: 'Zeitfenster wählen',
            back: '← Zurück zum Kalender',
            requiredTime: 'Benötigte Zeit',
            availableTime: 'Verfügbare Zeit',
            firstSlot: 'Erster Termin',
            laterSlot: 'Späterer Termin',
            booked: 'Gebucht',
            slotFits: 'Passt! ✓',
            slotTooShort: 'Nicht genug Zeit',
            flexWarning: '⚠️ Dies ist NICHT der erste Termin des Tages',
            flexExplain: 'Die Ankunftszeit kann um ±30 Minuten variieren.',
            flexExpected: 'Erwartete Ankunft',
            flexAccept: 'Ich verstehe und akzeptiere die ±30 Min Flexibilität',
            flexRequired: 'Bitte bestätigen Sie die Flexibilität',
            minutes: 'Min',
            confirmSlot: 'Termin bestätigen',
            noAllowedTimes: 'Für Ihre Region bieten wir feste Anfahrtszeiten (11:00 / 13:00 Uhr) – an diesem Tag ist aktuell keine davon frei. Bitte wählen Sie einen anderen Tag.'
        },
        hu: {
            months: ['Január', 'Február', 'Március', 'Április', 'Május', 'Június',
                'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'],
            weekdays: ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'],
            selectCity: 'Kérjük először válassza ki a helyszínt',
            loading: 'Elérhetőség betöltése...',
            free: 'Szabad',
            limited: 'Részben szabad',
            zoneBlocked: 'Másik zóna',
            full: 'Betelt',
            notEnoughTime: 'Nincs elég idő',
            weekend: 'Hétvége',
            past: 'Elmúlt',
            selectSlot: 'Időpont választás',
            back: '← Vissza a naptárhoz',
            requiredTime: 'Szükséges idő',
            availableTime: 'Elérhető idő',
            firstSlot: 'Első időpont',
            laterSlot: 'Későbbi időpont',
            booked: 'Foglalt',
            slotFits: 'Belefér! ✓',
            slotTooShort: 'Nincs elég idő',
            flexWarning: '⚠️ Ez NEM az első időpont ezen a napon',
            flexExplain: 'Az érkezési idő ±30 perccel eltérhet.',
            flexExpected: 'Várható érkezés',
            flexAccept: 'Megértettem és elfogadom a ±30 perc rugalmasságot',
            flexRequired: 'Kérjük, erősítse meg a rugalmasságot',
            minutes: 'perc',
            confirmSlot: 'Időpont megerősítése',
            noAllowedTimes: 'Ebben a régióban csak kötött időpont (11:00 / 13:00) foglalható – ezen a napon egyik sem szabad. Kérjük, válasszon másik napot.'
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════════
    init(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('BookingCalendar: Container not found:', containerId);
            return;
        }

        Object.assign(this.config, options);
        this.lang = this.i18n[this.config.language] || this.i18n.de;

        this.render();
        console.log('🗓️ BookingCalendar v3.1 - Dynamic Slot System initialized');
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    setRequiredDuration(minutes) {
        this.state.requiredDuration = minutes;
        console.log(`⏱️ Required duration: ${minutes} min`);

        // Re-fetch availability with new duration
        if (this.state.selectedCity) {
            this.fetchAvailability();
        }
    },

    async setCity(city) {
        if (!city) return;

        // MINDIG frissítsük, még ha ugyanaz a város is
        // mert az availability változhatott (Geo-Cluster blokkolás)!
        this.state.selectedCity = city;
        this.state.selectedDate = null;
        this.state.selectedSlot = null;
        this.state.flexibilityAccepted = false;
        this.state.view = 'calendar';

        // MINDIG újrakérjük az availability-t!
        await this.fetchAvailability();
    },

    // 🆕 v3.1: erlaubte Startzeiten setzen (außerhalb Burgenland nur 11:00 / 13:00)
    //   times = Array (z. B. ['11:00','13:00']) → nur diese buchbar
    //   times = null/[]                          → keine Einschränkung (Burgenland)
    setAllowedStartTimes(times) {
        this.state.allowedStartTimes = (Array.isArray(times) && times.length) ? times.slice() : null;
        console.log('🕐 Allowed start times:', this.state.allowedStartTimes || 'alle');
        // Falls die aktuelle Auswahl nicht mehr erlaubt ist → zurücksetzen
        if (this.state.selectedSlot && !this.isAllowedStartTime(this.state.selectedSlot.startTime)) {
            this.state.selectedSlot = null;
            this.state.flexibilityAccepted = false;
        }
        this.render();
    },

    isAllowedStartTime(startTime) {
        if (!this.state.allowedStartTimes) return true;
        return this.state.allowedStartTimes.includes(startTime);
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // DATA FETCHING
    // ═══════════════════════════════════════════════════════════════════════════

    async fetchAvailability() {
        if (!this.state.selectedCity) return;

        this.state.isLoading = true;
        this.render();

        const startDate = new Date();
        startDate.setDate(startDate.getDate() + this.config.minAdvanceDays);

        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + this.config.monthsToShow);

        try {
            const response = await fetch(this.config.availabilityEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    city: this.state.selectedCity,
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0],
                    requiredDuration: this.state.requiredDuration
                })
            });

            if (!response.ok) throw new Error('Network error');

            const data = await response.json();
            this.state.availabilityData = data;
            console.log('📅 Availability v3 loaded:', data.summary);

        } catch (error) {
            console.error('❌ Failed to fetch availability:', error);
            this.state.availabilityData = null;
        }

        this.state.isLoading = false;
        this.render();
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    getDayStatus(dateStr) {
        if (!this.state.availabilityData?.days) return null;
        return this.state.availabilityData.days.find(d => d.date === dateStr);
    },

    // 🆕 v3.1: nur erlaubte, buchbare Slots eines Tages
    getBookableSlots(dayStatus) {
        if (!dayStatus?.slots) return [];
        return dayStatus.slots.filter(s => this.isAllowedStartTime(s.startTime));
    },

    formatDuration(minutes) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        if (h === 0) return `${m} ${this.lang.minutes}`;
        if (m === 0) return `${h}h`;
        return `${h}h ${m}${this.lang.minutes}`;
    },

    calculateExpectedArrival(slotTime) {
        const [hours, minutes] = slotTime.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes;
        const earliest = totalMinutes - 30;
        const latest = totalMinutes + 30;

        const format = (mins) => {
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        };

        return `${format(earliest)} - ${format(latest)}`;
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENT HANDLERS
    // ═══════════════════════════════════════════════════════════════════════════

    selectDate(dateStr) {
        const status = this.getDayStatus(dateStr);
        if (!status || status.status === 'unavailable' || status.status === 'zone_blocked' || status.status === 'full') {
            return;
        }

        this.state.selectedDate = dateStr;
        this.state.selectedSlot = null;
        this.state.flexibilityAccepted = false;
        this.state.view = 'slots';
        this.render();
    },

    selectSlot(slotIndex) {
        const dayStatus = this.getDayStatus(this.state.selectedDate);
        if (!dayStatus) return;

        const slot = dayStatus.slots.find(s => s.startMinutes === slotIndex);
        if (!slot || slot.status === 'booked' || !slot.fitsRequested) return;

        // 🆕 v3.1: nicht erlaubte Startzeiten (außerhalb Burgenland) blockieren
        if (!this.isAllowedStartTime(slot.startTime)) return;

        this.state.selectedSlot = slot;
        this.state.flexibilityAccepted = slot.isFirstSlot;
        this.render();

        // Dispatch event if first slot (no confirmation needed)
        if (slot.isFirstSlot) {
            this.dispatchSelectionEvent();
        }
    },

    toggleFlexibility() {
        this.state.flexibilityAccepted = !this.state.flexibilityAccepted;
        this.render();
    },

    confirmSlot() {
        if (!this.state.selectedSlot) return;
        if (!this.state.selectedSlot.isFirstSlot && !this.state.flexibilityAccepted) {
            alert(this.lang.flexRequired);
            return;
        }

        // 🆕 DISPATCH EVENT
        this.dispatchSelectionEvent();

        // 🆕 ZÁRJUK BE A SLOT VÁLASZTÓT - Vissza a naptárhoz CONFIRMED státusszal
        this.state.view = 'confirmed';
        this.renderConfirmed();
    },

    // 🆕 CONFIRMED NÉZET
    renderConfirmed() {
        if (!this.container) return;

        const slot = this.state.selectedSlot;
        const formattedDate = new Date(this.state.selectedDate).toLocaleDateString(
            this.config.language === 'de' ? 'de-AT' : 'hu-HU',
            { weekday: 'long', day: 'numeric', month: 'long' }
        );

        this.container.innerHTML = `
            <div class="booking-calendar confirmed">
                <div class="confirmed-content">
                    <div class="confirmed-icon">✅</div>
                    <h3 class="confirmed-title">Termin ausgewählt</h3>
                    <p class="confirmed-date">${formattedDate}</p>
                    <p class="confirmed-time">${slot.startTime} Uhr ${!slot.isFirstSlot ? '(±30 Min)' : ''}</p>
                    <button class="change-btn" onclick="BookingCalendar.backToCalendar()">
                        Ändern
                    </button>
                </div>
            </div>
        `;
    },

    backToCalendar() {
        this.state.view = 'calendar';
        this.state.selectedSlot = null;
        this.state.flexibilityAccepted = false;
        this.render();
    },

    previousMonth() {
        this.state.currentMonth.setMonth(this.state.currentMonth.getMonth() - 1);
        this.render();
    },

    nextMonth() {
        this.state.currentMonth.setMonth(this.state.currentMonth.getMonth() + 1);
        this.render();
    },

    dispatchSelectionEvent() {
        const event = new CustomEvent('dateSelected', {
            detail: {
                date: this.state.selectedDate,
                slot: this.state.selectedSlot,
                isFirstSlot: this.state.selectedSlot?.isFirstSlot || false,
                flexibilityAccepted: this.state.flexibilityAccepted,
                requiredDuration: this.state.requiredDuration
            }
        });
        this.container.dispatchEvent(event);
        console.log('📅 Slot confirmed:', this.state.selectedDate, this.state.selectedSlot?.startTime);
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER - MAIN
    // ═══════════════════════════════════════════════════════════════════════════

    render() {
        if (!this.container) return;

        if (!this.state.selectedCity) {
            this.container.innerHTML = this.renderPlaceholder();
            return;
        }

        if (this.state.isLoading) {
            this.container.innerHTML = this.renderLoading();
            return;
        }

        if (this.state.view === 'slots' && this.state.selectedDate) {
            this.container.innerHTML = this.renderSlotSelector();
        } else {
            this.container.innerHTML = this.renderCalendar();
        }
    },

    renderPlaceholder() {
        return `
            <div class="booking-calendar-placeholder">
                <div class="calendar-placeholder-icon">📅</div>
                <p>${this.lang.selectCity}</p>
            </div>
        `;
    },

    renderLoading() {
        return `
            <div class="booking-calendar-loading">
                <div class="calendar-spinner"></div>
                <p>${this.lang.loading}</p>
            </div>
        `;
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER - CALENDAR VIEW
    // ═══════════════════════════════════════════════════════════════════════════

    renderCalendar() {
        const year = this.state.currentMonth.getFullYear();
        const month = this.state.currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startingDay = (firstDay.getDay() + 6) % 7;

        // Duration info
        const durationInfo = this.state.requiredDuration > 0 ? `
            <div class="calendar-duration-info">
                <span class="duration-icon">⏱️</span>
                <span>${this.lang.requiredTime}: <strong>${this.formatDuration(this.state.requiredDuration)}</strong></span>
            </div>
        ` : '';

        let html = `
            <div class="booking-calendar">
                ${durationInfo}
                <div class="calendar-header">
                    <button class="calendar-nav-btn" onclick="BookingCalendar.previousMonth()">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" fill="none"/>
                        </svg>
                    </button>
                    <span class="calendar-month-title">${this.lang.months[month]} ${year}</span>
                    <button class="calendar-nav-btn" onclick="BookingCalendar.nextMonth()">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" fill="none"/>
                        </svg>
                    </button>
                </div>

                <div class="calendar-weekdays">
                    ${this.lang.weekdays.map(d => `<div class="calendar-weekday">${d}</div>`).join('')}
                </div>

                <div class="calendar-days">
        `;

        // Empty cells
        for (let i = 0; i < startingDay; i++) {
            html += `<div class="calendar-day empty"></div>`;
        }

        // Days
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const status = this.getDayStatus(dateStr);
            const isSelected = this.state.selectedDate === dateStr;

            let statusClass = 'unknown';
            let tooltip = '';
            let clickable = false;
            let slotsIndicator = '';

            if (status) {
                statusClass = status.status;
                tooltip = status.message || '';

                if (status.status === 'free' || status.status === 'limited') {
                    // 🆕 v3.1: nur erlaubte (11:00/13:00) UND passende Slots zählen
                    const fitting = (status.fittingSlots || []).filter(s => {
                        const st = (typeof s === 'string') ? s : (s.startTime || s);
                        return this.isAllowedStartTime(st);
                    });
                    const fittingCount = fitting.length;
                    const hasAllowedSlots = !this.state.allowedStartTimes
                        || this.getBookableSlots(status).some(s => !s.status || s.status !== 'booked');

                    if ((fittingCount > 0 || this.state.requiredDuration === 0) && hasAllowedSlots) {
                        clickable = true;
                        if (status.status === 'limited') {
                            slotsIndicator = `<span class="day-slots-count">${fittingCount}</span>`;
                        }
                    } else {
                        statusClass = 'not_enough_time';
                    }
                }
            }

            html += `
                <div class="calendar-day ${statusClass} ${isSelected ? 'selected' : ''} ${clickable ? 'clickable' : ''}"
                     ${clickable ? `onclick="BookingCalendar.selectDate('${dateStr}')"` : ''}
                     title="${tooltip}">
                    <span class="day-number">${day}</span>
                    ${slotsIndicator}
                </div>
            `;
        }

        html += `
                </div>

                <div class="calendar-legend">
                    <div class="legend-item"><span class="legend-dot free"></span><span>${this.lang.free}</span></div>
                    <div class="legend-item"><span class="legend-dot limited"></span><span>${this.lang.limited}</span></div>
                    <div class="legend-item"><span class="legend-dot zone_blocked"></span><span>${this.lang.zoneBlocked}</span></div>
                    <div class="legend-item"><span class="legend-dot not_enough_time"></span><span>${this.lang.notEnoughTime}</span></div>
                </div>
            </div>
        `;

        return html;
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER - SLOT SELECTOR VIEW
    // ═══════════════════════════════════════════════════════════════════════════

    renderSlotSelector() {
        const dayStatus = this.getDayStatus(this.state.selectedDate);
        if (!dayStatus) return this.renderCalendar();

        const formattedDate = new Date(this.state.selectedDate).toLocaleDateString(
            this.config.language === 'de' ? 'de-AT' : 'hu-HU',
            { weekday: 'long', day: 'numeric', month: 'long' }
        );

        let html = `
            <div class="booking-calendar slot-view">
                <div class="slot-header">
                    <button class="back-btn" onclick="BookingCalendar.backToCalendar()">
                        ${this.lang.back}
                    </button>
                    <h3 class="slot-date">${formattedDate}</h3>
                    ${this.state.requiredDuration > 0 ? `
                        <div class="slot-duration-badge">
                            ⏱️ ${this.formatDuration(this.state.requiredDuration)}
                        </div>
                    ` : ''}
                </div>

                <h4 class="slot-section-title">${this.lang.selectSlot}</h4>

                <div class="slots-list">
        `;

        // 🆕 v3.1: nur erlaubte Startzeiten anzeigen (außerhalb Burgenland 11:00 / 13:00)
        const visibleSlots = this.getBookableSlots(dayStatus);

        if (visibleSlots.length === 0) {
            html += `<div class="slot-empty-note">${this.lang.noAllowedTimes}</div>`;
        }

        // Render each (allowed) slot
        visibleSlots.forEach(slot => {
            const isSelected = this.state.selectedSlot?.startMinutes === slot.startMinutes;
            const isBooked = slot.status === 'booked';
            const fits = slot.fitsRequested;
            const isClickable = !isBooked && fits;

            let slotClass = 'slot-item';
            if (isBooked) slotClass += ' booked';
            else if (!fits) slotClass += ' too-short';
            else if (isSelected) slotClass += ' selected';
            else slotClass += ' available';

            let statusBadge = '';
            if (isBooked) {
                statusBadge = `<span class="slot-badge booked">${this.lang.booked}</span>`;
            } else if (!fits) {
                statusBadge = `<span class="slot-badge too-short">${this.lang.slotTooShort}</span>`;
            } else if (slot.isFirstSlot) {
                statusBadge = `<span class="slot-badge first">✅ ${this.lang.firstSlot}</span>`;
            } else {
                statusBadge = `<span class="slot-badge later">⏰ ±30 Min</span>`;
            }

            html += `
                <div class="${slotClass}" ${isClickable ? `onclick="BookingCalendar.selectSlot(${slot.startMinutes})"` : ''}>
                    <div class="slot-time">
                        <span class="slot-start">${slot.startTime}</span>
                        ${slot.endTime ? `<span class="slot-end">- ${slot.endTime}</span>` : ''}
                    </div>
                    <div class="slot-info">
                        ${statusBadge}
                        ${!isBooked ? `
                            <span class="slot-duration">
                                ${this.lang.availableTime}: ${this.formatDuration(slot.maxDuration)}
                                ${fits ? `<span class="fits-badge">${this.lang.slotFits}</span>` : ''}
                            </span>
                        ` : ''}
                    </div>
                    ${isClickable ? '<div class="slot-arrow">→</div>' : ''}
                </div>
            `;
        });

        html += `</div>`;

        // Selected slot details + flexibility warning
        if (this.state.selectedSlot) {
            const slot = this.state.selectedSlot;

            html += `
                <div class="selected-slot-details ${!slot.isFirstSlot ? 'needs-flex' : ''}">
                    <h4>✅ ${slot.startTime} ${this.lang.selectSlot}</h4>
            `;

            if (!slot.isFirstSlot) {
                html += `
                    <div class="flexibility-warning">
                        <div class="flex-header">${this.lang.flexWarning}</div>
                        <p>${this.lang.flexExplain}</p>
                        <p><strong>${this.lang.flexExpected}:</strong> ${this.calculateExpectedArrival(slot.startTime)}</p>

                        <label class="flex-checkbox-label">
                            <input type="checkbox"
                                   ${this.state.flexibilityAccepted ? 'checked' : ''}
                                   onchange="BookingCalendar.toggleFlexibility()">
                            <span class="checkbox-custom"></span>
                            <span>${this.lang.flexAccept}</span>
                        </label>

                        ${!this.state.flexibilityAccepted ? `
                            <div class="flex-required">${this.lang.flexRequired}</div>
                        ` : ''}
                    </div>
                `;
            }

            html += `
                    <button class="confirm-btn ${slot.isFirstSlot || this.state.flexibilityAccepted ? 'active' : 'disabled'}"
                            onclick="BookingCalendar.confirmSlot()">
                        ${this.lang.confirmSlot} - ${slot.startTime}
                    </button>
                </div>
            `;
        }

        html += `</div>`;
        return html;
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC GETTERS
    // ═══════════════════════════════════════════════════════════════════════════

    getSelectedDate() {
        return this.state.selectedDate;
    },

    getSelectedSlot() {
        return this.state.selectedSlot;
    },

    getSelectedDateDetails() {
        if (!this.state.selectedDate || !this.state.selectedSlot) return null;
        return {
            date: this.state.selectedDate,
            slot: this.state.selectedSlot,
            startTime: this.state.selectedSlot.startTime,
            maxDuration: this.state.selectedSlot.maxDuration,
            isFirstSlot: this.state.selectedSlot.isFirstSlot,
            flexibilityAccepted: this.state.flexibilityAccepted,
            city: this.state.selectedCity,
            requiredDuration: this.state.requiredDuration
        };
    },

    isValid() {
        if (!this.state.selectedDate || !this.state.selectedSlot) return false;
        // 🆕 v3.1: nicht erlaubte Startzeit → ungültig
        if (!this.isAllowedStartTime(this.state.selectedSlot.startTime)) return false;
        if (this.state.selectedSlot.isFirstSlot) return true;
        return this.state.flexibilityAccepted;
    },

    getValidationMessage() {
        if (!this.state.selectedDate) {
            return this.config.language === 'de' ? 'Bitte wählen Sie ein Datum' : 'Kérjük válasszon dátumot';
        }
        if (!this.state.selectedSlot) {
            return this.config.language === 'de' ? 'Bitte wählen Sie ein Zeitfenster' : 'Kérjük válasszon időpontot';
        }
        if (this.state.selectedSlot && !this.isAllowedStartTime(this.state.selectedSlot.startTime)) {
            return this.lang.noAllowedTimes;
        }
        if (!this.state.selectedSlot.isFirstSlot && !this.state.flexibilityAccepted) {
            return this.lang.flexRequired;
        }
        return null;
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-INITIALIZE
// ═══════════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('bookingCalendar');
    if (container) {
        const lang = container.dataset.language || 'de';
        BookingCalendar.init('bookingCalendar', { language: lang });
    }
});