import { v4 as uuidv4 } from 'uuid';

const UPLOAD_PATH = '/uploads/profile_photos/';
const SERVER_URL = 'http://localhost:3001'; // Updated to match the combined server port

export const compressImage = async (file, maxWidth = 800, maxHeight = 800) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP format for better compression
        const compressedDataUrl = canvas.toDataURL('image/webp', 0.8);
        resolve(compressedDataUrl);
      };
    };
  });
};

export const saveImageToServer = async (file, userId) => {
  try {
    // Compress the image
    const compressedImage = await compressImage(file);
    
    // Convert base64 to blob
    const response = await fetch(compressedImage);
    const blob = await response.blob();
    
    // Create form data
    const formData = new FormData();
    const fileName = `${userId}_${uuidv4()}.webp`;
    formData.append('image', blob, fileName);
    
    // Send to server
    const uploadResponse = await fetch(`${SERVER_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!uploadResponse.ok) {
      throw new Error('Failed to upload image');
    }
    
    const { path } = await uploadResponse.json();
    return path; // Returns the path to the saved image
  } catch (error) {
    console.error('Error saving image:', error);
    throw error;
  }
};

export const getImagePath = (userId, fileName) => {
  if (!fileName) return null;
  return `${SERVER_URL}${UPLOAD_PATH}${fileName}`;
};

export const deleteImage = async (fileName) => {
  try {
    const response = await fetch(`${SERVER_URL}/api/delete-image`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileName }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete image');
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};
