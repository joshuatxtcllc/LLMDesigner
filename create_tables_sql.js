
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
  try {
    console.log('Creating tables in Supabase...');
    
    // Create api_keys table
    const { error: apiKeysCheckError } = await supabase.from('api_keys').select('key_name').limit(1).maybeSingle();
    
    if (apiKeysCheckError && apiKeysCheckError.code === '42P01') {
      // Table doesn't exist, create it
      const { error: createApiKeysError } = await supabase.query(`
        CREATE TABLE IF NOT EXISTS api_keys (
          key_name TEXT PRIMARY KEY,
          key_value TEXT NOT NULL
        )
      `);
      
      if (createApiKeysError) {
        console.error('Failed to create api_keys table:', createApiKeysError);
      } else {
        console.log('api_keys table created successfully');
      }
    } else {
      console.log('api_keys table already exists');
    }
    
    // Insert OpenAI API key
    const { error: insertError } = await supabase
      .from('api_keys')
      .upsert([
        { key_name: 'openai', key_value: process.env.OPENAI_API_KEY || 'dummy-key' }
      ]);
      
    if (insertError) {
      console.error('Failed to insert OpenAI API key:', insertError);
    } else {
      console.log('OpenAI API key inserted or updated');
    }
    
    // Create device_events table
    const { error: deviceEventsCheckError } = await supabase.from('device_events').select('id').limit(1).maybeSingle();
    
    if (deviceEventsCheckError && deviceEventsCheckError.code === '42P01') {
      // Table doesn't exist, create it
      const { error: createDeviceEventsError } = await supabase.query(`
        CREATE TABLE IF NOT EXISTS device_events (
          id SERIAL PRIMARY KEY,
          event_type TEXT NOT NULL,
          device_name TEXT,
          timestamp TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      
      if (createDeviceEventsError) {
        console.error('Failed to create device_events table:', createDeviceEventsError);
      } else {
        console.log('device_events table created successfully');
      }
    } else {
      console.log('device_events table already exists');
    }
    
    // Create training_sessions table
    const { error: trainingSessionsCheckError } = await supabase.from('training_sessions').select('session_id').limit(1).maybeSingle();
    
    if (trainingSessionsCheckError && trainingSessionsCheckError.code === '42P01') {
      // Table doesn't exist, create it
      const { error: createTrainingSessionsError } = await supabase.query(`
        CREATE TABLE IF NOT EXISTS training_sessions (
          session_id TEXT PRIMARY KEY,
          timestamp TIMESTAMPTZ,
          artwork_data JSONB,
          design_choices JSONB,
          annotations JSONB,
          recording_url TEXT
        )
      `);
      
      if (createTrainingSessionsError) {
        console.error('Failed to create training_sessions table:', createTrainingSessionsError);
      } else {
        console.log('training_sessions table created successfully');
      }
    } else {
      console.log('training_sessions table already exists');
    }
    
    console.log('Table creation process completed');
  } catch (error) {
    console.error('Error creating tables:', error);
  }
}

// Execute the function
createTables()
  .then(() => {
    console.log('Setup completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Setup failed:', err);
    process.exit(1);
  });
