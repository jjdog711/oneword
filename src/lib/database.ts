// Database validation and health check utilities
import { supabase } from '@/services/supabase';
import { logger } from './logger';
import { AppError, ErrorCodes } from './errors';

export interface DatabaseHealth {
  isHealthy: boolean;
  tables: {
    profiles: boolean;
    connections: boolean;
    words: boolean;
    friend_requests: boolean;
    notifications: boolean;
    journal_entries: boolean;
    settings: boolean;
  };
  indexes: {
    words_receiver_date: boolean;
    words_sender_date: boolean;
    connections_canonical: boolean;
  };
  errors: string[];
}

export const checkDatabaseHealth = async (): Promise<DatabaseHealth> => {
  const health: DatabaseHealth = {
    isHealthy: true,
    tables: {
      profiles: false,
      connections: false,
      words: false,
      friend_requests: false,
      notifications: false,
      journal_entries: false,
      settings: false,
    },
    indexes: {
      words_receiver_date: false,
      words_sender_date: false,
      connections_canonical: false,
    },
    errors: [],
  };

  try {
    // Check if tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .in('table_name', ['profiles', 'connections', 'words', 'friend_requests', 'notifications', 'journal_entries', 'settings']);

    if (tablesError) {
      logger.error('Failed to check tables', { error: tablesError });
      health.errors.push(`Failed to check tables: ${tablesError.message}`);
      health.isHealthy = false;
    } else {
      const tableNames = tables?.map(t => t.table_name) || [];
      health.tables.profiles = tableNames.includes('profiles');
      health.tables.connections = tableNames.includes('connections');
      health.tables.words = tableNames.includes('words');
      health.tables.friend_requests = tableNames.includes('friend_requests');
      health.tables.notifications = tableNames.includes('notifications');
      health.tables.journal_entries = tableNames.includes('journal_entries');
      health.tables.settings = tableNames.includes('settings');
    }

    // Check if indexes exist (simplified check)
    try {
      const { data: indexes, error: indexesError } = await supabase
        .from('pg_indexes')
        .select('indexname')
        .in('indexname', ['words_receiver_date_idx', 'words_sender_date_idx', 'connections_canonical_idx', 'profiles_username_idx', 'profiles_visibility_idx']);

      if (!indexesError && indexes) {
        const indexNames = indexes.map(i => i.indexname);
        health.indexes.words_receiver_date = indexNames.includes('words_receiver_date_idx');
        health.indexes.words_sender_date = indexNames.includes('words_sender_date_idx');
        health.indexes.connections_canonical = indexNames.includes('connections_canonical_idx');
      }
    } catch (indexError) {
      logger.warn('Could not check indexes', { error: indexError });
      // Index check is not critical, so we don't fail the health check
    }

    // Check if any required tables are missing
    const missingTables = Object.entries(health.tables)
      .filter(([_, exists]) => !exists)
      .map(([name, _]) => name);

    if (missingTables.length > 0) {
      health.isHealthy = false;
      health.errors.push(`Missing tables: ${missingTables.join(', ')}`);
    }

    logger.info('Database health check completed', { health });
    return health;

  } catch (error) {
    logger.error('Database health check failed', { error });
    health.isHealthy = false;
    health.errors.push(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return health;
  }
};

export const validateDatabaseSchema = async (): Promise<void> => {
  const health = await checkDatabaseHealth();
  
  if (!health.isHealthy) {
    const errorMessage = `Database schema validation failed:\n${health.errors.join('\n')}`;
    logger.error('Database schema validation failed', { health });
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      'Database schema validation failed',
      'The database is not properly configured. Please contact support.',
      false
    );
  }
};

export const getDatabaseStatus = async (): Promise<string> => {
  try {
    const health = await checkDatabaseHealth();
    
    if (health.isHealthy) {
      return '✅ Database is healthy and properly configured';
    } else {
      return `❌ Database issues found:\n${health.errors.join('\n')}`;
    }
  } catch (error) {
    return `❌ Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};
