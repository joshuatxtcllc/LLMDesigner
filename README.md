# Jay's Frames Expert - Replit Setup

This document provides instructions for setting up the Jay's Frames Expert project on Replit, a cloud-based development environment.

## Getting Started

### 1. Create a New Replit Project

1. Log in to your Replit account
2. Click "Create" to start a new Repl
3. Select "Node.js + React" as the template
4. Name your project "jays-frames-expert"
5. Click "Create Repl"

### 2. Project Structure

Once your Repl is created, set up the following project structure:

```
jays-frames-expert/
├── client/               
│   ├── public/           
│   │   ├── index.html    
│   │   ├── assets/       
│   │   └── favicon.ico   
│   └── src/              
│       ├── components/   
│       ├── pages/        
│       ├── services/     
│       ├── utils/        
│       ├── App.js        
│       └── index.js      
├── server/               
│   ├── controllers/      
│   ├── routes/           
│   ├── services/         
│   ├── models/           
│   ├── data/             
│   │   ├── frameStyles.json    
│   │   ├── matOptions.json     
│   │   └── systemPrompt.json   
│   └── server.js         
├── docs/                 
│   └── wireframes/       
├── .env                  
├── package.json          
└── README.md             
```

### 3. Environment Setup

Create a `.env` file in the root directory with:

```
OPENAI_API_KEY=your_openai_api_key
PORT=3000
NODE_ENV=development
```

### 4. Install Dependencies

In the Replit shell, run the following commands:

```bash
npm init -y
npm install express cors dotenv multer openai
npm install --save-dev nodemon
```

Update your `package.json` with the following scripts:

```json
"scripts": {
  "start": "node server/server.js",
  "dev": "nodemon server/server.js",
  "client": "cd client && npm start",
  "dev:all": "concurrently \"npm run dev\" \"npm run client\""
}
```

### 5. Configuring OpenAI Integration

1. You'll need an OpenAI API key with access to GPT-4 Vision
2. Add your API key to the `.env` file
3. The system is designed to use GPT-4 Vision to analyze artwork images

## Development Workflow

### Running the Application

1. Start the backend server:
   ```bash
   npm run dev
   ```

2. In a separate terminal, start the React frontend:
   ```bash
   npm run client
   ```

3. Your application should now be running in Replit

### Making Changes

1. Edit files in the Replit editor
2. The server will automatically restart when you make changes (thanks to nodemon)
3. The React development server will hot-reload frontend changes

### Testing API Endpoints

You can test the API endpoints using the Replit console or by making requests from your browser:

- `POST /api/analyze` - Upload an artwork image for analysis
- `POST /api/contact` - Submit contact form data

## Deployment

### GitHub Integration

1. Click the "Version Control" icon in the Replit sidebar
2. Connect your GitHub account
3. Create a new repository named "jays-frames-expert"
4. Push your code to GitHub

### Netlify Deployment

1. Log in to Netlify
2. Click "New site from Git"
3. Select your GitHub repository
4. Configure build settings:
   - Build command: `cd client && npm run build`
   - Publish directory: `client/build`
5. Add your environment variables
6. Deploy your site

## Troubleshooting

### Common Issues

- **API Key Issues**: Ensure your OpenAI API key is correctly set in the `.env` file and that it has access to GPT-4 Vision
- **Image Upload Errors**: Check that the uploads directory exists and has proper permissions
- **React Build Failures**: Make sure all dependencies are installed with `cd client && npm install`

### Getting Help

If you encounter issues with the Replit setup:

1. Check the Replit documentation
2. Search for your issue on Stack Overflow
3. Join the Replit community forums

## Next Steps

After setting up your project on Replit:

1. Upload and test with sample artwork images
2. Refine the OpenAI prompt for better analysis
3. Customize the UI to match your brand
4. Add analytics to track user engagement
