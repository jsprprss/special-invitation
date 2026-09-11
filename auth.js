(() => {
  'use strict';

  const WORKER_URL =
    'https://special-invitation-auth.jasper-presas-va.workers.dev';
  const TOKEN_KEY = 'invitation_auth_token_v1';
  const STAGE_KEY = 'invitation_auth_stage_v1';
  const TRACKING_EVENT = 'invitation:journey-event';

  const pageShell = document.querySelector('.page-shell');
  const screens = document.querySelectorAll('.screen');
  const finalButton = document.getElementById('final-button');
  const loginScreen = document.getElementById('login-screen');
  const loginCard = loginScreen && loginScreen.querySelector('.login-card');
  const loginCover = document.getElementById('login-cover');
  const loginForm = document.getElementById('login-form');
  const usernameInput = document.getElementById('login-username');
  const passwordInput = document.getElementById('login-password');
  const loginSubmit = document.getElementById('login-submit');
  const loginStatus = document.getElementById('login-status');
  const messageLoading = document.getElementById('message-loading');
  const messageBody = document.getElementById('personal-message');

  if (
    !pageShell ||
    !finalButton ||
    !loginScreen ||
    !loginCard ||
    !loginCover ||
    !loginForm ||
    !usernameInput ||
    !passwordInput ||
    !loginSubmit ||
    !loginStatus ||
    !messageLoading ||
    !messageBody
  ) {
    return;
  }

  const mobileLoginMedia = window.matchMedia('(max-width: 599px)');
  const visualViewport = window.visualViewport;
  const loginContentAriaHidden = new Map(
    Array.from(loginCard.children)
      .filter((element) => element !== loginCover)
      .map((element) => [element, element.getAttribute('aria-hidden')])
  );

  function syncMobileLoginViewport() {
    if (!mobileLoginMedia.matches || !visualViewport) {
      loginScreen.style.removeProperty('--login-viewport-height');
      loginScreen.classList.remove('mobile-keyboard-open');
      return;
    }

    const visibleHeight = Math.round(visualViewport.height);
    const loginInputFocused =
      document.activeElement === usernameInput ||
      document.activeElement === passwordInput;

    loginScreen.style.setProperty('--login-viewport-height', `${visibleHeight}px`);
    loginScreen.classList.toggle(
      'mobile-keyboard-open',
      loginInputFocused && visibleHeight < window.innerHeight - 80
    );
  }

  if (visualViewport) {
    visualViewport.addEventListener('resize', syncMobileLoginViewport);
    usernameInput.addEventListener('focus', syncMobileLoginViewport);
    passwordInput.addEventListener('focus', syncMobileLoginViewport);
    loginForm.addEventListener('focusout', () => {
      window.requestAnimationFrame(syncMobileLoginViewport);
    });
    syncMobileLoginViewport();
  }

  function getSessionValue(key) {
    try {
      return sessionStorage.getItem(key) || '';
    } catch (error) {
      return '';
    }
  }

  function setSessionValue(key, value) {
    try {
      if (value) {
        sessionStorage.setItem(key, value);
      } else {
        sessionStorage.removeItem(key);
      }
    } catch (error) {
      // The experience still works for the current page when storage is unavailable.
    }
  }

  function trackJourneyEvent(type) {
    document.dispatchEvent(
      new CustomEvent(TRACKING_EVENT, {
        detail: { type: type },
      })
    );
  }

  function showScreen(id) {
    screens.forEach((screen) => {
      const isActive = screen.id === id;
      screen.hidden = !isActive;
      screen.classList.toggle('active', isActive);
    });

    if (typeof pageShell.scrollTo === 'function') {
      pageShell.scrollTo({ top: 0, behavior: 'smooth' });
    }

    window.requestAnimationFrame(() => {
      const heading = document.querySelector(`#${id} h1`);
      if (heading && typeof heading.focus === 'function') {
        heading.focus({ preventScroll: true });
      }
    });
  }

  function setLoginStatus(message, state) {
    loginStatus.textContent = message;
    if (state) {
      loginStatus.dataset.state = state;
    } else {
      delete loginStatus.dataset.state;
    }
  }

  function setLoginBusy(isBusy) {
    loginForm.setAttribute('aria-busy', String(isBusy));
    usernameInput.disabled = isBusy;
    passwordInput.disabled = isBusy;
    loginSubmit.disabled = isBusy;
    loginSubmit.classList.toggle('is-loading', isBusy);
  }

  function setLoginCovered(isCovered) {
    loginCover.hidden = !isCovered;
    loginCard.classList.toggle('is-covered', isCovered);

    Array.from(loginCard.children).forEach((element) => {
      if (element === loginCover) {
        return;
      }

      element.inert = isCovered;
      if (isCovered) {
        element.setAttribute('aria-hidden', 'true');
      } else {
        const originalValue = loginContentAriaHidden.get(element);
        if (originalValue === null) {
          element.removeAttribute('aria-hidden');
        } else {
          element.setAttribute('aria-hidden', originalValue);
        }
      }
    });

    usernameInput.tabIndex = isCovered ? -1 : 0;
    passwordInput.tabIndex = isCovered ? -1 : 0;
    loginSubmit.tabIndex = isCovered ? -1 : 0;
  }

  function showLogin(options = {}) {
    setLoginCovered(true);
    setSessionValue(STAGE_KEY, 'login');
    showScreen('login-screen');
    messageBody.hidden = true;
    messageBody.replaceChildren();
    messageLoading.hidden = false;

    if (options.message) {
      setLoginStatus(options.message, 'error');
    } else {
      setLoginStatus('', '');
    }

    if (options.track !== false) {
      trackJourneyEvent('login_page_opened');
    }

    window.setTimeout(() => {
      loginCover.focus({ preventScroll: true });
    }, 120);
  }

  async function parseJsonResponse(response) {
    let data = null;

    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }

    if (!response.ok) {
      const requestError = new Error('Request failed');
      requestError.status = response.status;
      throw requestError;
    }

    return data;
  }

  async function requestLogin(username, password) {
    const response = await fetch(`${WORKER_URL}/login`, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-store',
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username,
        password: password,
      }),
    });

    const data = await parseJsonResponse(response);

    if (!data || typeof data.token !== 'string' || !data.token) {
      throw new Error('Invalid login response');
    }

    return data.token;
  }

  async function requestMessage(token) {
    const response = await fetch(`${WORKER_URL}/message`, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      credentials: 'omit',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await parseJsonResponse(response);

    if (!data || typeof data.message !== 'string') {
      throw new Error('Invalid message response');
    }

    return data.message;
  }

  function renderMessage(message) {
    const fragment = document.createDocumentFragment();

    message.replace(/\r\n/g, '\n').split('\n').forEach((line) => {
      if (line.trim()) {
        const paragraph = document.createElement('p');
        paragraph.textContent = line;
        fragment.append(paragraph);
      } else {
        const spacer = document.createElement('div');
        spacer.className = 'message-break';
        spacer.setAttribute('aria-hidden', 'true');
        fragment.append(spacer);
      }
    });

    messageBody.replaceChildren(fragment);
    messageLoading.hidden = true;
    messageBody.hidden = false;
  }

  async function openMessage(token, options = {}) {
    setSessionValue(STAGE_KEY, 'message');
    showScreen('message-screen');
    messageBody.hidden = true;
    messageLoading.hidden = false;
    messageLoading.textContent = 'Opening your message…';

    try {
      const message = await requestMessage(token);
      renderMessage(message);

      if (options.track !== false) {
        trackJourneyEvent('message_page_opened');
      }
    } catch (error) {
      setSessionValue(TOKEN_KEY, '');
      showLogin({
        message: 'The message could not be opened. Please try again.',
        track: true,
      });
    }
  }

  finalButton.addEventListener('click', () => {
    setSessionValue(TOKEN_KEY, '');
    showLogin({ track: true });
  });

  loginCover.addEventListener('click', () => {
    setLoginCovered(false);
    window.requestAnimationFrame(() => {
      usernameInput.focus({ preventScroll: true });
    });
  });

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!loginForm.checkValidity()) {
      loginForm.reportValidity();
      return;
    }

    const username = usernameInput.value;
    const password = passwordInput.value;

    setLoginStatus('', '');
    setLoginBusy(true);

    try {
      const token = await requestLogin(username, password);
      setSessionValue(TOKEN_KEY, token);
      usernameInput.value = '';
      passwordInput.value = '';
      trackJourneyEvent('login_succeeded');
      await openMessage(token, { track: true });
    } catch (error) {
      passwordInput.value = '';

      if (error && error.status === 401) {
        setLoginStatus(
          'That username or password did not work. Please try again.',
          'error'
        );
      } else {
        setLoginStatus(
          'Could not connect right now. Please try again.',
          'error'
        );
      }

      passwordInput.focus({ preventScroll: true });
    } finally {
      setLoginBusy(false);
    }
  });

  const savedStage = getSessionValue(STAGE_KEY);
  const savedToken = getSessionValue(TOKEN_KEY);

  if (savedStage === 'message' && savedToken) {
    openMessage(savedToken, { track: true });
  } else if (savedStage === 'login' || savedStage === 'message') {
    setSessionValue(TOKEN_KEY, '');
    showLogin({ track: true });
  }
})();

