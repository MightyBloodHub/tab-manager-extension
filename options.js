document.addEventListener('DOMContentLoaded', init);

function init() {
  document.getElementById('exportData').addEventListener('click', exportData);
  document.getElementById('importData').addEventListener('click', importData);
}

async function exportData() {
  try {
    const data = await getAllData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create a temporary anchor element to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extension_data_backup.json';
    a.click();

    // Clean up the URL object
    URL.revokeObjectURL(url);

    showMessage('Data exported successfully.');
  } catch (error) {
    console.error('Error exporting data:', error);
    showMessage('Error exporting data: ' + error.message, true);
  }
}

function importData() {
  // Create an input element to select the file
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';

  input.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) {
      showMessage('No file selected.', true);
      return;
    }

    try {
      const content = await readFileAsText(file);
      const data = JSON.parse(content);

      // Validate the data format
      if (!data.sessions || typeof data.sessions !== 'object') {
        throw new Error('Invalid data format.');
      }

      // Store the data in chrome.storage.local
      await new Promise((resolve, reject) => {
        chrome.storage.local.set(data, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });

      showMessage('Data imported successfully.');
    } catch (error) {
      console.error('Error importing data:', error);
      showMessage('Error importing data: ' + error.message, true);
    }
  });

  // Trigger the file selection dialog
  input.click();
}

// Helper function to read file content as text
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Error reading file.'));
    reader.readAsText(file);
  });
}

// Helper function to get all data from chrome.storage.local
function getAllData() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(null, (data) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(data);
      }
    });
  });
}

function showMessage(message, isError = false) {
  const messageDiv = document.getElementById('message');
  messageDiv.className = isError ? 'error' : 'success';
  messageDiv.textContent = message;
  setTimeout(() => {
    messageDiv.textContent = '';
  }, 5000);
}
