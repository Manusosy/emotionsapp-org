# Mood Mentors Dashboard Redesign Requirements

## Overview
This document outlines the complete redesign requirements for three key pages in the Mood Mentors dashboard: Reviews, Support Groups, and Resources. The existing implementation will be completely replaced with a more consistent, robust, and user-friendly design.

## Technical Architecture
Each page will follow a consistent architecture pattern:
- React functional components with hooks
- TypeScript for type safety
- Service layer for API communication
- Context-based state management
- UI component library for consistent styling
- Error boundary implementation
- Responsive layout design
- Accessibility compliance
- Optimized rendering and data fetching

---

## 1. Reviews Page

### Purpose
A comprehensive system for mood mentors to manage, respond to, and showcase client reviews and testimonials.

### Requirements

#### Dashboard View (Mentor-only)
- **Review Management Interface**
  - Complete list view of all reviews with comprehensive filtering options
  - Filter by status (pending, published, rejected)
  - Filter by rating (1-5 stars)
  - Filter by date range
  - Search by review content or client name

- **Review Moderation**
  - Approve/publish reviews with confirmation dialog
  - Reject reviews with reason selection and confirmation
  - Flag reviews for further consideration
  - Request review edits from clients
  - Add private notes to reviews (visible only to mentor)

- **Review Response System**
  - Reply to reviews with public responses
  - Edit or delete responses
  - Schedule response publication
  - Flag inappropriate reviews for platform review

- **Review Analytics**
  - Average rating visualization and trend over time
  - Rating distribution chart
  - Review volume over time
  - Keyword analysis from review content
  - Topic clustering of common themes

- **Review Display Management**
  - Select featured reviews for public profile
  - Arrange order of displayed reviews
  - Hide specific reviews without rejecting them
  - Preview public review display

- **Notifications**
  - Email alerts for new reviews
  - Dashboard notifications for pending reviews
  - Weekly review summary reports

- **Export Capabilities**
  - Export reviews to CSV or PDF formats
  - Generate review summary reports
  - Create marketing materials from positive reviews

#### Public View Integration
- **Profile Integration**
  - Display selected reviews on mentor public profile
  - Show aggregate rating and review count
  - Highlight featured testimonials
  - Present responses alongside reviews

- **Review Request System**
  - Generate review request links for clients
  - Track review conversion rates
  - Follow-up reminders for pending review requests

---

## 2. Support Groups Page

### Purpose
A comprehensive system for mood mentors to create, manage, and monitor support groups that integrate with the public Help Groups page.

### Requirements

#### Dashboard View (Mentor-only)
- **Group Creation and Management**
  - Create new support groups with detailed information:
    - Name, description, category, and purpose
    - Meeting frequency (weekly, bi-weekly, monthly)
    - Session duration and participant limits
    - Public vs. private visibility settings
    - Group rules and guidelines
    - Required materials or preparation
  - Edit existing group details
  - Archive or delete groups with confirmation
  - Duplicate existing groups as templates

- **Meeting Scheduling**
  - Integration with mentor's availability calendar
  - Recurring meeting setup
  - Meeting location configuration (virtual/physical/hybrid)
  - Virtual meeting links generation (Zoom, Teams, etc.)
  - Cancellation and rescheduling tools with notifications

- **Participant Management**
  - Add patients to groups individually or in bulk
  - Search and filter patient database when adding members
  - Track participation history and engagement
  - Remove participants with optional feedback
  - Waitlist management for popular groups
  - Capacity alerts and management

- **Content Management**
  - Upload materials for group sessions
  - Create session agendas and discussion guides
  - Share resources specifically for group members
  - Track material usage and downloads

- **Attendance Tracking**
  - Record attendance for each session
  - Track attendance trends over time
  - Automated check-in options for virtual sessions
  - Follow-up system for absent participants

- **Session Notes and Progress**
  - Document session activities and outcomes
  - Record group progress toward goals
  - Individual participant progress notes
  - Set and track group milestones

- **Communication Tools**
  - Group messaging functionality
  - Announcement broadcasts to all members
  - Automated reminders before sessions
  - Event notifications for special sessions

- **Analytics Dashboard**
  - Attendance rate visualization
  - Group engagement metrics
  - Outcome tracking based on mentor-defined goals
  - Comparison across different groups

#### Public Help Groups Integration
- **Public Listing**
  - Groups marked as public appear on Help Groups page
  - Filterable by type, schedule, and focus area
  - Clear display of upcoming meeting times
  - Available slots indicator

- **Registration System**
  - Self-registration option for public groups
  - Application form for restricted groups
  - Waitlist sign-up when groups are full
  - Confirmation and reminder emails

- **Public Information Display**
  - Group description and purpose
  - Mentor profile and credentials
  - Testimonials from past participants
  - Session structure and expectations
  - Prerequisites or requirements

- **Discovery Features**
  - Recommended groups based on user interests
  - Featured groups highlighting section
  - Search functionality by topic, schedule, or mentor
  - Calendar view of all upcoming group sessions

---

## 3. Resources Page

### Purpose
A robust content management system for mood mentors to create, organize, and distribute educational resources that integrate with the public Resources page.

### Requirements

#### Dashboard View (Mentor-only)
- **Resource Creation Interface**
  - Add new resources with detailed information:
    - Title, description, and tags
    - Category and subcategory classification
    - Content type (article, video, PDF, audio, etc.)
    - Thumbnail image upload with preview
    - Full resource content or file upload
    - External links where applicable
  - Rich text editor for creating articles directly
  - Multi-file upload capability
  - Version control for updated resources

