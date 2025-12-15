
import { createClient } from '@supabase/supabase-js';
import { CloudSyncConfig } from '../types';

let supabaseClient: ReturnType<typeof createClient> | null = null;

// Initialize Supabase Client dynamically based on settings
export const getSupabaseClient = (config?: CloudSyncConfig) => {
    // If client already exists and no new config is passed, return it.
    if (supabaseClient && !config) return supabaseClient;

    // If config is passed, check if we need to re-initialize
    if (config?.provider === 'supabase' && config.supabaseUrl && config.supabaseKey) {
        // If client doesn't exist OR url/key changed
        if (!supabaseClient) {
             supabaseClient = createClient(config.supabaseUrl, config.supabaseKey);
        }
    }
    
    return supabaseClient;
};

// Helper to check if supabase is configured
export const isSupabaseConfigured = () => {
    return !!supabaseClient;
};
