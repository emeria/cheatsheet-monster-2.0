const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, '..', '..', 'public', 'images');
const dataFile = path.join(__dirname, '..', 'data', 'imagesData.js');

// Function to extract filename without extension
const getFileName = (file) => path.basename(file, path.extname(file));

// Converts a string to Pascal Case
const toPascalCase = (str) => {
  return str
    .replace(new RegExp(/[-_]+/, 'g'), ' ') // Replace hyphens/underscores with spaces
    .replace(new RegExp(/[^\w\s]/, 'g'), '') // Remove all non-word characters
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
};

// Read the existing data file
let existingData;
try {
  existingData = require(dataFile);
} catch (error) {
  console.error('Error reading images data file:', error);
  process.exit(1);
}

// Read the images directory
fs.readdir(imagesDir, (err, files) => {
  if (err) {
    console.error('Error reading images directory:', err);
    return;
  }

  const newImages = files
    .filter(file => /\.(jpg|jpeg|png|webp|gif)$/.test(file)) // Filter for image files
    .map(file => ({
      src: `/images/${file}`,
      alt: getFileName(file),
      tag: toPascalCase(getFileName(file)), // Add tag property
      enlargeHeight: '80%', // Default values
      enlargeWidth: '90%'
    }))
    .filter(newImage => !existingData.some(existing => existing.src === newImage.src)); // Exclude existing images

  // Combine with existing data without modifying original entries
  const updatedData = [...existingData, ...newImages];
  const fileContent = `const images = ${JSON.stringify(updatedData, null, 2)};\n\nmodule.exports = images;`;

  // Write the updated data back to the file
  fs.writeFile(dataFile, fileContent, (writeErr) => {
    if (writeErr) {
      console.error('Error writing to images data file:', writeErr);
    } else {
      console.log('imagesData.js updated successfully.');
    }
  });
});
