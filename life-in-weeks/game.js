(function () {
    'use strict';

    var TOTAL_YEARS = 90;
    var WEEKS_PER_YEAR = 52;
    var TOTAL_WEEKS = TOTAL_YEARS * WEEKS_PER_YEAR;
    var MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

    var LIFE_STAGES = [
        { maxYear: 5, color: '#f8b4b4', label: null },
        { maxYear: 12, color: '#93c5fd', label: null },
        { maxYear: 18, color: '#86efac', label: null },
        { maxYear: 25, color: '#fde047', label: null },
        { maxYear: 40, color: '#fdba74', label: null },
        { maxYear: 60, color: '#f97316', label: null },
        { maxYear: 75, color: '#c084fc', label: null },
        { maxYear: 90, color: '#9ca3af', label: null }
    ];

    var MILESTONE_KEYS = {
        5: 'liwStartedSchool',
        13: 'liwTeenager',
        18: 'liwAdult',
        30: 'liwThirty',
        50: 'liwHalfCentury',
        65: 'liwRetirement'
    };

    function getMilestoneLabel(year) {
        var key = MILESTONE_KEYS[year];
        return key ? I18N.t(key) : null;
    }

    var WORLD_EVENTS = [
        { date: '1945-08-15', name: 'WWII Ends', i18nKey: 'liwEventWWII' },
        { date: '1953-04-25', name: 'DNA discovered', i18nKey: 'liwEventDNA' },
        { date: '1961-04-12', name: 'First human in space', i18nKey: 'liwEventSpace' },
        { date: '1963-08-28', name: 'MLK "I Have a Dream"', i18nKey: 'liwEventMLK' },
        { date: '1969-07-20', name: 'Moon landing', i18nKey: 'liwEventMoon' },
        { date: '1973-04-03', name: 'First mobile phone call', i18nKey: 'liwEventPhone' },
        { date: '1977-05-25', name: 'Star Wars released', i18nKey: 'liwEventStarWars' },
        { date: '1981-04-12', name: 'First Space Shuttle', i18nKey: 'liwEventShuttle' },
        { date: '1989-11-09', name: 'Fall of Berlin Wall', i18nKey: 'liwEventBerlinWall' },
        { date: '1990-12-25', name: 'World Wide Web invented', i18nKey: 'liwEventWWW' },
        { date: '1991-12-26', name: 'Soviet Union dissolves', i18nKey: 'liwEventUSSR' },
        { date: '1997-02-22', name: 'Dolly the sheep cloned', i18nKey: 'liwEventDolly' },
        { date: '1998-09-04', name: 'Google founded', i18nKey: 'liwEventGoogle' },
        { date: '2001-09-11', name: 'September 11', i18nKey: 'liwEvent911' },
        { date: '2004-02-04', name: 'Facebook launched', i18nKey: 'liwEventFacebook' },
        { date: '2007-06-29', name: 'First iPhone', i18nKey: 'liwEventIPhone' },
        { date: '2008-11-04', name: 'Obama elected', i18nKey: 'liwEventObama' },
        { date: '2010-10-06', name: 'Instagram launched', i18nKey: 'liwEventInstagram' },
        { date: '2011-05-02', name: 'Bin Laden killed', i18nKey: 'liwEventBinLaden' },
        { date: '2012-08-06', name: 'Curiosity lands on Mars', i18nKey: 'liwEventMars' },
        { date: '2015-12-12', name: 'Paris Climate Agreement', i18nKey: 'liwEventParis' },
        { date: '2016-03-15', name: 'AlphaGo beats human', i18nKey: 'liwEventAlphaGo' },
        { date: '2020-03-11', name: 'COVID-19 pandemic', i18nKey: 'liwEventCovid' },
        { date: '2022-07-12', name: 'James Webb first images', i18nKey: 'liwEventJWebb' },
        { date: '2024-01-01', name: 'ChatGPT era', i18nKey: 'liwEventChatGPT' }
    ];

    var MONTH_I18N_KEYS = [
        'liwJanuary', 'liwFebruary', 'liwMarch', 'liwApril', 'liwMay', 'liwJune',
        'liwJuly', 'liwAugust', 'liwSeptember', 'liwOctober', 'liwNovember', 'liwDecember'
    ];

    var grid = document.getElementById('grid');
    var ageLabels = document.getElementById('ageLabels');
    var tooltip = document.getElementById('tooltip');
    var statsEl = document.getElementById('stats');
    var inputSection = document.getElementById('inputSection');
    var monthSelect = document.getElementById('birthMonth');
    var daySelect = document.getElementById('birthDay');
    var yearSelect = document.getElementById('birthYear');
    var goBtn = document.getElementById('goBtn');

    var weekElements = [];
    var birthday = null;
    var eventsByWeek = {}; // weekIndex -> event object
    var lastWeeksLived = null;

    // Populate dropdowns
    function populateMonthOptions() {
        // Remove existing month options (keep the first disabled placeholder)
        while (monthSelect.options.length > 1) {
            monthSelect.removeChild(monthSelect.lastChild);
        }
        for (var i = 0; i < 12; i++) {
            var opt = document.createElement('option');
            opt.value = i;
            opt.textContent = I18N.t(MONTH_I18N_KEYS[i]);
            monthSelect.appendChild(opt);
        }
    }

    function populateSelects() {
        var i;
        populateMonthOptions();
        for (i = 1; i <= 31; i++) {
            var opt = document.createElement('option');
            opt.value = i;
            opt.textContent = i;
            daySelect.appendChild(opt);
        }
        var currentYear = new Date().getFullYear();
        for (i = currentYear; i >= 1920; i--) {
            var opt = document.createElement('option');
            opt.value = i;
            opt.textContent = i;
            yearSelect.appendChild(opt);
        }
    }

    function getStageColor(year) {
        for (var i = 0; i < LIFE_STAGES.length; i++) {
            if (year < LIFE_STAGES[i].maxYear) {
                return LIFE_STAGES[i].color;
            }
        }
        return LIFE_STAGES[LIFE_STAGES.length - 1].color;
    }

    var MONTH_ABBR_KEYS = [
        'liwJanAbbr', 'liwFebAbbr', 'liwMarAbbr', 'liwAprAbbr', 'liwMayAbbr', 'liwJunAbbr',
        'liwJulAbbr', 'liwAugAbbr', 'liwSepAbbr', 'liwOctAbbr', 'liwNovAbbr', 'liwDecAbbr'
    ];

    function formatDate(date) {
        return I18N.t(MONTH_ABBR_KEYS[date.getMonth()]) + ' ' + date.getDate() + ', ' + date.getFullYear();
    }

    function getWeekDateRange(birthdayDate, weekIndex) {
        var startMs = birthdayDate.getTime() + weekIndex * MS_PER_WEEK;
        var endMs = startMs + MS_PER_WEEK - 1;
        return {
            start: new Date(startMs),
            end: new Date(endMs)
        };
    }

    function updateAgeLabels() {
        var labels = ageLabels.children;
        for (var y = 0; y < TOTAL_YEARS; y++) {
            var label = labels[y];
            if (!label) continue;
            var showLabel = (y === 0 || y % 5 === 0 || MILESTONE_KEYS[y]);
            if (showLabel) {
                var text = '';
                var milestoneText = getMilestoneLabel(y);
                if (milestoneText) {
                    text = '<span class="milestone">' + milestoneText + '</span>';
                }
                text += y;
                label.innerHTML = text;
            }
        }
    }

    function buildGrid() {
        var fragment = document.createDocumentFragment();

        for (var year = 0; year < TOTAL_YEARS; year++) {
            for (var week = 0; week < WEEKS_PER_YEAR; week++) {
                var box = document.createElement('div');
                box.className = 'week';
                box.setAttribute('data-year', year);
                box.setAttribute('data-week', week);
                fragment.appendChild(box);
                weekElements.push(box);
            }
        }

        grid.appendChild(fragment);

        // Age labels
        var labelFragment = document.createDocumentFragment();
        for (var y = 0; y < TOTAL_YEARS; y++) {
            var label = document.createElement('div');
            label.className = 'age-label';
            label.style.height = '0';
            label.style.flex = '1';

            var showLabel = (y === 0 || y % 5 === 0 || MILESTONE_KEYS[y]);
            if (showLabel) {
                var text = '';
                var milestoneText = getMilestoneLabel(y);
                if (milestoneText) {
                    text = '<span class="milestone">' + milestoneText + '</span>';
                }
                text += y;
                label.innerHTML = text;
            }

            labelFragment.appendChild(label);
        }
        ageLabels.appendChild(labelFragment);
    }

    function calculateWeeksLived(birthdayDate) {
        var now = new Date();
        var diff = now.getTime() - birthdayDate.getTime();
        return Math.floor(diff / MS_PER_WEEK);
    }

    function parseEventDate(dateStr) {
        var parts = dateStr.split('-');
        return new Date(
            parseInt(parts[0], 10),
            parseInt(parts[1], 10) - 1,
            parseInt(parts[2], 10)
        );
    }

    function placeWorldEvents(birthdayDate) {
        // Clear previous event markers
        eventsByWeek = {};
        for (var i = 0; i < weekElements.length; i++) {
            weekElements[i].classList.remove('has-event');
        }

        var birthMs = birthdayDate.getTime();

        for (var e = 0; e < WORLD_EVENTS.length; e++) {
            var evt = WORLD_EVENTS[e];
            var evtDate = parseEventDate(evt.date);
            var diffMs = evtDate.getTime() - birthMs;

            if (diffMs < 0) continue; // before birth

            var weekIndex = Math.floor(diffMs / MS_PER_WEEK);
            if (weekIndex >= TOTAL_WEEKS) continue; // beyond 90 years

            eventsByWeek[weekIndex] = evt;
            weekElements[weekIndex].classList.add('has-event');
        }
    }

    function animateFill(weeksLived) {
        var ANIMATION_DURATION = 2000;
        var batchSize = Math.max(1, Math.ceil(weeksLived / 60));
        var delay = ANIMATION_DURATION / Math.ceil(weeksLived / batchSize);
        var index = 0;

        function revealBatch() {
            var end = Math.min(index + batchSize, weeksLived);
            for (var i = index; i < end; i++) {
                if (i < weekElements.length) {
                    var year = Math.floor(i / WEEKS_PER_YEAR);
                    weekElements[i].style.backgroundColor = getStageColor(year);
                    weekElements[i].classList.add('lived', 'revealed');
                }
            }
            index = end;
            if (index < weeksLived) {
                requestAnimationFrame(function () {
                    setTimeout(revealBatch, delay);
                });
            } else {
                // Mark current week
                if (weeksLived < TOTAL_WEEKS && weeksLived < weekElements.length) {
                    var currentYear = Math.floor(weeksLived / WEEKS_PER_YEAR);
                    weekElements[weeksLived].style.backgroundColor = getStageColor(currentYear);
                    weekElements[weeksLived].classList.add('current');
                }
                showStats(weeksLived);
            }
        }

        revealBatch();
    }

    function showStats(weeksLived) {
        lastWeeksLived = weeksLived;
        var weeksLeft = Math.max(0, TOTAL_WEEKS - weeksLived);
        var daysLived = weeksLived * 7;
        var summersLeft = Math.floor(weeksLeft / 52);

        statsEl.innerHTML =
            '<div class="stat-line">' + I18N.t('liwWeeksLived') + ' <strong>' + weeksLived.toLocaleString() + '</strong> ' + I18N.t('liwWeeks2') + '</div>' +
            '<div class="stat-line">' + I18N.t('liwThatsAbout') + ' <strong>' + daysLived.toLocaleString() + '</strong> ' + I18N.t('liwDays') + '</div>' +
            '<div class="stat-line">' + I18N.t('liwWeeksLeft') + ' <strong>' + weeksLeft.toLocaleString() + '</strong> ' + I18N.t('liwWeeksLeftSuffix') + '</div>' +
            '<div class="stat-line subtle">' + I18N.t('liwSummersLeft') + ' <strong>' + summersLeft + '</strong> ' + I18N.t('liwSummersLeftSuffix') + '</div>';

        statsEl.classList.add('visible');
    }

    function setupTooltip() {
        grid.addEventListener('mousemove', function (e) {
            var target = e.target;
            if (!target.classList.contains('week')) {
                tooltip.classList.remove('visible');
                return;
            }

            var year = parseInt(target.getAttribute('data-year'), 10);
            var week = parseInt(target.getAttribute('data-week'), 10);
            var weekIndex = year * WEEKS_PER_YEAR + week;

            var text = I18N.t('liwAge') + ' ' + year + ', ' + I18N.t('liwWeek') + ' ' + (week + 1);

            if (birthday) {
                var range = getWeekDateRange(birthday, weekIndex);
                text += ' \u2014 ' + formatDate(range.start) + ' to ' + formatDate(range.end);
            }

            // Append world event if present
            if (eventsByWeek[weekIndex]) {
                var evt = eventsByWeek[weekIndex];
                text += ' \u2014 \u2B50 ' + I18N.t(evt.i18nKey);
            }

            tooltip.textContent = text;
            tooltip.classList.add('visible');

            var x = e.clientX + 12;
            var y = e.clientY - 30;

            // Measure actual tooltip size and keep on screen
            var tw = tooltip.offsetWidth;
            var th = tooltip.offsetHeight;
            if (x + tw + 8 > window.innerWidth) {
                x = e.clientX - 12 - tw;
            }
            if (x < 4) x = 4;
            if (y < 4) {
                y = e.clientY + 16;
            }
            if (y + th > window.innerHeight) {
                y = window.innerHeight - th - 4;
            }

            tooltip.style.left = x + 'px';
            tooltip.style.top = y + 'px';
        });

        grid.addEventListener('mouseleave', function () {
            tooltip.classList.remove('visible');
        });
    }

    function resetGrid() {
        for (var i = 0; i < weekElements.length; i++) {
            weekElements[i].className = 'week';
            weekElements[i].style.backgroundColor = '';
        }
        eventsByWeek = {};
        statsEl.classList.remove('visible');
        statsEl.innerHTML = '';
    }

    function onGoClick() {
        var m = monthSelect.value;
        var d = daySelect.value;
        var y = yearSelect.value;

        if (m === '' || d === '' || y === '') return;

        var birthdayDate = new Date(
            parseInt(y, 10),
            parseInt(m, 10),
            parseInt(d, 10)
        );

        if (isNaN(birthdayDate.getTime())) return;

        var now = new Date();
        if (birthdayDate > now) return;

        birthday = birthdayDate;
        resetGrid();
        inputSection.classList.add('faded');

        var weeksLived = calculateWeeksLived(birthdayDate);
        weeksLived = Math.min(weeksLived, TOTAL_WEEKS);

        // Place world event markers
        placeWorldEvents(birthdayDate);

        // Small delay so reset is visible before animation
        setTimeout(function () {
            animateFill(weeksLived);
        }, 100);
    }

    // Language change handler
    window.addEventListener('langchange', function () {
        I18N.applyDOM();
        populateMonthOptions();
        updateAgeLabels();
        if (lastWeeksLived !== null && statsEl.classList.contains('visible')) {
            showStats(lastWeeksLived);
        }
    });

    document.addEventListener('arcade-restart', function () {
        birthday = null;
        lastWeeksLived = null;
        resetGrid();
        inputSection.classList.remove('faded');
    });

    // Init
    populateSelects();
    buildGrid();
    setupTooltip();
    goBtn.addEventListener('click', onGoClick);
    I18N.applyDOM();
})();
