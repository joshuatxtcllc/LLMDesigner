
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
    const { error: apiKeysError } = await supabase.from('api_keys').select('key_name').limit(1);
    
    if (apiKeysError && apiKeysError.code === '42P01') {
      // Table doesn't exist, create it
      const { error: createError } = await supabase.query(`
        CREATE TABLE api_keys (
          key_name TEXT PRIMARY KEY,
          key_value TEXT NOT NULL
        )
      `);
      
      if (createError) {
        console.error('Failed to create api_keys table:', createError);
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
        { key_name: 'openai', key_value: process.env.OPENAI_API_KEY }
      ]);
      
    if (insertError) {
      console.error('Failed to insert OpenAI API key:', insertError);
    } else {
      console.log('OpenAI API key inserted or updated');
    }
    
    // Create device_events table
    const { error: deviceEventsError } = await supabase.from('device_events').select('id').limit(1);
    
    if (deviceEventsError && deviceEventsError.code === '42P01') {
      // Table doesn't exist, create it
      const { error: createError } = await supabase.query(`
        CREATE TABLE device_events (
          id SERIAL PRIMARY KEY,
          event_type TEXT NOT NULL,
          device_name TEXT,
          timestamp TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      
      if (createError) {
        console.error('Failed to create device_events table:', createError);
      } else {
        console.log('device_events table created successfully');
      }
    } else {
      console.log('device_events table already exists');
    }
    
    // Create training_sessions table
    const { error: trainingSessionsError } = await supabase.from('training_sessions').select('session_id').limit(1);
    
    if (trainingSessionsError && trainingSessionsError.code === '42P01') {
      // Table doesn't exist, create it
      const { error: createError } = await supabase.query(`
        CREATE TABLE training_sessions (
          session_id TEXT PRIMARY KEY,
          timestamp TIMESTAMPTZ,
          artwork_data JSONB,
          design_choices JSONB,
          annotations JSONB,
          recording_url TEXT
        )
      `);
      
      if (createError) {
        console.error('Failed to create training_sessions table:', createError);
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
