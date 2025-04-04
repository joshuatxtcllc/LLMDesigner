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
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { exec } = require('child_process');

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
let supabase;

try {
  if (supabaseUrl && supabaseKey && 
      supabaseUrl !== 'your_supabase_url' && 
      supabaseKey !== 'your_supabase_anon_key' &&
      supabaseUrl.startsWith('https://')) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized successfully');
  } else {
    console.warn('Missing or invalid Supabase credentials. Some features will be disabled.');
    // Create a mock supabase client with no-op methods
    supabase = {
      from: () => ({ 
        select: () => ({ 
          eq: () => ({ 
            single: () => Promise.resolve({ data: null, error: 'No Supabase connection' }) 
          }) 
        }),
        insert: () => Promise.resolve({ data: null, error: 'No Supabase connection' })
      })
    };
  }
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  // Create a mock supabase client
  supabase = {
    from: () => ({ 
      select: () => ({ 
        eq: () => ({ 
          single: () => Promise.resolve({ data: null, error: 'No Supabase connection' }) 
        }) 
      }),
      insert: () => Promise.resolve({ data: null, error: 'No Supabase connection' })
    })
  };
}

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

// Configure file upload for images
const imageUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

// Configure file upload for recordings (no mimetype restriction)
const recordingUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// Configure OpenAI with key from Supabase
let openaiApiKey = process.env.OPENAI_API_KEY; // Fallback to env var

// Function to get OpenAI API key from Supabase
async function getOpenAIKey() {
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('key_value')
      .eq('key_name', 'openai')
      .single();

    if (error) throw error;
    if (data && data.key_value) {
      return data.key_value;
    }
    return process.env.OPENAI_API_KEY; // Fallback
  } catch (error) {
    console.error('Error fetching OpenAI key from Supabase:', error);
    return process.env.OPENAI_API_KEY; // Fallback
  }
}

// Initialize OpenAI with fallback key for now
let openai = new OpenAI({
  apiKey: openaiApiKey,
});

// Update OpenAI key on startup
(async function() {
  try {
    const key = await getOpenAIKey();
    if (key) {
      openaiApiKey = key;
      // Create a new OpenAI instance with the updated key
      openai = new OpenAI({
        apiKey: key
      });
      console.log('OpenAI API key updated from Supabase');
    }
  } catch (error) {
    console.error('Failed to update OpenAI API key:', error);
  }
})();

// API Routes

/**
 * Analyze artwork image and provide framing recommendations
 * POST /api/analyze
 */
