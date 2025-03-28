/**
 * Jay's Frames Expert - Server
 * 
 * Express.js server that handles API requests from the frontend,
 * including artwork analysis and framing recommendations.
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const dotenv = require('dotenv');
const OpenAI = require('openai');

// Load environment variables
dotenv.config();

// Set up Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'client/build')));

// Ensure uploads directory exists
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}
if (!fs.existsSync('uploads/recordings')) {
  fs.mkdirSync('uploads/recordings');
}

// Configure file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use different directories based on file type
    if (file.fieldname === 'recording') {
      cb(null, 'uploads/recordings/');
    } else {
      cb(null, 'uploads/');
    }
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

// Configure OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// API Routes

/**
 * Analyze artwork image and provide framing recommendations
 * POST /api/analyze
 */
app.post('/api/analyze', upload.single('artwork'), async (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    // Get additional form data
    const { artworkName, medium, width, height, specialNotes } = req.body;

    // Convert image to base64 for OpenAI API
    const imagePath = path.join(__dirname, req.file.path);
    const imageBuffer = require('fs').readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Load the system prompt from file
    const systemPrompt = require('./data/systemPrompt.json').prompt;

    // Call OpenAI API for artwork analysis and recommendations
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Please analyze this artwork ${artworkName ? `titled "${artworkName}"` : ''} and provide framing recommendations. ${
                medium ? `The medium is ${medium}.` : ''
              } ${
                width && height ? `The dimensions are ${width}" x ${height}".` : ''
              } ${
                specialNotes ? `Additional notes: ${specialNotes}` : ''
              }`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/${req.file.mimetype.split('/')[1]};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1500
    });

    // Process and structure the OpenAI response
    const framingRecommendations = processOpenAIResponse(response.choices[0].message.content);

    // Delete the uploaded file to save space
    require('fs').unlinkSync(imagePath);

    // Return the framing recommendations
    res.json(framingRecommendations);
  } catch (error) {
    console.error('Error analyzing artwork:', error);
    res.status(500).json({ 
      error: 'Failed to analyze artwork', 
      details: error.message 
    });
  }
});

/**
 * Submit contact form
 * POST /api/contact
 */
app.post('/api/contact', express.json(), async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    
    // In a production app, you would send this to your email service or CRM
    // For demo purposes, we'll just log it and return success
    console.log('Contact form submission:', { name, email, phone, message });
    
    res.json({ success: true, message: 'Contact form submitted successfully' });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({ 
      error: 'Failed to submit contact form', 
      details: error.message 
    });
  }
});

/**
 * Upload recording of design process
 * POST /api/upload-recording
 */
app.post('/api/upload-recording', upload.single('recording'), async (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ error: 'No recording uploaded' });
    }

    // Get the uploaded file path
    const recordingPath = path.join(__dirname, req.file.path);
    
    // In a production environment, you would:
    // 1. Store the recording metadata in a database
    // 2. Process it for AI training
    // 3. Potentially move it to cloud storage
    
    console.log('Recording received:', req.file.filename);
    
    // Return success response with recording details
    res.json({ 
      success: true, 
      message: 'Recording uploaded successfully',
      recording: {
        filename: req.file.filename,
        size: req.file.size,
        path: req.file.path
      }
    });
  } catch (error) {
    console.error('Error uploading recording:', error);
    res.status(500).json({ 
      error: 'Failed to upload recording', 
      details: error.message 
    });
  }
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build/index.html'));
  });
}

// Helper functions

/**
 * Process and structure the OpenAI API response
 * @param {string} responseText - The raw text response from OpenAI
 * @returns {Object} Structured framing recommendations
 */
function processOpenAIResponse(responseText) {
  // This function would parse the response text and extract structured data
  // For a real implementation, you would use regex or other parsing methods
  // to extract specific sections of the response
  
  // For demo purposes, we'll return a simplified structure
  return {
    analysis: {
      medium: extractSection(responseText, 'Medium and Type'),
      colors: extractSection(responseText, 'Color Palette'),
      style: extractSection(responseText, 'Style and Subject'),
      conservation: extractSection(responseText, 'Conservation Needs')
    },
    recommendations: {
      traditional: {
        frame: extractRecommendationDetail(responseText, 'Traditional', 'Frame'),
        mat: extractRecommendationDetail(responseText, 'Traditional', 'Mat'),
        glass: extractRecommendationDetail(responseText, 'Traditional', 'Glass'),
        mounting: extractRecommendationDetail(responseText, 'Traditional', 'Mounting'),
        rationale: extractRecommendationDetail(responseText, 'Traditional', 'Design Rationale'),
        priceRange: extractRecommendationDetail(responseText, 'Traditional', 'Price Range')
      },
      contemporary: {
        frame: extractRecommendationDetail(responseText, 'Contemporary', 'Frame'),
        mat: extractRecommendationDetail(responseText, 'Contemporary', 'Mat'),
        glass: extractRecommendationDetail(responseText, 'Contemporary', 'Glass'),
        mounting: extractRecommendationDetail(responseText, 'Contemporary', 'Mounting'),
        rationale: extractRecommendationDetail(responseText, 'Contemporary', 'Design Rationale'),
        priceRange: extractRecommendationDetail(responseText, 'Contemporary', 'Price Range')
      },
      budget: {
        frame: extractRecommendationDetail(responseText, 'Budget', 'Frame'),
        mat: extractRecommendationDetail(responseText, 'Budget', 'Mat'),
        glass: extractRecommendationDetail(responseText, 'Budget', 'Glass'),
        mounting: extractRecommendationDetail(responseText, 'Budget', 'Mounting'),
        rationale: extractRecommendationDetail(responseText, 'Budget', 'Design Rationale'),
        priceRange: extractRecommendationDetail(responseText, 'Budget', 'Price Range')
      }
    },
    rawResponse: responseText
  };
}

/**
 * Extract a specific section from the OpenAI response
 * @param {string} text - Full response text
 * @param {string} sectionName - Name of the section to extract
 * @returns {string} Extracted section text
 */
function extractSection(text, sectionName) {
  try {
    const regex = new RegExp(`${sectionName}:\\s*([^\\n]+)(?:\\n|$)`);
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  } catch (error) {
    console.error(`Error extracting section ${sectionName}:`, error);
    return '';
  }
}

/**
 * Extract recommendation details from the OpenAI response
 * @param {string} text - Full response text
 * @param {string} optionType - The type of recommendation (Traditional, Contemporary, Budget)
 * @param {string} detailType - The specific detail to extract (Frame, Mat, etc.)
 * @returns {string} Extracted detail text
 */
function extractRecommendationDetail(text, optionType, detailType) {
  try {
    // Find the section for this option type
    const optionRegex = new RegExp(`${optionType}\\s*Option[^]*?${detailType}:\\s*([^\\n]+)(?:\\n|$)`);
    const match = text.match(optionRegex);
    return match ? match[1].trim() : '';
  } catch (error) {
    console.error(`Error extracting ${detailType} for ${optionType} option:`, error);
    return '';
  }
}

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;
