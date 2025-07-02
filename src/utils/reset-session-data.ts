import { supportGroupsService } from '@/services';

// Utility function to reset all session and engagement data
export async function resetAllSessionData() {
  try {
    console.log('🔄 Resetting all session and engagement data...');
    
    const result = await supportGroupsService.resetAllSessionData();
    
    if (result.success) {
      console.log('✅ Success:', result.message);
      
      // Also sync member counts to ensure accuracy
      console.log('🔄 Syncing member counts...');
      const syncResult = await supportGroupsService.syncGroupMemberCounts();
      console.log(`✅ Sync completed: ${syncResult.updated} groups updated`);
      
      if (syncResult.errors.length > 0) {
        console.warn('⚠️ Sync warnings:', syncResult.errors);
      }
      
      return { success: true, message: 'All session data reset successfully!' };
    } else {
      console.error('❌ Error:', result.message);
      return result;
    }
  } catch (error) {
    console.error('❌ Failed to reset session data:', error);
    return { 
      success: false, 
      message: `Failed to reset session data: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

// Make it available globally for browser console testing
if (typeof window !== 'undefined') {
  (window as any).resetAllSessionData = resetAllSessionData;
}

// Auto-run if this file is executed directly in Node.js
if (typeof require !== 'undefined' && require.main === module) {
  resetAllSessionData().then(result => {
    console.log('Final result:', result);
    process.exit(result.success ? 0 : 1);
  });
} 