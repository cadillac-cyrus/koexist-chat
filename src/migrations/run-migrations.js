import { migrateChatActions } from './chat-actions';

export async function runMigrations() {
  console.log('Starting migrations...');
  
  try {
    await migrateChatActions();
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
  }
}
