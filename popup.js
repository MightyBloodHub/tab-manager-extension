// popup.js

document.addEventListener('DOMContentLoaded', init);

async function init() {
  document.getElementById('saveSession').addEventListener('click', saveSession);
  await checkCurrentSession();
  loadSessions();
}

async function checkCurrentSession() {
  const currentWindow = await chrome.windows.getCurrent();
  const windowId = currentWindow.id.toString();

  chrome.runtime.sendMessage({ action: 'getSessionByWindowId', windowId: windowId }, (response) => {
    if (response && response.success) {
      if (response.session) {
        displayCurrentSession(response.session);
      } else {
        // Show the save session container
        document.getElementById('currentSessionContainer').style.display = 'none';
        document.getElementById('saveSessionContainer').style.display = 'block';
      }
    } else {
      showMessage('Error checking current session: ' + (response.error || 'Unknown error'), true);
    }
  });
}

function displayCurrentSession(session) {
  const currentSessionDetails = document.getElementById('currentSessionDetails');
  currentSessionDetails.innerHTML = `
    <p><strong>Name:</strong> ${session.name}</p>
    <input type="text" id="updateSessionName" placeholder="Enter new name (optional)">
    <button id="updateSession">Update Session</button>
  `;
  document.getElementById('saveSessionContainer').style.display = 'none';

  document.getElementById('updateSession').addEventListener('click', () => {
    const newName = document.getElementById('updateSessionName').value.trim();
    chrome.runtime.sendMessage({ action: 'updateSession', sessionId: session.sessionId, sessionName: newName }, (response) => {
      if (response && response.success) {
        showMessage('Session updated successfully.');
        loadSessions();
        checkCurrentSession(); // Update the current session display
      } else {
        showMessage('Error updating session: ' + (response.error || 'Unknown error'), true);
      }
    });
  });
}

function saveSession() {
  const sessionName = document.getElementById('sessionName').value.trim();

  chrome.runtime.sendMessage({ action: 'saveSession', sessionName: sessionName }, (response) => {
    if (response && response.success) {
      showMessage('Session saved successfully.');
      document.getElementById('sessionName').value = '';
      loadSessions();
      checkCurrentSession();
    } else if (response.error === 'A session already exists for this window.') {
      showMessage('A session already exists for this window. Please update it instead.', true);
      checkCurrentSession();
    } else {
      showMessage('Error saving session: ' + (response.error || 'Unknown error'), true);
    }
  });
}

async function loadSessions() {
  chrome.runtime.sendMessage({ action: 'getSessions' }, async (response) => {
    if (response && response.success) {
      const sessions = response.sessions;
      const currentWindow = await chrome.windows.getCurrent();
      const currentWindowId = currentWindow.id.toString();

      // Get all open window IDs
      chrome.windows.getAll({}, (windows) => {
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
  chrome.windows.update(parseInt(windowId), { focused: true }, (window) => {
    if (chrome.runtime.lastError) {
      showMessage('Error switching to window: ' + chrome.runtime.lastError.message, true);
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
        loadSessions();
        checkCurrentSession();
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
        loadSessions();
        checkCurrentSession();
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
