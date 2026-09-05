(() => {
  const state = { selectedDate: null, selectedTime: null, noClickCount: 0 };
  const noMessages = ["Sure ka? 🥺", "Pag-isipan mo ulit 😭", "Please? 🥹", "One more chance?", "Say yes? 💜"];
  const noScales = [1, .82, .66, .52, .41, .34];
  const yesScales = [1, 1.08, 1.17, 1.28, 1.4, 1.5];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let viewDate = new Date(today.getFullYear(), today.getMonth(), 1);

  const screens = document.querySelectorAll('.screen');
  const noButton = document.getElementById('no-button');
  const yesButton = document.getElementById('yes-button');
  const noMessage = document.getElementById('no-message');
  const dateContinue = document.getElementById('date-continue');
  const timeContinue = document.getElementById('time-continue');
  const calendarDays = document.getElementById('calendar-days');
  const monthLabel = document.getElementById('month-label');

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
    holder.innerHTML = '';
    ['#7654b8', '#b79adc', '#4b3277', '#d8c8ed'].forEach((color, index) => {
      for (let i = 0; i < 8; i += 1) {
        const piece = document.createElement('i');
        piece.className = 'confetti-piece';
        const lanes = [4, 9, 14, 86, 91, 96];
        piece.style.left = `${lanes[(i + index) % lanes.length]}%`;
        piece.style.top = `${8 + ((i * 11 + index * 7) % 78)}%`;
        piece.style.background = color;
        piece.style.setProperty('--x', `${(i - 3) * 16}px`);
        piece.style.animationDelay = `${(i % 4) * 45}ms`;
        holder.append(piece);
      }
    });
  }

  noButton.addEventListener('click', () => {
    state.noClickCount += 1;
    const stage = Math.min(state.noClickCount, 5);
    noMessage.style.opacity = '0';
    noMessage.style.transform = 'translateY(3px)';
    window.setTimeout(() => {
      noMessage.textContent = noMessages[stage - 1];
      noMessage.style.opacity = '1';
      noMessage.style.transform = 'translateY(0)';
    }, 130);
    noButton.style.transform = `scale(${noScales[stage]})`;
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

  timeContinue.addEventListener('click', () => {
    document.getElementById('confirmed-date').textContent = state.selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    document.getElementById('confirmed-time').textContent = state.selectedTime;
    showScreen('confirmation-screen');
  });
  document.getElementById('final-button').addEventListener('click', () => {
    document.getElementById('final-button').textContent = 'excited na ako makita ka ulit. 😀';
  });

  renderCalendar();
})();

