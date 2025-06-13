# Daily.co Integration Guide for Emotions App

This document provides a comprehensive guide for setting up and maintaining the Daily.co video/audio call integration in the Emotions mental health application.

## Overview

The Emotions app uses [Daily.co](https://www.daily.co/) for video and audio calls between patients and mentors. Daily.co provides a reliable, secure platform for telehealth sessions with features like:

- High-quality video and audio calls
- Screen sharing capabilities
- Text chat during sessions
- Room access controls
- Cross-platform compatibility

## Setup Instructions

### 1. Environment Variables

The application requires the following Daily.co environment variables:

```
# Daily.co Configuration
VITE_DAILY_DOMAIN=emotionsapp.daily.co
VITE_DAILY_API_KEY=your_daily_api_key
```

**Implementation Steps:**

1. Create a `.env` file in the project root
2. Add the Daily.co variables with your actual API key
3. Restart the development server

### 2. Project Structure

The Daily.co integration consists of these key files:

- `src/services/daily/daily.service.ts` - Core service for Daily.co API interactions
- `src/components/calls/DirectCallPage.tsx` - UI component for video/audio calls
- `src/services/appointments/appointment.service.ts` - Integration with appointment system

### 3. How It Works

1. When a mentor starts a session:
   - The appointment service calls `dailyService.createAppointmentRoom()`
   - A room is created via the Daily.co API with appropriate settings
   - The room URL is stored in the appointment record

2. When a patient joins a session:
   - The appointment service retrieves the existing room URL
   - The DirectCallPage component connects to this room

3. Error handling:
   - Authentication failures are clearly reported
   - Network issues trigger reconnection attempts
   - Permission denials show helpful guidance

## Troubleshooting

### Common Issues and Solutions

1. **Authentication Error**
   - **Symptom**: "Video call service authentication failed"
   - **Cause**: Invalid or missing Daily.co API key
   - **Solution**: Verify the API key in your .env file matches the one in your Daily.co dashboard

2. **Room Creation Failure**
   - **Symptom**: "Failed to create call room"
   - **Cause**: API request issues or rate limiting
   - **Solution**: Check network connectivity and Daily.co service status

3. **Camera/Microphone Access Issues**
   - **Symptom**: Call connects but no video/audio
   - **Cause**: Browser permissions denied
   - **Solution**: Guide users to allow camera/microphone permissions

## Daily.co API Key Management

For security reasons:

1. Never commit API keys to version control
2. Use different keys for development and production
3. Regularly rotate your API keys
4. Restrict API key permissions to only what's needed

## Testing

To verify the integration is working:

1. Start a development server with proper environment variables
2. Log in as a mentor and start a session with a patient
3. In another browser/incognito window, log in as the patient
4. Join the session and verify audio/video connectivity

## Maintenance

To keep the Daily.co integration running smoothly:

1. Periodically check for Daily.co API updates
2. Monitor API usage to stay within plan limits
3. Review call quality feedback from users
4. Update the integration when new features are needed

## References

- [Daily.co API Documentation](https://docs.daily.co/reference)
- [Daily.co React Components](https://docs.daily.co/reference/daily-react)
- [Daily.co JavaScript Library](https://docs.daily.co/reference/daily-js) 