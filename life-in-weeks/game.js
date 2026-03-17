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

    var MILESTONES = {
        5: 'Started school',
        13: 'Teenager',
        18: 'Adult',
        30: 'Thirty',
        50: 'Half century',
        65: 'Retirement age'
    };

    var grid = document.getElementById('grid');
    var ageLabels = document.getElementById('ageLabels');
    var tooltip = document.getElementById('tooltip');
    var statsEl = document.getElementById('stats');
    var inputSection = document.getElementById('inputSection');
    var birthdayInput = document.getElementById('birthday');

    var weekElements = [];
    var birthday = null;

    function getStageColor(year) {
        for (var i = 0; i < LIFE_STAGES.length; i++) {
            if (year < LIFE_STAGES[i].maxYear) {
                return LIFE_STAGES[i].color;
            }
        }
        return LIFE_STAGES[LIFE_STAGES.length - 1].color;
    }

    function formatDate(date) {
        var months = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        return months[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear();
    }

    function getWeekDateRange(birthdayDate, weekIndex) {
        var startMs = birthdayDate.getTime() + weekIndex * MS_PER_WEEK;
        var endMs = startMs + MS_PER_WEEK - 1;
        return {
            start: new Date(startMs),
            end: new Date(endMs)
        };
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
        // Compute row height: we need to match the grid rows
        for (var y = 0; y < TOTAL_YEARS; y++) {
            var label = document.createElement('div');
            label.className = 'age-label';

            // Calculate height to match grid row
            // The grid gap + cell will determine this, we use the same sizing
            label.style.height = '0';
            label.style.flex = '1';

            var showLabel = (y === 0 || y % 5 === 0 || MILESTONES[y]);
            if (showLabel) {
                var text = '';
                if (MILESTONES[y]) {
                    text = '<span class="milestone">' + MILESTONES[y] + '</span>';
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

    function animateFill(weeksLived) {
        var ANIMATION_DURATION = 2000; // ms
        var batchSize = Math.max(1, Math.ceil(weeksLived / 60)); // ~60 frames
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
        var weeksLeft = Math.max(0, TOTAL_WEEKS - weeksLived);
        var daysLived = weeksLived * 7;
        var summersLeft = Math.floor(weeksLeft / 52);

        statsEl.innerHTML =
            '<div class="stat-line">You\'ve lived <strong>' + weeksLived.toLocaleString() + ' weeks</strong></div>' +
            '<div class="stat-line">That\'s <strong>' + daysLived.toLocaleString() + ' days</strong></div>' +
            '<div class="stat-line">You have approximately <strong>' + weeksLeft.toLocaleString() + ' weeks</strong> left</div>' +
            '<div class="stat-line subtle">That\'s about <strong>' + summersLeft + ' summers</strong> left</div>';

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

            var text = 'Age ' + year + ', Week ' + (week + 1);

            if (birthday) {
                var range = getWeekDateRange(birthday, weekIndex);
                text += ' \u2014 ' + formatDate(range.start) + ' to ' + formatDate(range.end);
            }

            tooltip.textContent = text;
            tooltip.classList.add('visible');

            var x = e.clientX + 12;
            var y = e.clientY - 30;

            // Keep tooltip on screen
            var rect = tooltip.getBoundingClientRect();
            if (x + 200 > window.innerWidth) {
                x = e.clientX - 12 - 200;
            }
            if (y < 4) {
                y = e.clientY + 16;
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
        statsEl.classList.remove('visible');
        statsEl.innerHTML = '';
    }

    function onBirthdayChange() {
        var value = birthdayInput.value;
        if (!value) return;

        // Parse as local date (not UTC)
        var parts = value.split('-');
        var birthdayDate = new Date(
            parseInt(parts[0], 10),
            parseInt(parts[1], 10) - 1,
            parseInt(parts[2], 10)
        );

        if (isNaN(birthdayDate.getTime())) return;

        var now = new Date();
        if (birthdayDate > now) return;

        birthday = birthdayDate;
        resetGrid();
        inputSection.classList.add('faded');

        var weeksLived = calculateWeeksLived(birthdayDate);
        weeksLived = Math.min(weeksLived, TOTAL_WEEKS);

        // Small delay so reset is visible before animation
        setTimeout(function () {
            animateFill(weeksLived);
        }, 100);
    }

    // Init
    buildGrid();
    setupTooltip();
    birthdayInput.addEventListener('change', onBirthdayChange);
})();
