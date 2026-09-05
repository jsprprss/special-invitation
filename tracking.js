(() => {
  'use strict';

  const WEB_APP_URL = 'PASTE_YOUR_APPS_SCRIPT_EXEC_URL_HERE';
  const STORAGE_KEY = 'invitation_tracking_session_v1';
  const TRACKING_VERSION = '1.0.0';
  const MAX_JOURNEY_EVENTS = 250;

  const NO_MESSAGES = [
    'Sure ka? 🥺',
    'Pag-isipan mo ulit 😭',
    'Please? 🥹',
    'One more chance?',
    'Say yes? 💜',
    'wala na, nasira na yung NO button 😝😝',
  ];

  if (
    !WEB_APP_URL.startsWith('https://script.google.com/') ||
    !WEB_APP_URL.endsWith('/exec')
  ) {
    console.warn(
      'Invitation tracking is disabled until the Apps Script /exec URL is added.'
    );
    return;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function createSessionId() {
    if (
      window.crypto &&
      typeof window.crypto.randomUUID === 'function'
    ) {
      return window.crypto.randomUUID();
    }

    const randomValues = new Uint32Array(4);

    if (
      window.crypto &&
      typeof window.crypto.getRandomValues === 'function'
    ) {
      window.crypto.getRandomValues(randomValues);
    } else {
      for (let index = 0; index < randomValues.length; index += 1) {
        randomValues[index] = Math.floor(
          Math.random() * 4294967295
        );
      }
    }

    return [
      'visit',
      Date.now().toString(36),
      ...Array.from(randomValues, (value) =>
        value.toString(36)
      ),
    ].join('-');
  }

  function loadStoredState() {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Could not restore tracking session.', error);
      return null;
    }
  }

  function saveState() {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(trackingState)
      );
    } catch (error) {
      console.warn('Could not save tracking session.', error);
    }
  }

  function createState() {
    const startedAt = nowIso();

    return {
      sessionId: createSessionId(),
      status: 'in_progress',
      invitationResponse: '',
      yesClicked: false,
      noClicked: false,
      noClickCount: 0,
      lastNoMessage: '',
      selectedDate: '',
      selectedTime: '',
      selectedActivity: '',
      finalPageViewed: false,
      finalPageResponse: '',
      sessionStartedAt: startedAt,
      finalPageViewedAt: '',
      sessionCompletedAt: '',
      lastUpdatedAt: startedAt,
      currentStep: 'question',
      lastDeliveryReason: 'session_started',
      updateSequence: 0,
      trackingVersion: TRACKING_VERSION,
      journeyEvents: [
        {
          type: 'session_started',
          value: null,
          at: startedAt,
        },
      ],
    };
  }

  let trackingState = loadStoredState();
  const isNewSession =
    !trackingState ||
    !trackingState.sessionId ||
    trackingState.status === 'completed';

  if (isNewSession) {
    trackingState = createState();
  } else {
    trackingState.currentStep = 'question';

    addJourneyEvent('page_refreshed', {
      previousResponsesRestored: true,
    });
  }

  function addJourneyEvent(type, value) {
    if (!Array.isArray(trackingState.journeyEvents)) {
      trackingState.journeyEvents = [];
    }

    trackingState.journeyEvents.push({
      type: type,
      value: value == null ? null : value,
      at: nowIso(),
    });

    if (
      trackingState.journeyEvents.length >
      MAX_JOURNEY_EVENTS
    ) {
      trackingState.journeyEvents =
        trackingState.journeyEvents.slice(-MAX_JOURNEY_EVENTS);
    }

    saveState();
  }

  function createPayload(deliveryReason) {
    trackingState.updateSequence =
      Number(trackingState.updateSequence || 0) + 1;

    trackingState.lastUpdatedAt = nowIso();
    trackingState.lastDeliveryReason = deliveryReason;

    saveState();

    return {
      sessionId: trackingState.sessionId,
      status: trackingState.status,
      invitationResponse: trackingState.invitationResponse,
      yesClicked: trackingState.yesClicked,
      noClicked: trackingState.noClicked,
      noClickCount: trackingState.noClickCount,
      lastNoMessage: trackingState.lastNoMessage,
      selectedDate: trackingState.selectedDate,
      selectedTime: trackingState.selectedTime,
      selectedActivity: trackingState.selectedActivity,
      finalPageViewed: trackingState.finalPageViewed,
      finalPageResponse: trackingState.finalPageResponse,
      sessionStartedAt: trackingState.sessionStartedAt,
      finalPageViewedAt: trackingState.finalPageViewedAt,
      sessionCompletedAt: trackingState.sessionCompletedAt,
      lastUpdatedAt: trackingState.lastUpdatedAt,
      currentStep: trackingState.currentStep,
      lastDeliveryReason: trackingState.lastDeliveryReason,
      updateSequence: trackingState.updateSequence,
      trackingVersion: trackingState.trackingVersion,
      journeyEvents: trackingState.journeyEvents,
    };
  }

  function postPayload(payload, keepalive) {
    return fetch(WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'follow',
      keepalive: Boolean(keepalive),
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
      },
      body: JSON.stringify(payload),
    });
  }

  let sendQueue = Promise.resolve();

  function sendSnapshot(deliveryReason) {
    const payload = createPayload(deliveryReason);

    sendQueue = sendQueue
      .catch(() => undefined)
      .then(() => postPayload(payload, false))
      .catch((error) => {
        console.warn(
          'Response update could not be sent. It will retry when online.',
          error
        );
      });

    return sendQueue;
  }

  function sendExitSnapshot(deliveryReason) {
    const payload = createPayload(deliveryReason);
    const body = JSON.stringify(payload);

    if (typeof navigator.sendBeacon === 'function') {
      const queued = navigator.sendBeacon(
        WEB_APP_URL,
        new Blob([body], {
          type: 'text/plain;charset=UTF-8',
        })
      );

      if (queued) {
        return;
      }
    }

    postPayload(payload, true).catch(() => undefined);
  }

  function setCurrentStep(step) {
    trackingState.currentStep = step;
    saveState();
  }

  const noButton = document.getElementById('no-button');

  if (noButton) {
    noButton.addEventListener('click', () => {
      trackingState.noClicked = true;
      trackingState.noClickCount += 1;

      if (!trackingState.yesClicked) {
        trackingState.invitationResponse = 'NO';
      }

      const stage = Math.min(
        trackingState.noClickCount,
        NO_MESSAGES.length
      );

      trackingState.lastNoMessage = NO_MESSAGES[stage - 1];
      setCurrentStep('question');

      addJourneyEvent('no_clicked', {
        clickNumber: trackingState.noClickCount,
        stage: stage,
        displayedMessage: trackingState.lastNoMessage,
      });

      sendSnapshot('no_clicked');
    });
  }

  const yesButton = document.getElementById('yes-button');

  if (yesButton) {
    yesButton.addEventListener('click', () => {
      trackingState.yesClicked = true;
      trackingState.invitationResponse = 'YES';
      setCurrentStep('celebration');

      addJourneyEvent('yes_clicked', {
        noClicksBeforeYes: trackingState.noClickCount,
      });

      sendSnapshot('yes_clicked');

      window.setTimeout(() => {
        if (trackingState.currentStep === 'celebration') {
          setCurrentStep('date');
          addJourneyEvent('date_page_viewed', null);
          sendSnapshot('date_page_viewed');
        }
      }, 15000);
    });
  }

  const previousMonth =
    document.getElementById('previous-month');

  if (previousMonth) {
    previousMonth.addEventListener('click', () => {
      addJourneyEvent('calendar_previous_month_clicked', null);
      sendSnapshot('calendar_navigation');
    });
  }

  const nextMonth = document.getElementById('next-month');

  if (nextMonth) {
    nextMonth.addEventListener('click', () => {
      addJourneyEvent('calendar_next_month_clicked', null);
      sendSnapshot('calendar_navigation');
    });
  }

  const calendarDays =
    document.getElementById('calendar-days');

  if (calendarDays) {
    calendarDays.addEventListener(
      'click',
      (event) => {
        const button = event.target.closest('.calendar-day');

        if (
          !button ||
          button.disabled ||
          !button.dataset.date
        ) {
          return;
        }

        trackingState.selectedDate = button.dataset.date;
        setCurrentStep('date');

        addJourneyEvent(
          'date_selected',
          trackingState.selectedDate
        );

        sendSnapshot('date_selected');
      },
      true
    );
  }

  const dateContinue =
    document.getElementById('date-continue');

  if (dateContinue) {
    dateContinue.addEventListener('click', () => {
      setCurrentStep('time');

      addJourneyEvent('date_continue_clicked', {
        selectedDate: trackingState.selectedDate,
      });

      sendSnapshot('date_continue_clicked');
    });
  }

  document
    .querySelectorAll('.time-option')
    .forEach((option) => {
      option.addEventListener('click', () => {
        trackingState.selectedTime =
          option.textContent.trim();

        setCurrentStep('time');

        addJourneyEvent(
          'time_selected',
          trackingState.selectedTime
        );

        sendSnapshot('time_selected');
      });
    });

  const timeContinue =
    document.getElementById('time-continue');

  if (timeContinue) {
    timeContinue.addEventListener('click', () => {
      setCurrentStep('activity');

      addJourneyEvent('time_continue_clicked', {
        selectedTime: trackingState.selectedTime,
      });

      sendSnapshot('time_continue_clicked');
    });
  }

  const activityInput =
    document.getElementById('activity-input');

  if (activityInput) {
    activityInput.addEventListener('input', () => {
      trackingState.selectedActivity =
        activityInput.value.trim();

      saveState();
    });
  }

  const activityContinue =
    document.getElementById('activity-continue');

  if (activityContinue) {
    activityContinue.addEventListener('click', () => {
      trackingState.selectedActivity =
        activityInput.value.trim();

      trackingState.finalPageViewed = true;
      trackingState.finalPageViewedAt = nowIso();
      setCurrentStep('confirmation');

      addJourneyEvent('activity_submitted', {
        selectedActivity:
          trackingState.selectedActivity,
      });

      addJourneyEvent('final_page_viewed', null);
      sendSnapshot('final_page_viewed');
    });
  }

  const finalButton =
    document.getElementById('final-button');

  if (finalButton) {
    finalButton.addEventListener('click', () => {
      trackingState.finalPageResponse =
        finalButton.textContent
          .replace(/\s+/g, ' ')
          .trim();

      trackingState.status = 'completed';
      trackingState.sessionCompletedAt = nowIso();
      setCurrentStep('completed');

      addJourneyEvent(
        'final_button_clicked',
        trackingState.finalPageResponse
      );

      sendSnapshot('session_completed');
    });
  }

  window.addEventListener('online', () => {
    sendSnapshot('network_restored');
  });

  let hiddenSnapshotSent = false;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenSnapshotSent = true;
      sendExitSnapshot('page_hidden');
    } else {
      hiddenSnapshotSent = false;
    }
  });

  window.addEventListener('pagehide', () => {
    if (!hiddenSnapshotSent) {
      sendExitSnapshot('page_exit');
    }
  });

  saveState();

  sendSnapshot(
    isNewSession ? 'session_started' : 'page_refreshed'
  );
})();
