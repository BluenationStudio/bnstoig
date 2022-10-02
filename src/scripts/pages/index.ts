(function(window) {
  const electron = require('electron')
  const ipcRenderer = electron.ipcRenderer

  // Enable while developing to make life easier
  const shouldSaveUserCredentials = true

  function $(e) { return document.querySelector(e) }

  HTMLElement.prototype.hide = function() {
    this.style.display = 'none'
  }

  HTMLElement.prototype.show = function() {
    this.style.display = 'block'
  }

  const Storage = {
    isWelcomeScreenPassed() {
      return Number(localStorage.getItem('welcome-screen-passed'))
    },
    setWelcomeScreenPassed() {
      localStorage.setItem('welcome-screen-passed', '1')
    },
    broadcastId: null,
    setBroadcast(id) {
      this.broadcastId = id
    },
    getBroadcast() {
      return this.broadcastId
    },
    user: null,
    setUser(user) {
      this.user = user
    },
  }

  const TRACK_EVENTS = {
    SCREEN: {
      INSTALL: 'screen-install',
      ERROR: 'screen-error',
      LOGIN: 'screen-login',
      PROFILE: 'screen-profile',
    },
    ERRORS: {
      LOGIN: 'error-login',
      BROADCAST: 'error-broadcast',
    },
    ACTIONS: {
      LOGOUT: 'action-logout',
      COPY_RTMP: 'action-copied-rtmp',
      COPY_STREAM_KEY: 'action-copied-key',
      CREATE_BROADCAST: 'action-create-broadcast',
      START_BROADCAST: 'action-start-broadcast',
      STOP_BROADCAST: 'action-stop-broadcast',
      CANCEL_STOP_BROADCAST: 'action-cancel-stop-broadcast',
    }
  }

  const IPC_ACTIONS = {
    APP_START: 'application-start',
    LOGIN: 'login',
    LOGOUT: 'logout',
    LOGIN_2FA: 'login-2fa',
    BROADCAST_CREATE: 'broadcast-create',
    BROADCAST_START: 'broadcast-start',
    BROADCAST_STOP: 'broadcast-stop',
    CHAT_MUTE: 'broadcast-chat-mute',
  }

  const WEB_ACTIONS = {
    APP_START_SUCCESS: 'application-start-success',
    LOGIN_CHECKPOINT: 'login-checkpoint',
    LOGIN_2FA: 'login-2fa',
    LOGIN_SUCCESS: 'login-success',
    LOGIN_ERROR: 'login-error',
    BROADCAST_CREATED: 'broadcast-created',
    BROADCAST_CREATE_ERROR: 'broadcast-create-error',
    BROADCAST_STARTED: 'broadcast-started',
    BROADCAST_START_ERROR: 'broadcast-start-error',
    BROADCAST_STOPPED: 'broadcast-stopped',
    BROADCAST_STOP_ERROR: 'broadcast-stop-error',
  }

  const CONTAINERS = {
    LOADER: $('#yd-package-loader'),
    WELCOME: $('#yd-welcome-screen'),
    LOGIN: $('#yd-inst-login'),
    STOP: $('#yd-stop-confirm'),
    PROFILE: $('#yd-profile-data'),
    CRASH: $('#yd-crash-screen'),
  }

  function showContainer(selected, containers = CONTAINERS) {
    const all = Object.values(containers)
    all.forEach(c => c.hide())
    selected.show()
  }

  const views = {
    LOADER: {},
    WELCOME: {
      startNowBtn: $('.yd-start-now-btn')
    },
    LOGIN: {
      error: $('#yd-login-error'),
      userInput: $('#username'),
      passInput: $('#password'),
      rememberMe: $('#yd-auth-remember-me'),
      button: $('.yd-login-btn'),
    },
    PROFILE: {
      profileImage: $('#yd-profile'),
      usernameField: $('#yd-username'),
      streamStatusLabel: $('#yt-stream-status'),
      logoutBtn: $('#yd-logout-btn'),
      error: $('#yd-broadcast-error'),

      streamLoader: $('#yd-stream-loader'),

      createStreamContainer: $('#yd-create-stream-container'),
      createStreamBtn: $('#yd-create-stream-btn'),

      startStreamContainer: $('#yd-start-stream-container'),
      startSendNotification: $('#yd-send-notification'),
      startAllowCommenting: $('#yd-allow-commenting'),
      startStreamBtn: $('#yd-start-stream-btn'),

      stopStreamContainer: $('#yd-stop-stream-container'),
      stopStreamBtn: $('#yd-stop-stream-btn'),

      streamCredsCnt: $('#yt-stream-credentials'),
      rtmpUrlInput: $('#rtmp-url'),
      streamKeyInput: $('#stream-key'),

      copyStreamKey: $('#yd-copy-stream-key'),
      copyRtmpUrl: $('#yd-copy-rtmp-url'),
      copyNotif: $('.yd-cc-notif'),
    },
    STOP: {
      cancelButton: $('.yd-cancel-logout-btn'),
      confirmButton: $('.yd-confirm-logout-btn'),
    },
    CRASH: {},
    shared: {
      aboutLink: $('.yd-about-link'),
      aboutHelpCenter: $('.yt-medium-href'),
      aboutTwitter: $('#yd-about-twitter'),
      yearElement: $('#yd-year'),
    }
  }

  if (shouldSaveUserCredentials) {
    views.LOGIN.userInput.value = window.localStorage.getItem('yellowDuck.username')
    views.LOGIN.passInput.value = window.localStorage.getItem('yellowDuck.password')
  }

  views.shared.yearElement.innerHTML = new Date().getFullYear()

  ipcRenderer.send(IPC_ACTIONS.APP_START)
  showContainer(CONTAINERS.LOADER)
  track(TRACK_EVENTS.SCREEN.INSTALL)

  ipcRenderer.on(WEB_ACTIONS.APP_START_SUCCESS, () => {
    if (Storage.isWelcomeScreenPassed()) {
      track(TRACK_EVENTS.SCREEN.LOGIN)
      showContainer(CONTAINERS.LOGIN)
      views.LOGIN.userInput.focus()
      return
    }
    showContainer(CONTAINERS.WELCOME)
    track(TRACK_EVENTS.SCREEN.WELCOME)
  })

  views.WELCOME.startNowBtn.addEventListener('click', function() {
    showContainer(CONTAINERS.LOGIN)
    Storage.setWelcomeScreenPassed()
  })

  ipcRenderer.on(WEB_ACTIONS.LOGIN_SUCCESS, (event, data) => {
    const user = JSON.parse(data)
    Storage.setUser(user)

    const {
      username, profile_pic_url, country_code,
      is_verified, is_business, is_private,
    } = user

    views.LOGIN.passInput.value = ''
    showContainer(CONTAINERS.PROFILE)

    views.PROFILE.streamStatusLabel.show()
    views.LOGIN.button.classList.remove('is-loading')
    views.LOGIN.button.removeAttribute('disabled')

    views.PROFILE.usernameField.textContent = username
    views.PROFILE.profileImage.setAttribute('src', profile_pic_url)

    // Start creating broadcast
    ipcRenderer.send(IPC_ACTIONS.BROADCAST_CREATE)

    track(TRACK_EVENTS.SCREEN.PROFILE, {
      is_verified, is_business, is_private, country_code,
    })
  })

  ipcRenderer.on(WEB_ACTIONS.LOGIN_ERROR, (event, data) => {
    const { message, code } = JSON.parse(data)

    views.LOGIN.button.classList.remove('is-loading')
    views.LOGIN.button.removeAttribute('disabled')

    views.LOGIN.error.textContent = message
    views.LOGIN.error.show()

    switch (code) {
      case 'IgLoginBadPasswordError':
        views.LOGIN.passInput.value = ''
        views.LOGIN.passInput.focus()
        break
    }

    track(TRACK_EVENTS.ERRORS.LOGIN, { code, message })
  })

  ipcRenderer.on(WEB_ACTIONS.BROADCAST_CREATED, (event, data) => {
    const { rtmpUrl, streamKey, broadcastId } = JSON.parse(data)
    Storage.setBroadcast(broadcastId)

    views.PROFILE.streamCredsCnt.show()
    views.PROFILE.streamLoader.hide()

    views.PROFILE.rtmpUrlInput.value = rtmpUrl
    views.PROFILE.streamKeyInput.value = streamKey

    views.PROFILE.streamStatusLabel.textContent = 'NOT STARTED'
    views.PROFILE.streamStatusLabel.classList.remove('live')
  })

  ipcRenderer.on(WEB_ACTIONS.BROADCAST_STARTED, (event, data) => {
    const { status, media_id } = JSON.parse(data)

    views.PROFILE.startStreamBtn.classList.remove('is-loading')
    views.PROFILE.startStreamBtn.removeAttribute('disabled')
    views.PROFILE.startStreamContainer.hide()
    views.PROFILE.stopStreamContainer.show()

    views.PROFILE.streamStatusLabel.textContent = 'LIVE'
    views.PROFILE.streamStatusLabel.classList.add('live')
  })

  ipcRenderer.on(WEB_ACTIONS.BROADCAST_STOPPED, () => {
    views.PROFILE.stopStreamBtn.removeAttribute('disabled')
    views.PROFILE.stopStreamBtn.classList.remove('is-loading')
    views.PROFILE.createStreamContainer.show()
    views.PROFILE.stopStreamContainer.hide()
    views.PROFILE.streamCredsCnt.hide()

    views.PROFILE.streamStatusLabel.textContent = 'NOT CREATED'
    views.PROFILE.streamStatusLabel.classList.remove('live')
  })

  function onBroadcastError(event, data) {
    const { code, message } = JSON.parse(data)

    views.PROFILE.streamCredsCnt.hide()
    views.PROFILE.error.textContent = message
    Storage.setBroadcast(null)

    track(TRACK_EVENTS.ERRORS.BROADCAST, { code })
  }

  ipcRenderer.on(WEB_ACTIONS.BROADCAST_CREATE_ERROR, onBroadcastError)
  ipcRenderer.on(WEB_ACTIONS.BROADCAST_START_ERROR, onBroadcastError)
  ipcRenderer.on(WEB_ACTIONS.BROADCAST_STOP_ERROR, onBroadcastError)

  views.LOGIN.button.addEventListener('click', function(e) {
    e.preventDefault()
    views.LOGIN.error.hide()
    const username = views.LOGIN.userInput.value
    const password = views.LOGIN.passInput.value
    const remember = views.LOGIN.rememberMe.value === 'on'

    if (shouldSaveUserCredentials) {
      window.localStorage.setItem('yellowDuck.username', username)
      window.localStorage.setItem('yellowDuck.password', password)
    }

    ipcRenderer.send(IPC_ACTIONS.LOGIN, JSON.stringify({
      username, password, remember
    }))

    views.LOGIN.button.classList.add('is-loading')
    views.LOGIN.button.setAttribute('disabled', 'true')
  })

  views.PROFILE.createStreamBtn.addEventListener('click', () => {
    ipcRenderer.send(IPC_ACTIONS.BROADCAST_CREATE)
    views.PROFILE.createStreamContainer.hide()
    views.PROFILE.startStreamContainer.show()
    views.PROFILE.streamLoader.show()
    track(TRACK_EVENTS.ACTIONS.CREATE_BROADCAST)
  })

  views.PROFILE.startStreamBtn.addEventListener('click', () => {
    const sendNotification = views.PROFILE.startSendNotification.value === 'on'
    const allowCommenting = views.PROFILE.startAllowCommenting.value === 'on'

    if (!allowCommenting) {
      ipcRenderer.send(IPC_ACTIONS.CHAT_MUTE, JSON.stringify({
        broadcastId: Storage.getBroadcast(),
      }))
    }

    ipcRenderer.send(IPC_ACTIONS.BROADCAST_START, JSON.stringify({
      sendNotification: sendNotification,
      broadcastId: Storage.getBroadcast(),
    }))

    views.PROFILE.startStreamBtn.classList.add('is-loading')
    views.PROFILE.startStreamBtn.setAttribute('disabled', 'true')
    track(TRACK_EVENTS.ACTIONS.START_BROADCAST)
  })

  views.PROFILE.stopStreamBtn.addEventListener('click', () => {
    showContainer(CONTAINERS.STOP)
  })

  views.STOP.cancelButton.addEventListener('click', () => {
    showContainer(CONTAINERS.PROFILE)
    track(TRACK_EVENTS.ACTIONS.CANCEL_STOP_BROADCAST)
  })

  views.STOP.confirmButton.addEventListener('click', () => {
    showContainer(CONTAINERS.PROFILE)

    ipcRenderer.send(IPC_ACTIONS.BROADCAST_STOP, JSON.stringify({
      broadcastId: Storage.getBroadcast(),
    }))

    views.PROFILE.stopStreamBtn.classList.add('is-loading')
    views.PROFILE.stopStreamBtn.setAttribute('disabled', 'true')
    track(TRACK_EVENTS.ACTIONS.STOP_BROADCAST)
  })

  views.PROFILE.logoutBtn.addEventListener('click', () => {
    showContainer(CONTAINERS.LOGIN)
    views.PROFILE.streamStatusLabel.textContent = 'NOT CREATED'
    views.PROFILE.streamStatusLabel.classList.remove('live')
    views.PROFILE.startStreamContainer.show()
    views.PROFILE.stopStreamContainer.hide()
    views.PROFILE.streamCredsCnt.hide()
    views.PROFILE.streamLoader.show()

    ipcRenderer.send(IPC_ACTIONS.LOGOUT)
    track(TRACK_EVENTS.ACTIONS.LOGOUT)
  })

  views.PROFILE.copyStreamKey.addEventListener('click', function() {
    copyToClipboard(views.PROFILE.streamKeyInput.value)
    views.PROFILE.copyNotif.show()
    setTimeout(() => {
      views.PROFILE.copyNotif.hide()
    }, 1500)
    track(TRACK_EVENTS.ACTIONS.COPY_STREAM_KEY)
  })

  views.PROFILE.copyRtmpUrl.addEventListener('click', function() {
    copyToClipboard(views.PROFILE.rtmpUrlInput.value)
    views.PROFILE.copyNotif.show()
    setTimeout(() => {
      views.PROFILE.copyNotif.hide()
    }, 1500)
    track(TRACK_EVENTS.ACTIONS.COPY_RTMP)
  })

  function copyToClipboard(text) {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }

  function track(eventName, options = {}) {
    new Promise((resolve) => {
      const defaultOptions = {
        // @todo We can add it, but it's not that useful with Electron's `file://` protocol
        // origin: window.location.origin,
        // current_url: window.location.href.replace(window.location.origin, ''),
        version: window.appState.version
      }

      if (typeof window.amplitude === 'object') {
          window.amplitude.getInstance().logEvent(
            eventName,
            Object.assign({}, defaultOptions, options),
            (responseCode, responseBody) => resolve({ responseCode, responseBody })
          );
      }
    })
  }
})(window)