- **Resource Organization**
  - Custom categorization system
  - Tag-based organization
  - Collection/playlist creation
  - Sequencing resources in learning paths
  - Related resource linking

- **Content Management**
  - Edit existing resources
  - Archive outdated materials
  - Clone and modify resources
  - Schedule publication and expiration
  - Draft and preview before publishing

- **Media Management**
  - Image optimization and cropping tools
  - Video thumbnail selection
  - Audio waveform preview
  - Document preview functionality
  - File version history

- **Permission Controls**
  - Set visibility (public, patients only, specific patients)
  - Set access requirements (free, subscription, specific plans)
  - Password protection option for sensitive resources
  - Time-limited access options

- **Resource Distribution**
  - Share via direct links
  - Email resources to patients
  - Assign as pre/post session materials
  - Schedule distribution for specific dates
  - Bulk assignment to patient groups

- **Analytics Dashboard**
  - View count and engagement metrics
  - Download statistics
  - Completion rates for sequential content
  - User feedback and ratings
  - Time spent on resources

- **Content Quality Tools**
  - SEO optimization suggestions
  - Readability analysis
  - Broken link checking
  - Duplicate content detection
  - Accessibility compliance checking

#### Public Resources Integration
- **Public Resource Library**
  - Clean, searchable interface for public resources
  - Advanced filtering by type, topic, length, etc.
  - Featured resources section
  - Recently added highlighting
  - Most popular resources showcase

- **User Experience**
  - Seamless viewing of different content types
  - Mobile-optimized experience
  - Bookmark and favorite functionality
  - Progress tracking for multi-part resources
  - Offline access options when applicable

- **Interactive Elements**
  - Rating and review system
  - Discussion threads on resources
  - Q&A section for clarifications
  - Progress quizzes and knowledge checks
  - Certificate of completion where applicable

- **Discovery Features**
  - Personalized recommendations based on history
  - Related resource suggestions
  - "You might also like" section
  - New content notifications
  - Curated collections by topic or need

---

## Implementation Approach
Each page will be developed sequentially to ensure complete functionality before moving to the next:

1. Reviews Page
2. Support Groups Page
3. Resources Page

For each page, we will:
- Develop the backend services
- Create the dashboard interface
- Implement public-facing components
- Integrate with existing systems
- Test thoroughly across devices
- Gather user feedback
- Deploy and monitor

## Success Criteria Checklist
For each completed page implementation:

- [ ] All specified requirements implemented
- [ ] Consistent with design system
- [ ] Mobile responsive
- [ ] Accessible (WCAG 2.1 AA compliant)
- [ ] Performance optimized
- [ ] Thoroughly tested
- [ ] Documentation complete
- [ ] User feedback incorporated

# EmotionsApp

A comprehensive mental health platform connecting patients with mood mentors and providing resources for emotional well-being.

## Features

### 🧠 Mood Tracking
- Interactive mood assessment
- Daily check-ins and streak tracking  
- Comprehensive mood analytics
- Personalized insights and trends

### 👨‍⚕️ Mood Mentor System
- Professional mood mentors
- 1-on-1 appointments and consultations
- Video/audio/text-based sessions
- Mentor availability management

### 📚 Resources System
- **Public Resources Page**: Browse educational content, videos, articles, and tools
- **Mood Mentor Resources**: Mentors can add and manage resources
- **Advanced Tracking**: Download, view, and share analytics
- **Categories**: Educational, Self-Help, Crisis Support, Video, Community, Digital Tools
- **Types**: Articles, Videos, Podcasts, Documents, Workshops, Support Groups
- **Features**: 
  - User favorites and bookmarking
  - File uploads and external links
  - Thumbnail management
  - Real-time analytics (views, downloads, shares)
  - Search and filtering

### 📓 Digital Journal
- Secure personal journaling
- Mood-linked entries
- Sharing capabilities with mentors
- Archive and search functionality

### 💬 Secure Messaging
- Direct communication with mentors
- Real-time conversations
- File sharing support
- Read receipts and notifications

### 📊 Analytics & Reports
- Comprehensive mood data visualization
- Progress tracking over time
- Exportable reports
- Mentor dashboard analytics

### 🔐 Authentication & Security
- Supabase-powered authentication
- Role-based access control
- Row-level security (RLS)
- HIPAA-compliant data handling

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Supabase (PostgreSQL, Authentication, Storage)
- **Styling**: Tailwind CSS, Framer Motion
- **UI Components**: Radix UI, shadcn/ui
- **State Management**: React Context
- **Deployment**: Vercel

## Resources System Architecture

### Database Tables
- `resources` - Main resource data
- `resource_favorites` - User bookmarks
- `resource_downloads` - Download tracking
- `resource_shares` - Share analytics
- `resource_views` - View tracking

### Storage
- **Bucket**: `resources` - File uploads (images, documents, videos)
- **Types Supported**: PDF, DOC, PPT, MP4, MP3, images
- **Security**: RLS policies for upload/access control

### Analytics Functions
- `increment_resource_downloads()` - Track downloads
- `increment_resource_shares()` - Track shares  
- `track_resource_view()` - Track views
- `get_resources_with_favorite_status()` - Get resources with user favorites

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Run development server: `npm run dev`

## Environment Variables

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