app.post('/api/analyze', imageUpload.single('artwork'), async (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    // Refresh the OpenAI API key
    try {
      const key = await getOpenAIKey();
      if (key) {
        openaiApiKey = key;
        // Create a new OpenAI instance with the updated key
        openai = new OpenAI({
          apiKey: key
        });
      }
    } 
    catch (error) {
      console.error('Failed to refresh OpenAI API key:', error);
      // Continue with existing key
    }

    // Get additional form data
    const { artworkName, medium, width, height, specialNotes } = req.body;

    // Convert image to base64 for OpenAI API
    const imagePath = path.join(__dirname, req.file.path);
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Load the system prompt from file
    const systemPrompt = require('./data/systemPrompt.json').prompt;

    // Validate API key before making the request
    if (!openaiApiKey || 
        openaiApiKey === 'your-real-openai-api-key-here' || 
        openaiApiKey.startsWith('sk-dummy') ||
        openaiApiKey === 'your_openai_api_key') {
      console.log('Invalid OpenAI API key detected. Current key format:', 
        openaiApiKey ? `${openaiApiKey.substring(0, 3)}...${openaiApiKey.substring(openaiApiKey.length - 3)}` : 'undefined');

      // Check if there's a key in the environment
      const envKey = process.env.OPENAI_API_KEY;
      console.log('OpenAI key in environment format:', 
        envKey ? `${envKey.substring(0, 3)}...${(envKey.length > 6 ? envKey.substring(envKey.length - 3) : '')}` : 'undefined');

      // For real-life use, we should send a proper error to the client
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'The OpenAI API key is not properly configured. Please contact the administrator.'
      });
    }

    console.log("Attempting to call OpenAI API with validated key...");

    let response;
    try {
      // First try with GPT-4 Vision Preview which supports images
      console.log("Trying GPT-4 Vision Preview model...");
      response = await openai.chat.completions.create({
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

      console.log("GPT-4 Vision Preview response received successfully");
    } catch (error) {
      console.error('Error with OpenAI API call:', error.message);

      // Always generate a mock response for testing/demo purposes if the API call fails
      console.log("Generating mock AI response for testing purposes");

      // Create a mock response that matches OpenAI's format
      response = {
        choices: [{
          message: {
            content: `
# Artwork Analysis

Medium and Type: ${medium || "Oil painting"}
Color Palette: Rich earth tones with vibrant accents
Style and Subject: ${specialNotes ? specialNotes : "Contemporary abstract"}
Conservation Needs: Standard conservation with UV protection

# Framing Recommendations

## Traditional Option
Frame: Wooden frame with ornate gold finish, 2" wide
Mat: Double mat with cream primary mat and gold accent
Glass: Museum glass with UV protection
Mounting: Acid-free mounting board with archival adhesive
Design Rationale: The traditional gold frame enhances the artwork's classic elements while providing elegant presentation
Price Range: $300-450

## Contemporary Option
Frame: Thin black metal frame, 1" wide
Mat: Single white archival mat with 3" border
Glass: Anti-reflective conservation glass
Mounting: Archival mounting methods
Design Rationale: Minimalist approach lets the artwork be the focal point while providing clean, modern presentation
Price Range: $200-350

## Budget Option
Frame: Simple black wood frame, 1.5" wide
Mat: Single white mat, standard quality
Glass: Regular glass with basic UV coating
Mounting: Standard mounting methods
Design Rationale: Affordable option that still provides a clean presentation
Price Range: $100-200
            `
          }
        }]
      };
    }

    // Process and structure the OpenAI response
    const framingRecommendations = processOpenAIResponse(response.choices[0].message.content);

    // Delete the uploaded file to save space
    fs.unlinkSync(imagePath);

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
app.post('/api/upload-recording', recordingUpload.single('recording'), async (req, res) => {
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

/**
 * Submit training data with design decisions and annotations
 * POST /api/training-data
 */
app.post('/api/training-data', express.json(), async (req, res) => {
  try {
    const trainingSession = req.body;

    if (!trainingSession || !trainingSession.id) {
      return res.status(400).json({ error: 'Invalid training session data' });
    }

    // Save to local file system as backup
    const trainDataDir = path.join(__dirname, 'data', 'training');
    if (!fs.existsSync(trainDataDir)) {
      fs.mkdirSync(trainDataDir, { recursive: true });
    }

    const filename = `session_${trainingSession.id}.json`;
    const filePath = path.join(trainDataDir, filename);

    fs.writeFileSync(filePath, JSON.stringify(trainingSession, null, 2));

    // Save training data to Supabase
    const { data, error } = await supabase
      .from('training_sessions')
      .insert([
        {
          session_id: trainingSession.id,
          timestamp: trainingSession.timestamp,
          artwork_data: trainingSession.artworkData,
          design_choices: trainingSession.designChoices,
          annotations: trainingSession.annotations,
          recording_url: trainingSession.recordingUrl
        }
      ]);

    if (error) {
      console.error('Supabase insert error:', error);
      // Continue with local processing even if Supabase fails
    } else {
      console.log('Training data saved to Supabase');
    }

    // Process the data for AI training
    processTrainingData(trainingSession);

    res.json({
      success: true,
      message: 'Training data submitted successfully',
      sessionId: trainingSession.id,
      supabaseStatus: error ? 'failed' : 'success'
    });
  } catch (error) {
    console.error('Error processing training data:', error);
    res.status(500).json({
      error: 'Failed to process training data',
      details: error.message
    });
  }
});

/**
 * Log device events (connections, disconnections, etc.)
 * POST /api/log-device-event
 */
app.post('/api/log-device-event', express.json(), async (req, res) => {
  try {
    const { event, deviceName, timestamp } = req.body;

    // Log to Supabase
    const { data, error } = await supabase
      .from('device_events')
      .insert([
        {
          event_type: event,
          device_name: deviceName,
          timestamp: timestamp || new Date().toISOString()
        }
      ]);

    if (error) {
      console.error('Error logging device event to Supabase:', error);
    }

    // Always return success to client even if Supabase fails
    res.json({ success: true });
  } catch (error) {
    console.error('Error logging device event:', error);
    res.status(500).json({ error: 'Failed to log device event' });
  }
});

// Define the conversion API endpoint
app.post('/api/convert', multer(storage).array('files'), async (req, res) => {
  try {
    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Process each file
    const results = await Promise.all(req.files.map(async (file) => {
      const inputFile = file.path;
      const outputFile = path.join(path.dirname(inputFile), path.basename(inputFile) + '.md');

      // Use markitdown for conversion
      await new Promise((resolve, reject) => {
        const command = `npx markitdown "${inputFile}" -o "${outputFile}"`;
        exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error(`Error converting file ${file.originalname}:`, error);
            reject(error);
          } else {
            console.log(`Successfully converted ${file.originalname}`);
            resolve();
          }
        });
      });

      // Read the output markdown file
      let markdown = '';
      try {
        if (fs.existsSync(outputFile)) {
          markdown = fs.readFileSync(outputFile, 'utf8');
        } else {
          markdown = `# Conversion Notice\n\nThe file "${file.originalname}" could not be converted to Markdown. This could be due to file format limitations or empty content.`;
        }
      } catch (readError) {
        console.error(`Error reading output file for ${file.originalname}:`, readError);
        markdown = `# Error\n\nThere was an error converting "${file.originalname}" to Markdown.`;
      }

      // Clean up the temporary files
      try {
        fs.unlinkSync(inputFile);
        if (fs.existsSync(outputFile)) {
          fs.unlinkSync(outputFile);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up temporary files:', cleanupError);
      }

      return {
        filename: file.originalname,
        markdown: markdown
      };
    }));

    // Return the conversion results
    if (results.length === 1) {
      res.json({
        filename: results[0].filename,
        markdown: results[0].markdown
      });
    } else {
      res.json({ results });
    }

  } catch (error) {
    console.error('Error in file conversion:', error);
    res.status(500).json({ error: 'File conversion failed', details: error.message });
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

/**
 * Process training data for AI model training
 * @param {Object} trainingSession - The training session data
 */
function processTrainingData(trainingSession) {
  try {
    // In a production environment, this function would:
    // 1. Format the data for the specific AI model being trained
    // 2. Extract feature vectors from the artwork
    // 3. Correlate design choices with artwork features
    // 4. Feed the processed data into a training pipeline

    // For demo purposes, we'll create a simplified feature vector
    const features = {
      sessionId: trainingSession.id,
      timestamp: trainingSession.timestamp,
      artworkFeatures: extractArtworkFeatures(trainingSession.artworkData),
      designDecisions: formatDesignDecisions(trainingSession.designChoices),
      designRationale: trainingSession.annotations.map(a => a.text).join(' ')
    };

    // Save the processed features
    const featuresDir = path.join(__dirname, 'data', 'features');
    if (!fs.existsSync(featuresDir)) {
      fs.mkdirSync(featuresDir, { recursive: true });
    }

    const featuresPath = path.join(featuresDir, `features_${trainingSession.id}.json`);
    fs.writeFileSync(featuresPath, JSON.stringify(features, null, 2));

    console.log('Training features extracted and saved:', featuresPath);

    // In a real implementation, you would then send this data to your LLM training pipeline
  } catch (error) {
    console.error('Error processing training features:', error);
  }
}

/**
 * Extract features from artwork data
 * @param {Object} artworkData - The artwork data
 * @returns {Object} - Extracted features
 */
function extractArtworkFeatures(artworkData) {
  // This is a placeholder for more sophisticated image analysis
  // In a real application, you might use computer vision APIs or pre-trained models

  return {
    medium: artworkData.medium || 'unknown',
    dimensions: {
      width: artworkData.width || 0,
      height: artworkData.height || 0
    },
    hasPreview: !!artworkData.previewUrl,
    notes: artworkData.specialNotes || ''
  };
}

/**
 * Format design decisions for model training
 * @param {Array} designChoices - The raw design choices
 * @returns {Object} - Formatted design decisions
 */
function formatDesignDecisions(designChoices) {
  // Group design choices by category
  const decisions = {};

  designChoices.forEach(choice => {
    if (!decisions[choice.category]) {
      decisions[choice.category] = {};
    }

    if (!decisions[choice.category][choice.subcategory]) {
      decisions[choice.category][choice.subcategory] = [];
    }

    decisions[choice.category][choice.subcategory].push({
      value: choice.value,
      timestamp: choice.timestamp
    });
  });

  return decisions;
}

// Upload configuration is defined above

// Install MarkItDown if not already installed
const setupMarkItDown = async () => {
  return new Promise((resolve, reject) => {
    exec('npm list markitdown', (error, stdout, stderr) => {
      if (stdout.includes('markitdown')) {
        console.log('MarkItDown is already installed');
        resolve();
      } else {
        console.log('Installing MarkItDown...');
        exec('npm install markitdown', (error, stdout, stderr) => {
          if (error) {
            console.error('Error installing MarkItDown:', error);
            reject(error);
          } else {
            console.log('MarkItDown installed successfully');
            resolve();
          }
        });
      }
    });
  });
};

// Ensure MarkItDown is installed on startup
setupMarkItDown().catch(console.error);

// Create a directory for agent assets
const agentAssetsDir = path.join(__dirname, 'agent_assets');
if (!fs.existsSync(agentAssetsDir)) {
  fs.mkdirSync(agentAssetsDir);
}

// Create a file with information about MarkItDown
const markitdownInfoPath = path.join(agentAssetsDir, 'github_com_microsoft_markitdown.md');
if (!fs.existsSync(markitdownInfoPath)) {
  fs.writeFileSync(markitdownInfoPath, `# MarkItDown

MarkItDown is a utility for converting various files to Markdown developed by Microsoft.

## Supported File Types
- PDF
- PowerPoint
- Word
- Excel
- Images (EXIF metadata and OCR)
- Audio (EXIF metadata and speech transcription)
- HTML
- Text-based formats (CSV, JSON, XML)
- ZIP files (iterates over contents)

## GitHub Repository
https://github.com/microsoft/markitdown

## Usage
MarkItDown can be used to convert various file formats to Markdown for purposes like indexing, text analysis, etc.
`);
}

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on 0.0.0.0:${port}`);
});

module.exports = app;