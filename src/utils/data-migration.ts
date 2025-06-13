import { supabase, tables } from '@/lib/supabase';

/**
 * Utility functions for migrating data from sessionStorage to Supabase
 */

interface TestDataExport {
  moodEntries?: any[];
  journalEntries?: any[];
  stressAssessments?: any[];
  resources?: any[];
  notifications?: any[];
}

/**
 * Export data from sessionStorage
 */
export function exportSessionStorageData(): TestDataExport {
  const data: TestDataExport = {};
  
  try {
    // Try to extract all test data from sessionStorage
    if (sessionStorage.getItem('test_mood_entries')) {
      data.moodEntries = JSON.parse(sessionStorage.getItem('test_mood_entries') || '[]');
    }
    
    if (sessionStorage.getItem('test_journal_entries')) {
      data.journalEntries = JSON.parse(sessionStorage.getItem('test_journal_entries') || '[]');
    }
    
    if (sessionStorage.getItem('test_stress_assessments')) {
      data.stressAssessments = JSON.parse(sessionStorage.getItem('test_stress_assessments') || '[]');
    }
    
    if (sessionStorage.getItem('test_resources')) {
      data.resources = JSON.parse(sessionStorage.getItem('test_resources') || '[]');
    }
    
    if (sessionStorage.getItem('test_notifications')) {
      data.notifications = JSON.parse(sessionStorage.getItem('test_notifications') || '[]');
    }
  } catch (error) {
    console.error('Error exporting data from sessionStorage:', error);
  }
  
  return data;
}

/**
 * Download exported data as a JSON file
 */
export function downloadExportedData(data: TestDataExport): void {
  try {
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileName = 'emotions_app_data_export.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
  } catch (error) {
    console.error('Error downloading exported data:', error);
  }
}

/**
 * Import data to Supabase
 */
