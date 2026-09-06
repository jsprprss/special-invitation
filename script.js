(() => {
  const state = { selectedDate: null, selectedTime: null, selectedActivity: '', noClickCount: 0 };
  const noMessages = ["Sure ka? 🥺", "Pag-isipan mo ulit 😭", "Please? 🥹", "One more chance?", "Say yes? 💜", "wala na, nasira na yung NO button 😝😝"];
  const noScales = [1, .82, .66, .52, .41, .34, .28];
  const yesScales = [1, 1.08, 1.17, 1.28, 1.4, 1.5, 1.6];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let viewDate = new Date(today.getFullYear(), today.getMonth(), 1);
  let confettiReleaseTimer = null;
  let confettiStopTimer = null;
  let confettiClearTimer = null;

  const screens = document.querySelectorAll('.screen');
  const noButton = document.getElementById('no-button');
  const yesButton = document.getElementById('yes-button');
  const noMessage = document.getElementById('no-message');
  const dateContinue = document.getElementById('date-continue');
  const timeContinue = document.getElementById('time-continue');
  const activityInput = document.getElementById('activity-input');
  const activityContinue = document.getElementById('activity-continue');
  const calendarDays = document.getElementById('calendar-days');
  const monthLabel = document.getElementById('month-label');
  const questionCard = document.querySelector('#question-screen .question-card');

  function moveNoButton(stage) {
    if (!questionCard) return;

    const scale = noScales[stage];
    const cardRect = questionCard.getBoundingClientRect();
    const buttonWidth = noButton.offsetWidth * scale;
    const buttonHeight = noButton.offsetHeight * scale;
    const inset = Math.max(14, Math.min(26, cardRect.width * .045));
    const viewport = window.visualViewport;
    const viewportLeft = viewport ? viewport.offsetLeft : 0;
    const viewportTop = viewport ? viewport.offsetTop : 0;
    const viewportRight = viewportLeft + (viewport ? viewport.width : window.innerWidth);
    const viewportBottom = viewportTop + (viewport ? viewport.height : window.innerHeight);
    const safeLeft = Math.max(cardRect.left + inset, viewportLeft + inset);
    const safeTop = Math.max(cardRect.top + inset, viewportTop + inset);
    const safeRight = Math.min(cardRect.right - inset, viewportRight - inset);
    const safeBottom = Math.min(cardRect.bottom - inset, viewportBottom - inset);
    const availableWidth = Math.max(0, safeRight - safeLeft - buttonWidth);
    const availableHeight = Math.max(0, safeBottom - safeTop - buttonHeight);
    const currentRect = noButton.getBoundingClientRect();
    const currentCenter = {
      x: currentRect.left + currentRect.width / 2,
      y: currentRect.top + currentRect.height / 2,
    };
    const yesScale = yesScales[stage];
    const currentYesRect = yesButton.getBoundingClientRect();
    const yesCenterX = currentYesRect.left + currentYesRect.width / 2;
    const yesCenterY = currentYesRect.top + currentYesRect.height / 2;
    const futureYesWidth = yesButton.offsetWidth * yesScale;
    const futureYesHeight = yesButton.offsetHeight * yesScale;
    const futureYesRect = {
      left: yesCenterX - futureYesWidth / 2,
      right: yesCenterX + futureYesWidth / 2,
      top: yesCenterY - futureYesHeight / 2,
      bottom: yesCenterY + futureYesHeight / 2,
    };
    const textRects = (element) => {
      if (!element) return [];
      const range = document.createRange();
      range.selectNodeContents(element);
      const ranges = Array.from(range.getClientRects()).filter((rect) => (
        rect.width > 0 && rect.height > 0
      ));
      return ranges.length ? ranges : [element.getBoundingClientRect()];
    };
    const protectedRects = [
      futureYesRect,
      ...textRects(document.getElementById('question-title')),
      ...textRects(noMessage),
      ...textRects(questionCard.querySelector('.eyebrow')),
      questionCard.querySelector('.teddy-peek').getBoundingClientRect(),
    ];
    const fractions = [0, .16, .33, .5, .67, .84, 1];
    const candidates = [];

    fractions.forEach((row) => {
      fractions.forEach((column) => {
        const left = safeLeft + availableWidth * column;
        const top = safeTop + availableHeight * row;
        const candidate = {
          left,
          top,
          right: left + buttonWidth,
          bottom: top + buttonHeight,
          centerX: left + buttonWidth / 2,
          centerY: top + buttonHeight / 2,
        };
        const overlapsContent = protectedRects.some((rect) => (
          candidate.left < rect.right + 8 &&
          candidate.right > rect.left - 8 &&
          candidate.top < rect.bottom + 8 &&
          candidate.bottom > rect.top - 8
        ));
        const distance = Math.hypot(
          candidate.centerX - currentCenter.x,
          candidate.centerY - currentCenter.y
        );

        if (!overlapsContent && distance > 36) {
          candidates.push({ ...candidate, distance });
        }
      });
    });

    if (!candidates.length) {
      noButton.style.transform = `scale(${scale})`;
      return;
    }

    candidates.sort((a, b) => b.distance - a.distance);
    const pool = candidates.slice(0, Math.min(6, candidates.length));
    const target = pool[(state.noClickCount - 1) % pool.length];
    const transformValues = getComputedStyle(noButton).transform.match(/matrix(?:3d)?\(([^)]+)\)/);
    const matrixValues = transformValues
      ? transformValues[1].split(',').map(Number)
      : [];
    const currentMoveX = matrixValues.length === 16
      ? matrixValues[12]
      : (matrixValues[4] || 0);
    const currentMoveY = matrixValues.length === 16
      ? matrixValues[13]
      : (matrixValues[5] || 0);
    const moveX = Math.round(currentMoveX + target.centerX - currentCenter.x);
    const moveY = Math.round(currentMoveY + target.centerY - currentCenter.y);

    noButton.style.transform = `translate3d(${moveX}px, ${moveY}px, 0) scale(${scale})`;
  }

  function showScreen(id) {
    screens.forEach((screen) => {
      const active = screen.id === id;
      screen.hidden = !active;
      screen.classList.toggle('active', active);
    });
    const heading = document.querySelector(`#${id} h1`);
    if (heading) heading.focus?.();
  }

  function dateKey(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }

  function isSameDay(a, b) { return dateKey(a) === dateKey(b); }

  function renderCalendar() {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    monthLabel.textContent = viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    calendarDays.innerHTML = '';
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < firstDay; i += 1) {
      const blank = document.createElement('span');
      blank.className = 'calendar-blank';
      calendarDays.append(blank);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'calendar-day';
      button.textContent = day;
      button.dataset.date = dateKey(date);
      button.setAttribute('aria-label', date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }));
      if (date < today) button.disabled = true;
      if (isSameDay(date, today)) button.classList.add('today');
      if (state.selectedDate && isSameDay(date, state.selectedDate)) button.classList.add('selected');
      button.addEventListener('click', () => {
        state.selectedDate = date;
        dateContinue.disabled = false;
        renderCalendar();
      });
      calendarDays.append(button);
    }
    document.getElementById('previous-month').disabled = year === today.getFullYear() && month === today.getMonth();
  }

  function throwConfetti() {
    const holder = document.getElementById('confetti');
    const colors = ['#7654b8', '#b79adc', '#4b3277', '#d8c8ed'];
    let wave = 0;

    window.clearInterval(confettiReleaseTimer);
    window.clearTimeout(confettiStopTimer);
    window.clearTimeout(confettiClearTimer);
    holder.innerHTML = '';

    const releaseWave = () => {
      colors.forEach((color, index) => {
        const piece = document.createElement('i');
        const fromLeft = index % 2 === 0;
        const laneOffset = (wave * 7 + index * 4) % 10;
        piece.className = 'confetti-piece';
        piece.style.left = (fromLeft ? 1 + laneOffset : 97 - laneOffset) + '%';
        piece.style.top = (48 + ((index * 4) % 16)) + '%';
        piece.style.background = color;
        piece.style.setProperty('--drift', (fromLeft ? 42 + index * 11 : -42 - index * 11) + 'px');
        piece.style.setProperty('--rise', (-165 - (index % 3) * 20) + 'px');
        piece.style.setProperty('--drift-end', (fromLeft ? 57 + index * 13 : -57 - index * 13) + 'px');
        piece.style.setProperty('--rise-end', (-135 - (index % 3) * 16) + 'px');
        piece.style.setProperty('--spin', (fromLeft ? 250 + index * 35 : -250 - index * 35) + 'deg');
        piece.style.setProperty('--spin-end', (fromLeft ? 355 + index * 42 : -355 - index * 42) + 'deg');
        piece.style.animationDelay = (index * 45) + 'ms';
        holder.append(piece);
      });
      wave += 1;
    };

    releaseWave();
    confettiReleaseTimer = window.setInterval(releaseWave, 400);
    confettiStopTimer = window.setTimeout(() => window.clearInterval(confettiReleaseTimer), 12000);
    confettiClearTimer = window.setTimeout(() => { holder.innerHTML = ''; }, 15000);
  }

  noButton.addEventListener('click', () => {
    state.noClickCount += 1;
    const stage = Math.min(state.noClickCount, 6);
    noMessage.style.opacity = '0';
    noMessage.style.transform = 'translateY(3px)';
    window.setTimeout(() => {
      noMessage.textContent = noMessages[stage - 1];
      noMessage.style.opacity = '1';
      noMessage.style.transform = 'translateY(0)';
      moveNoButton(stage);
    }, 130);
    noButton.style.opacity = `${Math.max(.56, 1 - stage * .09)}`;
    yesButton.style.transform = `scale(${yesScales[stage]})`;
  });

  yesButton.addEventListener('click', () => {
    showScreen('celebration-screen');
    throwConfetti();
    window.setTimeout(() => showScreen('date-screen'), 15000);
  });

  document.getElementById('previous-month').addEventListener('click', () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    renderCalendar();
  });
  document.getElementById('next-month').addEventListener('click', () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    renderCalendar();
  });
  dateContinue.addEventListener('click', () => showScreen('time-screen'));

  document.querySelectorAll('.time-option').forEach((option) => {
    option.addEventListener('click', () => {
      document.querySelectorAll('.time-option').forEach((item) => item.classList.remove('selected'));
      option.classList.add('selected');
      state.selectedTime = option.textContent;
      timeContinue.disabled = false;
    });
  });

  timeContinue.addEventListener('click', () => showScreen('activity-screen'));

  activityInput.addEventListener('input', () => {
    state.selectedActivity = activityInput.value.trim();
    activityContinue.disabled = state.selectedActivity.length === 0;
  });
  activityContinue.addEventListener('click', () => {
    document.getElementById('confirmed-date').textContent = state.selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    document.getElementById('confirmed-time').textContent = state.selectedTime;
    showScreen('confirmation-screen');
  });

  renderCalendar();
})();

