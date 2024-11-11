// popup.js

document.addEventListener('DOMContentLoaded', init);

function init() {
  document.getElementById('saveSession').addEventListener('click', saveSession);
  document.getElementById('viewErrorLogs').addEventListener('click', toggleErrorLogs);
  loadSessions();
}

function saveSession() {
  const sessionName = document.getElementById('sessionName').value.trim();
  chrome.runtime.sendMessage({ action: 'saveSession', sessionName: sessionName }, (response) => {
    if (response && response.success) {
      showMessage('Session saved successfully.');
      document.getElementById('sessionName').value = '';
      loadSessions();
    } else if (response.error === 'A session with this name already exists.') {
      // Prompt user to confirm overwrite
      if (confirm('A session with this name already exists. Do you want to overwrite it?')) {
        // Send message to overwrite session
        chrome.runtime.sendMessage({ action: 'overwriteSession', sessionName: sessionName }, (overwriteResponse) => {
          if (overwriteResponse && overwriteResponse.success) {
            showMessage('Session overwritten successfully.');
            document.getElementById('sessionName').value = '';
            loadSessions();
          } else {
            showMessage('Error saving session: ' + (overwriteResponse.error || 'Unknown error'), true);
          }
        });
      } else {
        showMessage('Session not saved.');
      }
    } else {
      showMessage('Error saving session: ' + (response.error || 'Unknown error'), true);
    }
  });
}

function loadSessions() {
  chrome.runtime.sendMessage({ action: 'getSessions' }, (response) => {
    if (response && response.success) {
      displaySessions(response.sessions);
    } else {
      showMessage('Error loading sessions: ' + (response.error || 'Unknown error'), true);
    }
  });
}

function displaySessions(sessions) {
  const sessionsList = document.getElementById('sessionsList');
  sessionsList.innerHTML = '';
  for (let sessionId in sessions) {
    const session = sessions[sessionId];
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
    loadBtn.addEventListener('click', () => loadSession(sessionId));
    actionsDiv.appendChild(loadBtn);

    // Rename button
    const renameBtn = document.createElement('button');
    renameBtn.textContent = 'Rename';
    renameBtn.addEventListener('click', () => renameSession(sessionId, session.name));
    actionsDiv.appendChild(renameBtn);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deleteSession(sessionId));
    actionsDiv.appendChild(deleteBtn);

    sessionDiv.appendChild(actionsDiv);
    sessionsList.appendChild(sessionDiv);
  }
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
      } else {
        showMessage('Error deleting session: ' + (response.error || 'Unknown error'), true);
      }
    });
  }
}

function toggleErrorLogs() {
  const errorLogsDiv = document.getElementById('errorLogs');
  if (errorLogsDiv.style.display === 'none' || errorLogsDiv.style.display === '') {
    // Fetch and display error logs
    chrome.runtime.sendMessage({ action: 'getErrorLogs' }, (response) => {
      if (response && response.success) {
        errorLogsDiv.textContent = response.logs.join('\n');
        errorLogsDiv.style.display = 'block';
        document.getElementById('viewErrorLogs').textContent = 'Hide Error Logs';
      } else {
        showMessage('Error retrieving logs: ' + (response.error || 'Unknown error'), true);
      }
    });
  } else {
    errorLogsDiv.style.display = 'none';
    document.getElementById('viewErrorLogs').textContent = 'View Error Logs';
  }
}

function showMessage(message, isError = false) {
  const messageDiv = document.getElementById('message');
  messageDiv.style.color = isError ? 'red' : 'green';
  messageDiv.textContent = message;
  setTimeout(() => {
    messageDiv.textContent = '';
  }, 3000);
}