export async function importDataToSupabase(
  data: TestDataExport, 
  userId: string,
  options?: { 
    onProgress?: (message: string) => void 
  }
): Promise<{ success: boolean; message: string }> {
  const { onProgress } = options || {};
  const log = (message: string) => {
    console.log(message);
    onProgress?.(message);
  };
  
  try {
    // Import mood entries
    if (data.moodEntries && data.moodEntries.length > 0) {
      log(`Importing ${data.moodEntries.length} mood entries...`);
      
      const moodEntries = data.moodEntries.map(entry => ({
        user_id: userId,
        mood: entry.mood,
        notes: entry.notes || null,
        tags: entry.tags || null,
        activities: entry.activities || null,
        created_at: entry.createdAt || entry.created_at || new Date().toISOString()
      }));
      
      // Insert in batches of 50
      for (let i = 0; i < moodEntries.length; i += 50) {
        const batch = moodEntries.slice(i, i + 50);
        const { error } = await supabase.from(tables.mood_entries).insert(batch);
        
        if (error) {
          console.error('Error importing mood entries batch:', error);
          log(`Error importing mood entries batch ${i/50 + 1}: ${error.message}`);
        } else {
          log(`Imported mood entries batch ${i/50 + 1} of ${Math.ceil(moodEntries.length/50)}`);
        }
      }
    }
    
    // Import journal entries
    if (data.journalEntries && data.journalEntries.length > 0) {
      log(`Importing ${data.journalEntries.length} journal entries...`);
      
      const journalEntries = data.journalEntries.map(entry => ({
        user_id: userId,
        title: entry.title,
        content: entry.content,
        tags: entry.tags || null,
        mood: entry.mood || null,
        is_private: entry.isPrivate === undefined ? true : entry.isPrivate,
        created_at: entry.createdAt || entry.created_at || new Date().toISOString(),
        updated_at: entry.updatedAt || entry.updated_at || new Date().toISOString()
      }));
      
      // Insert in batches of 50
      for (let i = 0; i < journalEntries.length; i += 50) {
        const batch = journalEntries.slice(i, i + 50);
        const { error } = await supabase.from(tables.journal_entries).insert(batch);
        
        if (error) {
          console.error('Error importing journal entries batch:', error);
          log(`Error importing journal entries batch ${i/50 + 1}: ${error.message}`);
        } else {
          log(`Imported journal entries batch ${i/50 + 1} of ${Math.ceil(journalEntries.length/50)}`);
        }
      }
    }
    
    // Import stress assessments
    if (data.stressAssessments && data.stressAssessments.length > 0) {
      log(`Importing ${data.stressAssessments.length} stress assessments...`);
      
      const stressAssessments = data.stressAssessments.map(assessment => ({
        user_id: userId,
        stress_level: assessment.stressLevel || assessment.stress_level || assessment.value,
        factors: assessment.factors || null,
        notes: assessment.notes || null,
        created_at: assessment.createdAt || assessment.created_at || new Date().toISOString()
      }));
      
      // Insert in batches of 50
      for (let i = 0; i < stressAssessments.length; i += 50) {
        const batch = stressAssessments.slice(i, i + 50);
        const { error } = await supabase.from(tables.stress_assessments).insert(batch);
        
        if (error) {
          console.error('Error importing stress assessments batch:', error);
          log(`Error importing stress assessments batch ${i/50 + 1}: ${error.message}`);
        } else {
          log(`Imported stress assessments batch ${i/50 + 1} of ${Math.ceil(stressAssessments.length/50)}`);
        }
      }
    }
    
    // Import notifications
    if (data.notifications && data.notifications.length > 0) {
      log(`Importing ${data.notifications.length} notifications...`);
      
      const notifications = data.notifications.map(notification => ({
        user_id: userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: notification.read || false,
        link: notification.link || null,
        created_at: notification.createdAt || notification.created_at || new Date().toISOString()
      }));
      
      // Insert in batches of 50
      for (let i = 0; i < notifications.length; i += 50) {
        const batch = notifications.slice(i, i + 50);
        const { error } = await supabase.from(tables.notifications).insert(batch);
        
        if (error) {
          console.error('Error importing notifications batch:', error);
          log(`Error importing notifications batch ${i/50 + 1}: ${error.message}`);
        } else {
          log(`Imported notifications batch ${i/50 + 1} of ${Math.ceil(notifications.length/50)}`);
        }
      }
    }
    
    // Import resources (if present and not already imported)
    if (data.resources && data.resources.length > 0) {
      log(`Importing ${data.resources.length} resources...`);
      
      // Check for existing resources to avoid duplicates
      const { data: existingResources } = await supabase
        .from(tables.resources)
        .select('title, url');
      
      const existingTitles = new Set(existingResources?.map(r => r.title.toLowerCase()) || []);
      const existingUrls = new Set(existingResources?.map(r => r.url.toLowerCase()) || []);
      
      const newResources = data.resources.filter(resource => 
        !existingTitles.has(resource.title.toLowerCase()) && 
        !existingUrls.has(resource.url.toLowerCase())
      );
      
      log(`Found ${newResources.length} new resources to import`);
      
      const resources = newResources.map(resource => ({
        title: resource.title,
        description: resource.description,
        url: resource.url,
        image_url: resource.imageUrl || resource.image_url || null,
        file_url: resource.fileUrl || resource.file_url || null,
        type: resource.type || null,
        category: resource.category,
        tags: resource.tags || null,
        created_by: resource.createdBy || resource.created_by || userId,
        created_at: resource.createdAt || resource.created_at || new Date().toISOString()
      }));
      
      // Insert in batches of 50
      for (let i = 0; i < resources.length; i += 50) {
        const batch = resources.slice(i, i + 50);
        const { error } = await supabase.from(tables.resources).insert(batch);
        
        if (error) {
          console.error('Error importing resources batch:', error);
          log(`Error importing resources batch ${i/50 + 1}: ${error.message}`);
        } else {
          log(`Imported resources batch ${i/50 + 1} of ${Math.ceil(resources.length/50)}`);
        }
      }
    }
    
    return { 
      success: true, 
      message: 'Data import completed successfully' 
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error importing data to Supabase:', error);
    return { 
      success: false, 
      message: `Error importing data: ${errorMessage}` 
    };
  }
}

/**
 * Check if we have data in sessionStorage to migrate
 */
export function hasMigratableData(): boolean {
  return Boolean(
    sessionStorage.getItem('test_mood_entries') ||
    sessionStorage.getItem('test_journal_entries') ||
    sessionStorage.getItem('test_stress_assessments') ||
    sessionStorage.getItem('test_resources') ||
    sessionStorage.getItem('test_notifications')
  );
}

/**
 * Clear session storage data after migration
 */
export function clearSessionStorageData(): void {
  try {
    sessionStorage.removeItem('test_mood_entries');
    sessionStorage.removeItem('test_journal_entries');
    sessionStorage.removeItem('test_stress_assessments');
    sessionStorage.removeItem('test_resources');
    sessionStorage.removeItem('test_notifications');
  } catch (error) {
    console.error('Error clearing sessionStorage data:', error);
  }
} 