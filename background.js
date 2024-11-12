// background.js

// Initialize the sessions object if it doesn't exist
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get('sessions', (data) => {
      if (!data.sessions) {
        chrome.storage.local.set({ sessions: {} });
      }
    });
  });
  
  // Listen for messages from the popup script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'saveSession') {
      saveSession(request.sessionName).then((sessionId) => {
        sendResponse({ success: true, sessionId: sessionId });
      }).catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
    } else if (request.action === 'updateSession') {
      updateSession(request.sessionId, request.sessionName).then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
    } else if (request.action === 'loadSession') {
      loadSession(request.sessionId).then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
    } else if (request.action === 'renameSession') {
      renameSession(request.sessionId, request.newName).then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
    } else if (request.action === 'getSessions') {
      getSessions().then((sessions) => {
        sendResponse({ success: true, sessions: sessions });
      }).catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
    } else if (request.action === 'deleteSession') {
      deleteSession(request.sessionId).then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
    } else if (request.action === 'getSessionByWindowId') {
      getSessionByWindowId(request.windowId).then((session) => {
        sendResponse({ success: true, session: session });
      }).catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
    }
  });
  
  // Function implementations
  
  async function saveSession(sessionName) {
    // If sessionName is empty, default to current date and timestamp
    if (!sessionName || sessionName.trim() === '') {
      const date = new Date();
      sessionName = date.toLocaleString();
    }
  
    const currentWindow = await chrome.windows.getCurrent({ populate: true });
    const tabs = currentWindow.tabs.map(tab => ({ url: tab.url, title: tab.title }));
  
    let sessions = await getSessions();
    const windowId = currentWindow.id.toString();
  
    // Check if a session already exists for this window
    if (sessions[windowId]) {
      throw new Error('A session already exists for this window.');
    }
  
    // Create new session
    sessions[windowId] = {
      sessionId: windowId,
      name: sessionName,
      tabs: tabs,
      windowId: currentWindow.id
    };
  
    await chrome.storage.local.set({ sessions: sessions });
    return windowId;
  }
  
  async function updateSession(sessionId, sessionName) {
    const currentWindow = await chrome.windows.getCurrent({ populate: true });
    const tabs = currentWindow.tabs.map(tab => ({ url: tab.url, title: tab.title }));
  
    let sessions = await getSessions();
  
    if (!sessions[sessionId]) {
      throw new Error('Session not found for update.');
    }
  
    // If a new session name is provided, update it
    if (sessionName && sessionName.trim() !== '') {
      sessions[sessionId].name = sessionName.trim();
    }
  
    sessions[sessionId].tabs = tabs;
  
    await chrome.storage.local.set({ sessions: sessions });
  }
  
  async function loadSession(sessionId) {
    const sessions = await getSessions();
    const session = sessions[sessionId];
  
    if (!session) {
      throw new Error('Session not found');
    }
  
    // Create a new window with the session's tabs
    const urls = session.tabs.map(tab => tab.url);
    await chrome.windows.create({ url: urls });
  }
  
  async function renameSession(sessionId, newName) {
    if (!newName || newName.trim() === '') {
      throw new Error('New session name cannot be empty.');
    }
    let sessions = await getSessions();
    if (!sessions[sessionId]) {
      throw new Error('Session not found');
    }
    // Check for duplicate session names
    for (let id in sessions) {
      if (sessions[id].name === newName && id !== sessionId) {
        throw new Error('A session with this name already exists.');
      }
    }
    sessions[sessionId].name = newName;
    await chrome.storage.local.set({ sessions: sessions });
  }
  
  async function getSessions() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get('sessions', (data) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(data.sessions || {});
        }
      });
    });
  }
  
  async function deleteSession(sessionId) {
    let sessions = await getSessions();
    if (sessions[sessionId]) {
      delete sessions[sessionId];
      await chrome.storage.local.set({ sessions: sessions });
    } else {
      throw new Error('Session not found');
    }
  }
  
  async function getSessionByWindowId(windowId) {
    let sessions = await getSessions();
    if (sessions[windowId]) {
      return sessions[windowId];
    } else {
      return null;
    }
  }
  