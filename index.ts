import { app, BrowserWindow, ipcMain } from 'electron'
import log from 'electron-log'

import instapi from './src/instapi'

let win: any = null

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

function createWindow () {
  win = new BrowserWindow({
    width: 600,
    height: 700,
    minHeight: 700,
    minWidth: 600,
    title: "BlueDuck",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  win.loadFile('index.html')
      .then(() => log.info(`Loaded: ${JSON.stringify(arguments)}`))
      .catch(() => log.info(`Error: ${JSON.stringify(arguments)}`))

  ipcMain.on(IPC_ACTIONS.APP_START, () => {
    setTimeout(() => {
      instapi.client.initialize()
    }, 500)
    setTimeout(() => {
      win.webContents.send(WEB_ACTIONS.APP_START_SUCCESS)
    }, 1000)
  })

  ipcMain.on(IPC_ACTIONS.LOGOUT, (_event, data) => {
    instapi.client.clear()
  })

  ipcMain.on(IPC_ACTIONS.LOGIN, (_event, data) => {
    const { username, password, remember } = JSON.parse(data)
    instapi.auth.login(username, password, {
      remember,
      async onTwoFA({ type }) {
        const code = await new Promise((resolve, reject) => {
          setTimeout(() => {
            reject(new Error('2FA Expired'))
          }, 300_000) // 5 minutes
          ipcMain.on(IPC_ACTIONS.LOGIN_2FA, (_event, data) => {
            const { code } = JSON.parse(data)
            resolve(code)
          })
          win.webContents.send(WEB_ACTIONS.LOGIN_2FA, JSON.stringify({ type }))
        })
        return { code }
      },
      async onCheckpoint({ url }) {
        const code = await new Promise((resolve, reject) => {

        })
        return { code }
      },
    }).then(async res => {
      win.webContents.send(WEB_ACTIONS.LOGIN_SUCCESS, JSON.stringify(res))
    }).catch(err => {
      win.webContents.send(WEB_ACTIONS.LOGIN_ERROR, JSON.stringify(err))
    })
  })

  ipcMain.on(IPC_ACTIONS.CHAT_MUTE, (_event, data) => {
    const { broadcastId } = JSON.parse(data)
    instapi.comments.mute(broadcastId)
  })

  ipcMain.on(IPC_ACTIONS.BROADCAST_CREATE, (_event, data) => {
    instapi.broadcast.create(JSON.parse(data))
        .then(stream => {
          const { rtmpUrl, streamKey, broadcastId } = stream
          win.webContents.send(WEB_ACTIONS.BROADCAST_CREATED, JSON.stringify({ rtmpUrl, streamKey, broadcastId }))
        })
        .catch(err => {
          win.webContents.send(WEB_ACTIONS.BROADCAST_CREATE_ERROR, JSON.stringify(err))
        })
  })

  ipcMain.on(IPC_ACTIONS.BROADCAST_START, (_event, data) => {
    const { broadcastId, sendNotification } = JSON.parse(data)
    instapi.broadcast.start(broadcastId, sendNotification)
        .then(async stream => {
          const { status, media_id } = stream
          win.webContents.send(WEB_ACTIONS.BROADCAST_STARTED, JSON.stringify({ status, media_id }))
        })
        .catch(err => {
          log.info(err)
          log.info(err.toString())
          win.webContents.send(WEB_ACTIONS.BROADCAST_START_ERROR, JSON.stringify(err))
        })
  })

  ipcMain.on(IPC_ACTIONS.BROADCAST_STOP, (_event, data) => {
    const { broadcastId } = JSON.parse(data)
    instapi.broadcast.stop(broadcastId)
        .then(() => {
          win.webContents.send(WEB_ACTIONS.BROADCAST_STOPPED, JSON.stringify({ broadcastId }))
        })
        .catch(err => {
          win.webContents.send(WEB_ACTIONS.BROADCAST_STOP_ERROR, JSON.stringify(err))
        })
  })
}

app.on('ready', createWindow)
app.on('window-all-closed', () => {app.quit()})
