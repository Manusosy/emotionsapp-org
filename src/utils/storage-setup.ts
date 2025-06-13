/**
 * Storage Setup Utility
 * 
 * This utility helps ensure the required storage buckets exist in Supabase
 * It can be run during application bootstrap to create any missing buckets
 */

import { supabase } from '@/lib/supabase';

const REQUIRED_BUCKETS = [
  {
    name: 'avatars',
    public: true,
    fileSizeLimit: 2 * 1024 * 1024, // 2MB
  },
  {
    name: 'profile-images',
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
  },
  {
    name: 'public',
    public: true,
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
  }
];

export async function ensureStorageBucketsExist(): Promise<{
  success: boolean;
  createdBuckets: string[];
  existingBuckets: string[];
  errors: Record<string, string>;
}> {
  // Return value
  const result = {
    success: false,
    createdBuckets: [] as string[],
    existingBuckets: [] as string[],
    errors: {} as Record<string, string>
  };
  
  try {
    // Get list of existing buckets
    const { data: bucketList, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing storage buckets:', listError);
      result.errors['list'] = listError.message;
      return result;
    }
    
    // Get the names of existing buckets
    const existingBucketNames = bucketList?.map(b => b.name) || [];
    result.existingBuckets = [...existingBucketNames];
    
    // Check which buckets need to be created
    const bucketsToCreate = REQUIRED_BUCKETS.filter(
      bucket => !existingBucketNames.includes(bucket.name)
    );
    
    if (bucketsToCreate.length === 0) {
      console.log('All required storage buckets already exist');
      result.success = true;
      return result;
    }
    
    // Create missing buckets
    const creationPromises = bucketsToCreate.map(async bucket => {
      try {
        const { error } = await supabase.storage.createBucket(bucket.name, {
          public: bucket.public,
          fileSizeLimit: bucket.fileSizeLimit
        });
        
        if (error) {
          console.error(`Error creating bucket ${bucket.name}:`, error);
          result.errors[bucket.name] = error.message;
          return false;
        }
        
        console.log(`Successfully created bucket: ${bucket.name}`);
        result.createdBuckets.push(bucket.name);
        return true;
      } catch (error: any) {
        console.error(`Error creating bucket ${bucket.name}:`, error);
        result.errors[bucket.name] = error.message || 'Unknown error';
        return false;
      }
    });
    
    // Wait for all bucket creation attempts to complete
    const results = await Promise.all(creationPromises);
    
    // If any bucket creation failed, the overall operation is not fully successful
    result.success = results.every(success => success) && bucketsToCreate.length > 0;
    
    return result;
  } catch (error: any) {
    console.error('Error in storage bucket setup:', error);
    result.errors['general'] = error.message || 'Unknown error in storage setup';
    return result;
  }
}

export default ensureStorageBucketsExist; 