// popup.js

document.addEventListener('DOMContentLoaded', init);

// Message listener for state changes
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'stateChanged') {
    refreshUI();
  }
});

// Move these event listeners to ensure they're registered
chrome.tabs.onCreated.addListener(() => refreshUI());
chrome.tabs.onRemoved.addListener(() => refreshUI());
chrome.tabs.onUpdated.addListener(() => refreshUI());
chrome.windows.onCreated.addListener(() => refreshUI());
chrome.windows.onRemoved.addListener(() => refreshUI());
chrome.windows.onFocusChanged.addListener(() => refreshUI());

async function refreshUI() {
  try {
    await checkCurrentSession();
    await loadSessions();
  } catch (error) {
    console.error('Error refreshing UI:', error);
  }
}

async function init() {
  document.getElementById('saveSession').addEventListener('click', saveSession);
  await refreshUI();
}

async function checkCurrentSession() {
  const currentWindow = await chrome.windows.getCurrent({ windowTypes: ['normal'] });
  const windowId = currentWindow.id.toString();

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getSessionByWindowId', windowId: windowId }, (response) => {
      if (response && response.success) {
        if (response.session) {
          displayCurrentSession(response.session);
          document.getElementById('currentSessionContainer').style.display = 'block';
          document.getElementById('saveSessionContainer').style.display = 'none';
        } else {
          document.getElementById('currentSessionContainer').style.display = 'none';
          document.getElementById('saveSessionContainer').style.display = 'block';
        }
      } else {
        showMessage('Error checking current session: ' + (response.error || 'Unknown error'), true);
      }
      resolve();
    });
  });
}

function displayCurrentSession(session) {
  const currentSessionDetails = document.getElementById('currentSessionDetails');
  
  // Clear previous content and event listeners
  currentSessionDetails.innerHTML = '';
  
  // Create and append name paragraph
  const namePara = document.createElement('p');
  namePara.innerHTML = `<strong>Name:</strong> ${session.name}`;
  currentSessionDetails.appendChild(namePara);
  
  // Create actions container
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'session-actions';
  
  // Create reload button
  const reloadBtn = document.createElement('button');
  reloadBtn.textContent = 'Restore Tabs';
  reloadBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ 
      action: 'restoreSessionTabs', 
      sessionId: session.sessionId 
    }, (response) => {
      if (response && response.success) {
        showMessage('Session tabs restored successfully.');
      } else {
        showMessage('Error restoring tabs: ' + (response.error || 'Unknown error'), true);
      }
    });
  });
  actionsDiv.appendChild(reloadBtn);
  
  // Create update section
  const updateSection = document.createElement('div');
  updateSection.className = 'update-section';
  
  // Create and append input
  const input = document.createElement('input');
  input.type = 'text';
  input.id = 'updateSessionName';
  input.placeholder = 'Enter new name (optional)';
  updateSection.appendChild(input);
  
  // Create and append update button
  const updateBtn = document.createElement('button');
  updateBtn.id = 'updateSession';
  updateBtn.textContent = 'Update Session';
  updateBtn.addEventListener('click', () => {
    const newName = input.value.trim();
    chrome.runtime.sendMessage({ 
      action: 'updateSession', 
      sessionId: session.sessionId, 
      sessionName: newName 
    }, (response) => {
      if (response && response.success) {
        showMessage('Session updated successfully.');
        refreshUI();
      } else {
        showMessage('Error updating session: ' + (response.error || 'Unknown error'), true);
      }
    });
  });
  updateSection.appendChild(updateBtn);
  
  // Append all sections
  currentSessionDetails.appendChild(actionsDiv);
  currentSessionDetails.appendChild(updateSection);
}

function saveSession() {
  chrome.windows.getCurrent({ windowTypes: ['normal'] }, (currentWindow) => {
    const sessionName = document.getElementById('sessionName').value.trim();
    
    chrome.runtime.sendMessage({ 
      action: 'saveSession', 
      sessionName: sessionName,
      windowId: currentWindow.id.toString()
    }, (response) => {
      if (response && response.success) {
        showMessage('Session saved successfully.');
        document.getElementById('sessionName').value = '';
        refreshUI();
      } else if (response.error === 'A session already exists for this window.') {
        showMessage('A session already exists for this window. Please update it instead.', true);
        refreshUI();
      } else {
        showMessage('Error saving session: ' + (response.error || 'Unknown error'), true);
      }
    });
  });
}

