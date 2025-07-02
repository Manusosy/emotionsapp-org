import { supportGroupsService } from '@/services';

// Utility function to sync support group member counts
export async function syncSupportGroupCounts() {
  try {
    console.log('Syncing support group member counts...');
    const result = await supportGroupsService.syncGroupMemberCounts();
    
    console.log(`Sync completed:`);
    console.log(`- Groups updated: ${result.updated}`);
    console.log(`- Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.error('Sync errors:', result.errors);
    }
    
    return result;
  } catch (error) {
    console.error('Failed to sync support group counts:', error);
    throw error;
  }
}

// Auto-run if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment - export for manual use
  (window as any).syncSupportGroupCounts = syncSupportGroupCounts;
  console.log('Support group sync function available as window.syncSupportGroupCounts()');
} 