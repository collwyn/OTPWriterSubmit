# Our Time Press - Writers Portal

## Project Overview
A web application for writers to submit stories to "Our Time Press" newspaper. Features user authentication, file upload capabilities, admin dashboard, and article download functionality.

## Technical Stack
- Frontend: React with Vite, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Express.js with TypeScript
- Database: PostgreSQL (Neon-backed)
- Authentication: Passport.js with local strategy
- File handling: Multer for uploads, Archiver for downloads
- ORM: Drizzle with Zod validation

## Key Features Implemented
- User authentication and authorization
- Article submission with text and image uploads (JPG only, 4MB limit)
- Admin dashboard for reviewing submissions
- Writer dashboard for tracking articles
- Email notifications for new submissions
- Download approved articles as zip packages
- Dropbox integration for file storage

## User Accounts

### Admin Account
- Username: admin
- Email: admin@ourtimepress.com
- Password: admin123

### Writer Accounts
Created with proper password hashing:
- bgreen2075@aol.com
- nayabaarindemedia@gmail.com
- godsgrace55@hotmail.com
- kazembebatts@gmail.com
- castroeddie714@gmail.com
- fernegillespie@aol.com
- lyndon.t2003@gmail.com

## Recent Changes
- **2026-03-10**: Fixed image persistence bug
  - Modified POST and PATCH article handlers to use Dropbox links when available
  - Added fallback to local file paths if Dropbox upload fails
  - Updated console message to clearly indicate images won't persist without DROPBOX_ACCESS_TOKEN
  - Images now properly persist across server restarts when Dropbox token is configured
  - Added dynamic media gallery with lightbox for viewing images and videos
- **2025-01-26**: Implemented SendGrid email notification system
  - Integrated SendGrid API for professional email delivery
  - Created beautifully designed HTML email templates
  - Configured automatic admin notifications when writers submit articles
  - Added newsletter category support to email notifications
- **2025-01-26**: Enhanced admin dashboard with comprehensive features
  - Added tab-based navigation (Articles, Writers, Profile, Settings)
  - Activated admin profile and settings sections
  - Created writers management interface showing all registered writers
  - Added links to writers' articles and submission statistics
  - Implemented newsletter category support across all interfaces
- **2025-01-26**: Implemented admin delete functionality with real-time updates
  - Added DELETE /api/articles/:id route with admin-only access
  - Created delete mutations with automatic cache invalidation
  - Added delete buttons to admin dashboard and review pages with confirmation dialogs
  - Files are automatically cleaned up when articles are deleted
- **2025-01-26**: Implemented article download functionality
  - Created zip packaging with article text and images
  - Added download buttons to article cards and detail pages
  - Restricted downloads to approved articles only
- **2025-01-26**: Created writer accounts with secure password hashing
  - Added 7 writer accounts with provided credentials
  - All accounts have non-admin privileges

## Project Architecture
- Database schema includes users and articles tables with proper relations
- Server routes handle authentication, file uploads, and article management
- Frontend uses React Query for state management and API calls
- Protected routes ensure proper access control
- File uploads stored locally with Dropbox backup integration

## Deployment Status
Ready for deployment with all core features implemented and tested.