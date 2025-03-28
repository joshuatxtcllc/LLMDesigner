
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  try {
    console.log('Setting up database tables...');
    
    // Test if api_keys table exists by trying to select from it
    const { data: apiKeysTest, error: apiKeysError } = await supabase
      .from('api_keys')
      .select('key_name')
      .limit(1);
      
    // If api_keys doesn't exist or another error, we'll insert the OpenAI key anyway
    // Supabase will create the table if it doesn't exist
    const { error: insertError } = await supabase
      .from('api_keys')
      .upsert([
        { key_name: 'openai', key_value: process.env.OPENAI_API_KEY }
      ]);
      
    if (insertError) {
      console.error('Error with api_keys table:', insertError);
    } else {
      console.log('API key stored successfully');
    }
    
    // Insert a test record into device_events
    const { error: deviceEventError } = await supabase
      .from('device_events')
      .insert([
        { 
          event_type: 'test',
          device_name: 'setup script',
          timestamp: new Date().toISOString()
        }
      ]);
      
    if (deviceEventError) {
      console.error('Error with device_events table:', deviceEventError);
    } else {
      console.log('device_events table is ready');
    }
    
    // Insert a test record into training_sessions
    const { error: trainingSessionError } = await supabase
      .from('training_sessions')
      .insert([
        { 
          session_id: 'test-' + Date.now(),
          timestamp: new Date().toISOString(),
          artwork_data: { test: true },
          design_choices: { test: true },
          annotations: [{ text: 'Test annotation' }],
          recording_url: 'test-url'
        }
      ]);
      
    if (trainingSessionError) {
      console.error('Error with training_sessions table:', trainingSessionError);
    } else {
      console.log('training_sessions table is ready');
    }
    
    console.log('Database setup completed');
  } catch (error) {
    console.error('Database setup failed:', error);
  }
}

// Execute the function
setupDatabase()
  .then(() => {
    console.log('Setup completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Setup failed:', err);
    process.exit(1);
  });
