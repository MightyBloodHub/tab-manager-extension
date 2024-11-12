const fs = require('fs');
const path = require('path');

// List of files needed for admin panel development
const files = [
  'background.js',
  'manifest.json',
  'popup.html',
  'popup.js',
  'popup.css',
];

// Function to read and format file content
const exportFiles = () => {
  let output = '';

  files.forEach((file) => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      output += `\n=== ${file} ===\n\n${content}\n`;
    } else {
      output += `\n=== ${file} ===\n\n**File not found.**\n`;
    }
  });

  return output;
};

// Write the consolidated content to a single text file
const consolidatedContent = exportFiles();
fs.writeFileSync('neededFilesConsolidated.txt', consolidatedContent, 'utf8');

console.log('Needed files have been consolidated into neededFilesConsolidated.txt');

