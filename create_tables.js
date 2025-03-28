
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
    const { error: apiKeysError } = await supabase.rpc('create_table_if_not_exists', { 
      table_name: 'api_keys',
      definition: `
        key_name text primary key,
        key_value text not null
      `
    });
    
    if (apiKeysError) {
      console.error('Failed to create api_keys table:', apiKeysError);
    } else {
      console.log('api_keys table created or already exists');
      
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
    }
    
    // Create device_events table
    const { error: deviceEventsError } = await supabase.rpc('create_table_if_not_exists', { 
      table_name: 'device_events',
      definition: `
        id serial primary key,
        event_type text not null,
        device_name text,
        timestamp timestamptz default now()
      `
    });
    
    if (deviceEventsError) {
      console.error('Failed to create device_events table:', deviceEventsError);
    } else {
      console.log('device_events table created or already exists');
    }
    
    // Create training_sessions table
    const { error: trainingSessionsError } = await supabase.rpc('create_table_if_not_exists', { 
      table_name: 'training_sessions',
      definition: `
        session_id text primary key,
        timestamp timestamptz,
        artwork_data jsonb,
        design_choices jsonb,
        annotations jsonb,
        recording_url text
      `
    });
    
    if (trainingSessionsError) {
      console.error('Failed to create training_sessions table:', trainingSessionsError);
    } else {
      console.log('training_sessions table created or already exists');
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
