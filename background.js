// Background script to manage sessions

// Save current window's tabs as a session
async function saveCurrentSession(sessionName = null) {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const session = tabs.map(tab => ({
        id: tab.id,
        url: tab.url,
        title: tab.title
    }));

    const defaultName = `Session - ${new Date().toLocaleString()}`;
    const finalSessionName = sessionName || defaultName;

    chrome.storage.local.get({ sessions: {} }, (data) => {
        const sessions = data.sessions;
        sessions[finalSessionName] = session;
        chrome.storage.local.set({ sessions }, () => {
            console.log(`Session saved as: ${finalSessionName}`);
        });
    });
}

// Load a session by name
async function loadSession(sessionName) {
    chrome.storage.local.get("sessions", (data) => {
        const session = data.sessions[sessionName];
        if (session) {
            session.forEach((tab, index) => {
                chrome.tabs.create({ url: tab.url, index });
            });
        } else {
            console.error(`Session '${sessionName}' not found.`);
        }
    });
}

// Update an existing session
async function updateSession(sessionName) {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const currentTabUrls = tabs.map(tab => tab.url);

    chrome.storage.local.get("sessions", (data) => {
        if (data.sessions[sessionName]) {
            const oldSession = data.sessions[sessionName];
            const updatedSession = oldSession.filter(tab => currentTabUrls.includes(tab.url));
            
            // Add new tabs that were not in the original session
            tabs.forEach(tab => {
                if (!oldSession.some(oldTab => oldTab.url === tab.url)) {
                    updatedSession.push({ id: tab.id, url: tab.url, title: tab.title });
                }
            });
            
            data.sessions[sessionName] = updatedSession;
            chrome.storage.local.set({ sessions: data.sessions }, () => {
                console.log(`Session '${sessionName}' updated successfully.`);
            });
        } else {
            console.error(`Session '${sessionName}' not found for updating.`);
        }
    });
}

// Listen for messages from the popup script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "saveSession") {
        saveCurrentSession(request.sessionName);
    } else if (request.action === "loadSession") {
        loadSession(request.sessionName);
    } else if (request.action === "updateSession") {
        updateSession(request.sessionName);
    }
    sendResponse({ status: "completed" });
});
