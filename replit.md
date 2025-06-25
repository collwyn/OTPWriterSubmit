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
- Bgreen2075@aol.com
- nayabaarindemedia@gmail.com
- godsgrace55@hotmail.com
- kazembebatts@gmail.com
- castroeddie714@gmail.com
- fernegillespie@aol.com
- lyndon.t2003@gmail.com

## Recent Changes
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