
/**
 * Jay's Frames Expert - Training Module
 * 
 * This module handles the collection and processing of training data
 * for the LLM Frame Designer Assistant.
 */

// Training data collection
const trainingData = {
  sessions: [],
  currentSession: null,
  recordingActive: false,
  designChoices: [],
  annotations: []
};

// Initialize training module
function initTrainingModule() {
  console.log('Training module initialized');
  
  // Add event listeners to all design choice inputs
  document.querySelectorAll('.design-choice').forEach(element => {
    element.addEventListener('change', captureDesignChoice);
  });
  
  // Initialize annotation buttons
  document.getElementById('add-annotation')?.addEventListener('click', addAnnotation);
}

// Start a new training session
function startTrainingSession() {
  trainingData.currentSession = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    artworkData: getArtworkData(),
    designChoices: [],
    annotations: [],
    recordingUrl: null
  };
  
  trainingData.recordingActive = true;
  trainingData.designChoices = [];
  trainingData.annotations = [];
  
  console.log('Training session started', trainingData.currentSession);
  updateTrainingUI('recording');
  
  // Notify the user
  showNotification('Training session started. Your design choices are being recorded.');
}

// End the current training session
function endTrainingSession(recordingUrl = null) {
  if (!trainingData.currentSession) return;
  
  // Save recording URL if provided
  if (recordingUrl) {
    trainingData.currentSession.recordingUrl = recordingUrl;
  }
  
  // Add all collected design choices and annotations
  trainingData.currentSession.designChoices = [...trainingData.designChoices];
  trainingData.currentSession.annotations = [...trainingData.annotations];
  
  // Add session to history
  trainingData.sessions.push(trainingData.currentSession);
  
  // Save to local storage
  saveTrainingSessions();
  
  // Reset current session
  trainingData.recordingActive = false;
  updateTrainingUI('idle');
  
  console.log('Training session ended', trainingData.currentSession);
  showNotification('Training session completed and saved.');
  
  // Upload to server
  uploadTrainingSession(trainingData.currentSession);
  
  trainingData.currentSession = null;
  trainingData.designChoices = [];
  trainingData.annotations = [];
}

// Capture a design choice made by the expert
function captureDesignChoice(event) {
  if (!trainingData.recordingActive) return;
  
  const element = event.target;
  const choice = {
    timestamp: new Date().toISOString(),
    elementId: element.id,
    elementType: element.tagName,
    value: element.value,
    category: element.dataset.category || 'unknown',
    subcategory: element.dataset.subcategory || 'unknown'
  };
  
  trainingData.designChoices.push(choice);
  console.log('Design choice captured', choice);
}

// Add an annotation/explanation for a design decision
function addAnnotation() {
  if (!trainingData.recordingActive) return;
  
  const annotationText = document.getElementById('annotation-text').value;
  if (!annotationText.trim()) return;
  
  const annotation = {
    timestamp: new Date().toISOString(),
    text: annotationText,
    relatedToLastChoice: trainingData.designChoices.length > 0
  };
  
  trainingData.annotations.push(annotation);
  document.getElementById('annotation-text').value = '';
  
  // Add to UI
  const annotationsContainer = document.getElementById('annotations-list');
  const annotationEl = document.createElement('div');
  annotationEl.className = 'bg-blue-50 p-3 rounded mb-2';
  annotationEl.textContent = annotationText;
  annotationsContainer.appendChild(annotationEl);
  
  console.log('Annotation added', annotation);
}

// Get current artwork data
function getArtworkData() {
  // Collect all artwork-related form data
  const artworkForm = document.getElementById('artwork-form');
  if (!artworkForm) return {};
  
  const formData = new FormData(artworkForm);
  const data = {};
  
  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }
  
  // Get artwork preview if available
  const artworkPreview = document.getElementById('artwork-preview');
  if (artworkPreview && artworkPreview.src) {
    data.previewUrl = artworkPreview.src;
  }
  
  return data;
}

// Save training sessions to local storage
function saveTrainingSessions() {
  try {
    localStorage.setItem('framingTrainingSessions', JSON.stringify(trainingData.sessions));
    console.log('Training sessions saved to local storage');
  } catch (error) {
    console.error('Error saving training sessions:', error);
  }
}

// Load training sessions from local storage
function loadTrainingSessions() {
  try {
    const savedSessions = localStorage.getItem('framingTrainingSessions');
    if (savedSessions) {
      trainingData.sessions = JSON.parse(savedSessions);
      console.log('Loaded', trainingData.sessions.length, 'training sessions from local storage');
    }
  } catch (error) {
    console.error('Error loading training sessions:', error);
  }
}

// Upload a training session to the server
async function uploadTrainingSession(session) {
  try {
    const response = await fetch('/api/training-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(session)
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload training session');
    }
    
    console.log('Training session uploaded successfully');
  } catch (error) {
    console.error('Error uploading training session:', error);
    // Store for later retry
    storeFailedUpload(session);
  }
}

// Store failed uploads for retry
function storeFailedUpload(session) {
  try {
    let failedUploads = JSON.parse(localStorage.getItem('failedTrainingUploads') || '[]');
    failedUploads.push(session);
    localStorage.setItem('failedTrainingUploads', JSON.stringify(failedUploads));
  } catch (error) {
    console.error('Error storing failed upload:', error);
  }
}

// Update the training UI based on state
function updateTrainingUI(state) {
  const startBtn = document.getElementById('start-training');
  const stopBtn = document.getElementById('stop-training');
  const statusIndicator = document.getElementById('training-status');
  const annotationForm = document.getElementById('annotation-form');
  
  if (!startBtn || !stopBtn || !statusIndicator) return;
  
  switch(state) {
    case 'recording':
      startBtn.disabled = true;
      stopBtn.disabled = false;
      statusIndicator.textContent = 'Recording';
      statusIndicator.className = 'px-2 py-1 bg-red-500 text-white rounded-full text-xs';
      annotationForm?.classList.remove('hidden');
      break;
    case 'idle':
    default:
      startBtn.disabled = false;
      stopBtn.disabled = true;
      statusIndicator.textContent = 'Not Recording';
      statusIndicator.className = 'px-2 py-1 bg-gray-300 text-gray-700 rounded-full text-xs';
      annotationForm?.classList.add('hidden');
      break;
  }
}

// Show a notification to the user
function showNotification(message) {
  const notificationContainer = document.getElementById('notification-container');
  if (!notificationContainer) return;
  
  const notification = document.createElement('div');
  notification.className = 'bg-blue-500 text-white p-3 rounded shadow-lg mb-3 notification-item';
  notification.textContent = message;
  
  notificationContainer.appendChild(notification);
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 5000);
}

// Load saved data on page load
document.addEventListener('DOMContentLoaded', function() {
  loadTrainingSessions();
  initTrainingModule();
});

// Export functions for use in other modules
window.trainingModule = {
  start: startTrainingSession,
  end: endTrainingSession,
  addAnnotation: addAnnotation
};
