// background.js

// Initialize the sessions object if it doesn't exist
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['sessions', 'errorLogs'], (data) => {
      if (!data.sessions) {
        chrome.storage.local.set({ sessions: {} });
      }
      if (!data.errorLogs) {
        chrome.storage.local.set({ errorLogs: [] });
      }
    });
  });
  
  // Utility function to log errors
  function logError(errorMessage) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${errorMessage}`;
    chrome.storage.local.get('errorLogs', (data) => {
      const errorLogs = data.errorLogs || [];
      errorLogs.push(logEntry);
      chrome.storage.local.set({ errorLogs: errorLogs });
    });
  }
  
  // Listen for messages from the popup script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'saveSession') {
      saveSession(request.sessionName).then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        logError(error.message);
        sendResponse({ success: false, error: error.message });
      });
      return true;
    } else if (request.action === 'overwriteSession') {
      overwriteSession(request.sessionName).then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        logError(error.message);
        sendResponse({ success: false, error: error.message });
      });
      return true;
    } else if (request.action === 'loadSession') {
      loadSession(request.sessionId).then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        logError(error.message);
        sendResponse({ success: false, error: error.message });
      });
      return true;
    } else if (request.action === 'renameSession') {
      renameSession(request.sessionId, request.newName).then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        logError(error.message);
        sendResponse({ success: false, error: error.message });
      });
      return true;
    } else if (request.action === 'getSessions') {
      getSessions().then((sessions) => {
        sendResponse({ success: true, sessions: sessions });
      }).catch((error) => {
        logError(error.message);
        sendResponse({ success: false, error: error.message });
      });
      return true;
    } else if (request.action === 'deleteSession') {
      deleteSession(request.sessionId).then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        logError(error.message);
        sendResponse({ success: false, error: error.message });
      });
      return true;
    } else if (request.action === 'getErrorLogs') {
      getErrorLogs().then((logs) => {
        sendResponse({ success: true, logs: logs });
      }).catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
    }
  });
  
  // Save a new session or prompt to overwrite if name exists
  async function saveSession(sessionName) {
    // If sessionName is not provided, use the current date and time
    if (!sessionName || sessionName.trim() === '') {
      sessionName = `Session - ${new Date().toLocaleString()}`;
    }
    const [currentWindow] = await chrome.windows.getAll({ populate: true, windowTypes: ['normal'] });
    const tabs = currentWindow.tabs.map(tab => ({ url: tab.url, title: tab.title }));
  
    let sessions = await getSessions();
    let sessionId;
  
    // Check if a session with the same name exists
    for (let id in sessions) {
      if (sessions[id].name === sessionName) {
        sessionId = id;
        break;
      }
    }
  
    if (sessionId) {
      // Session with same name exists, throw error to prompt overwrite
      throw new Error('A session with this name already exists.');
    } else {
      // Create new session
      sessionId = Date.now().toString();
      sessions[sessionId] = {
        name: sessionName,
        tabs: tabs
      };
    }
  
    await chrome.storage.local.set({ sessions: sessions });
  }
  
  // Overwrite an existing session
  async function overwriteSession(sessionName) {
    if (!sessionName || sessionName.trim() === '') {
      throw new Error('Session name cannot be empty.');
    }
    const [currentWindow] = await chrome.windows.getAll({ populate: true, windowTypes: ['normal'] });
    const tabs = currentWindow.tabs.map(tab => ({ url: tab.url, title: tab.title }));
  
    let sessions = await getSessions();
    let sessionId;
  
    // Find the session with the given name
    for (let id in sessions) {
      if (sessions[id].name === sessionName) {
        sessionId = id;
        break;
      }
    }
  
    if (sessionId) {
      // Overwrite the session
      sessions[sessionId] = {
        name: sessionName,
        tabs: tabs
      };
      await chrome.storage.local.set({ sessions: sessions });
    } else {
      throw new Error('Session not found for overwrite.');
    }
  }
  
  // Load a session's tabs
  async function loadSession(sessionId) {
    const sessions = await getSessions();
    const session = sessions[sessionId];
  
    if (!session) {
      throw new Error('Session not found');
    }
  
    const currentWindow = await chrome.windows.getCurrent({ populate: true });
    const currentWindowId = currentWindow.id;
    const currentTabUrls = currentWindow.tabs.map(tab => tab.url);
  
    // Open tabs that are not already open
    for (const tabData of session.tabs) {
      if (!currentTabUrls.includes(tabData.url)) {
        await chrome.tabs.create({ windowId: currentWindowId, url: tabData.url });
      }
    }
  }
  
  // Rename an existing session
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
      if (sessions[id].name === newName) {
        throw new Error('A session with this name already exists.');
      }
    }
    sessions[sessionId].name = newName;
    await chrome.storage.local.set({ sessions: sessions });
  }
  
  // Delete a session
  async function deleteSession(sessionId) {
    let sessions = await getSessions();
    if (sessions[sessionId]) {
      delete sessions[sessionId];
      await chrome.storage.local.set({ sessions: sessions });
    } else {
      throw new Error('Session not found');
    }
  }
  
  // Get all saved sessions
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
  
  // Get error logs
  async function getErrorLogs() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get('errorLogs', (data) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(data.errorLogs || []);
        }
      });
    });
  }
  