async function loadSessions() {
  const currentWindow = await chrome.windows.getCurrent({ windowTypes: ['normal'] });
  const currentWindowId = currentWindow.id.toString();

  chrome.runtime.sendMessage({ action: 'getSessions' }, (response) => {
    if (response && response.success) {
      const sessions = response.sessions;

      // Get all open window IDs
      chrome.windows.getAll({ windowTypes: ['normal'] }, (windows) => {
        const openWindowIds = windows.map(win => win.id.toString());

        // Separate sessions into Active and Saved
        const activeSessions = [];
        const savedSessions = [];

        for (let sessionId in sessions) {
          const session = sessions[sessionId];
          if (sessionId === currentWindowId) {
            continue; // Skip current session
          } else if (openWindowIds.includes(sessionId)) {
            activeSessions.push(session);
          } else {
            savedSessions.push(session);
          }
        }

        displayActiveSessions(activeSessions);
        displaySavedSessions(savedSessions);
      });
    } else {
      showMessage('Error loading sessions: ' + (response.error || 'Unknown error'), true);
    }
  });
}

function displayActiveSessions(activeSessions) {
  const activeSessionsList = document.getElementById('activeSessionsList');
  activeSessionsList.innerHTML = '';

  if (activeSessions.length === 0) {
    document.getElementById('activeSessionsContainer').style.display = 'none';
    return;
  } else {
    document.getElementById('activeSessionsContainer').style.display = 'block';
  }

  activeSessions.forEach(session => {
    const sessionDiv = document.createElement('div');
    sessionDiv.className = 'session';

    const sessionNameSpan = document.createElement('span');
    sessionNameSpan.className = 'session-name';
    sessionNameSpan.textContent = session.name;
    sessionDiv.appendChild(sessionNameSpan);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'session-actions';

    // Switch button
    const switchBtn = document.createElement('button');
    switchBtn.textContent = 'Switch';
    switchBtn.addEventListener('click', () => switchToWindow(session.windowId));
    actionsDiv.appendChild(switchBtn);

    sessionDiv.appendChild(actionsDiv);
    activeSessionsList.appendChild(sessionDiv);
  });
}

function displaySavedSessions(savedSessions) {
  const sessionsList = document.getElementById('sessionsList');
  sessionsList.innerHTML = '';

  savedSessions.forEach(session => {
    const sessionDiv = document.createElement('div');
    sessionDiv.className = 'session';

    const sessionNameSpan = document.createElement('span');
    sessionNameSpan.className = 'session-name';
    sessionNameSpan.textContent = session.name;
    sessionDiv.appendChild(sessionNameSpan);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'session-actions';

    // Load button
    const loadBtn = document.createElement('button');
    loadBtn.textContent = 'Load';
    loadBtn.addEventListener('click', () => loadSession(session.sessionId));
    actionsDiv.appendChild(loadBtn);

    // Rename button
    const renameBtn = document.createElement('button');
    renameBtn.textContent = 'Rename';
    renameBtn.addEventListener('click', () => renameSession(session.sessionId, session.name));
    actionsDiv.appendChild(renameBtn);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deleteSession(session.sessionId));
    actionsDiv.appendChild(deleteBtn);

    sessionDiv.appendChild(actionsDiv);
    sessionsList.appendChild(sessionDiv);
  });
}

function switchToWindow(windowId) {
  chrome.windows.update(parseInt(windowId), { focused: true }, () => {
    if (chrome.runtime.lastError) {
      showMessage('Error switching to window: ' + chrome.runtime.lastError.message, true);
    } else {
      self.close();
    }
  });
}

function loadSession(sessionId) {
  chrome.runtime.sendMessage({ action: 'loadSession', sessionId: sessionId }, (response) => {
    if (response && response.success) {
      showMessage('Session loaded successfully.');
    } else {
      showMessage('Error loading session: ' + (response.error || 'Unknown error'), true);
    }
  });
}

function renameSession(sessionId, currentName) {
  const newName = prompt('Enter new session name:', currentName);
  if (newName && newName.trim() !== '') {
    chrome.runtime.sendMessage({ action: 'renameSession', sessionId: sessionId, newName: newName.trim() }, (response) => {
      if (response && response.success) {
        showMessage('Session renamed successfully.');
        refreshUI();
      } else {
        showMessage('Error renaming session: ' + (response.error || 'Unknown error'), true);
      }
    });
  } else {
    showMessage('Rename cancelled.');
  }
}

function deleteSession(sessionId) {
  if (confirm('Are you sure you want to delete this session?')) {
    chrome.runtime.sendMessage({ action: 'deleteSession', sessionId: sessionId }, (response) => {
      if (response && response.success) {
        showMessage('Session deleted successfully.');
        refreshUI();
      } else {
        showMessage('Error deleting session: ' + (response.error || 'Unknown error'), true);
      }
    });
  }
}

function showMessage(message, isError = false) {
  const messageDiv = document.getElementById('message');
  messageDiv.className = isError ? 'error' : 'success';
  messageDiv.textContent = message;
  setTimeout(() => {
    messageDiv.textContent = '';
  }, 3000);
}
