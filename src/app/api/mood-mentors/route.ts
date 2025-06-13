import { NextRequest, NextResponse } from 'next/server';
import { moodMentorService } from '@/services';

export async function GET(request: NextRequest) {
  // Get the path from the request URL
  const path = request.nextUrl.pathname;
  const segments = path.split('/').filter(Boolean);
  
  // Handle /api/mood-mentors/reset-and-create
  if (segments[2] === 'reset-and-create') {
    try {
      // First completely reset and create a fresh test profile
      await moodMentorService.completeResetAndCreateTestProfile();
      
      // Return success response
      return NextResponse.json({ 
        success: true, 
        message: 'Test profile reset and created successfully' 
      });
    } catch (error) {
      console.error('Error resetting and creating test profile:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to reset and create test profile' },
        { status: 500 }
      );
    }
  }
  
  // Handle /api/mood-mentors/sync
  if (segments[2] === 'sync') {
    try {
      // Sync test mentor profile
      await moodMentorService.syncTestMentorProfile();
      
      // Return success response
      return NextResponse.json({ 
        success: true, 
        message: 'Test profile synced successfully' 
      });
    } catch (error) {
      console.error('Error syncing test profile:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to sync test profile' },
        { status: 500 }
      );
    }
  }
  
  // Default response for unhandled routes
  return NextResponse.json(
    { error: 'Invalid route' },
    { status: 404 }
  );
} 