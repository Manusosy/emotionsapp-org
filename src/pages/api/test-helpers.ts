import { moodMentorService } from '@/services';

export default async function handler(req, res) {
  // Handle different routes based on query parameters
  const { action } = req.query;
  
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Test helpers only available in development mode' });
  }
  
  try {
    if (action === 'reset-mentor-profile') {
      await moodMentorService.completeResetAndCreateTestProfile();
      return res.status(200).json({ 
        success: true, 
        message: 'Test mentor profile reset and created successfully'
      });
    }
    
    if (action === 'sync-mentor-profile') {
      await moodMentorService.syncTestMentorProfile();
      return res.status(200).json({ 
        success: true, 
        message: 'Test mentor profile synced successfully'
      });
    }
    
    // Default response if no valid action
    return res.status(400).json({ error: 'Invalid action parameter' });
  } catch (error) {
    console.error('Error in test helper API:', error);
    return res.status(500).json({ 
      error: 'An error occurred while processing the request',
      details: error.message 
    });
  }
} 