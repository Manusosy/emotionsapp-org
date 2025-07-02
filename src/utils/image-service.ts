/**
 * Image Service Utility
 * 
 * Provides a reliable way to handle image uploads with multiple fallback options
 */

import { patientService } from '@/services';
import ensureStorageBucketsExist from './storage-setup';

// List of free image hosting APIs that don't require authentication
const FREE_IMAGE_HOSTS = [
  {
    name: 'ImgBB',
    uploadUrl: 'https://api.imgbb.com/1/upload',
    param: 'image',
    keyParam: 'key',
    // Get a free key at https://api.imgbb.com/
    apiKey: 'da2f5a91fb10eb8e12f1fdc248e08e30',
    responseParser: (data: any) => data?.data?.url || data?.data?.display_url
  },
  {
    name: 'Imgur',
    uploadUrl: 'https://api.imgur.com/3/image',
    param: 'image',
    headers: {
      'Authorization': 'Client-ID 546c25a59c58ad7'
    },
    responseParser: (data: any) => data?.data?.link
  }
];

/**
 * Uploads an image using the most reliable method available
 */
export async function uploadImage(file: File, userId: string): Promise<{
  success: boolean;
  url: string | null;
  error: string | null;
  source: 'supabase' | 'external' | null;
}> {
  // First try to use Supabase directly
  try {
    const result = await patientService.uploadProfileImage(userId, file);
    
    if (result.success && result.url) {
      return {
        ...result,
        source: 'supabase'
      };
    }
    
    // If Supabase fails, try external services immediately
    // Don't try to fix storage buckets as it causes RLS errors
    console.log('Supabase upload failed, trying external services...');
    return await uploadToExternalService(file);
    
  } catch (error: any) {
    console.error('Error in uploadImage:', error);
    
    // Try external service as fallback
    try {
      return await uploadToExternalService(file);
    } catch (externalError: any) {
      return {
        success: false,
        url: null,
        error: `All upload methods failed. Original error: ${error.message}, External error: ${externalError.message}`,
        source: null
      };
    }
  }
}

/**
 * Uploads an image to an external service as a fallback
 */
async function uploadToExternalService(file: File): Promise<{
  success: boolean;
  url: string | null;
  error: string | null;
  source: 'external' | null;
}> {
  // Convert file to base64 for upload
  const base64 = await fileToBase64(file);
  
  // Try each service until one works
  for (const service of FREE_IMAGE_HOSTS) {
    try {
      console.log(`Trying external image host: ${service.name}`);
      
      const formData = new FormData();
      
      // Add the image data
      if (service.param) {
        formData.append(service.param, base64.split(',')[1] || base64);
      }
      
      // Add API key if required
      if (service.keyParam && service.apiKey) {
        formData.append(service.keyParam, service.apiKey);
      }
      
      // Make the request
      const response = await fetch(service.uploadUrl, {
        method: 'POST',
        headers: service.headers,
        body: formData
      });
      
      if (!response.ok) {
        console.error(`${service.name} upload failed:`, await response.text());
        continue;
      }
      
      const data = await response.json();
      
      // Parse the response
      const imageUrl = service.responseParser(data);
      
      if (imageUrl) {
        console.log(`Successfully uploaded to ${service.name}:`, imageUrl);
        return {
          success: true,
          url: imageUrl,
          error: null,
          source: 'external'
        };
      }
    } catch (error) {
      console.error(`Error with ${service.name}:`, error);
      // Continue to next service
    }
  }
  
  return {
    success: false,
    url: null,
    error: 'All external image services failed',
    source: null
  };
}

/**
 * Converts a file to base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

export default uploadImage; 