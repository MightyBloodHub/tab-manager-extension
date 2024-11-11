document.getElementById('saveSession').addEventListener('click', () => {
  const sessionName = document.getElementById('sessionName').value;
  chrome.runtime.sendMessage({ action: 'saveSession', sessionName }, response => {
    console.log(response.status);
  });
});

document.getElementById('updateSession').addEventListener('click', () => {
  const sessionName = document.getElementById('sessionName').value;
  chrome.runtime.sendMessage({ action: 'updateSession', sessionName }, response => {
    console.log(response.status);
  });
});

// Display available sessions
chrome.storage.local.get("sessions", (data) => {
  const sessions = data.sessions || {};
  const sessionList = document.getElementById('sessionList');
  sessionList.innerHTML = '';

  Object.keys(sessions).forEach(sessionName => {
    const li = document.createElement('li');
    li.textContent = sessionName;
    li.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'loadSession', sessionName }, response => {
        console.log(response.status);
      });
    });
    sessionList.appendChild(li);
  });
});
