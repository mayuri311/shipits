# Ship Its @ CMU Platform

## Overview

Ship Its @ CMU is a community platform for Carnegie Mellon students to showcase projects, connect with peers, and collaborate on innovative ideas. The application features a modern landing page with sections for projects, events, FAQ, contact, and partners, all built with a focus on user engagement and visual appeal.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a modern full-stack architecture with clear separation between frontend and backend concerns:

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development patterns
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with custom CSS variables for theming and responsive design
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent, accessible design
- **State Management**: TanStack Query for server state management and caching
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for consistent type safety across the stack
- **Development**: tsx for TypeScript execution in development
- **API Pattern**: RESTful API design with `/api` prefix for all routes

## Key Components

### Frontend Components
- **Landing Page**: Hero section with floating navigation and parallax effects
- **Sections**: Modular sections for hero, calendar, projects, FAQ, contact, and partners
- **UI Library**: Comprehensive component library including forms, dialogs, cards, and navigation
- **Responsive Design**: Mobile-first approach with breakpoint-aware components
- **Parallax Effects**: Custom parallax implementation for enhanced visual experience

### Backend Components
- **Storage Interface**: Abstracted storage layer with in-memory implementation for development
- **Route Registration**: Centralized route management system
- **Error Handling**: Global error middleware for consistent error responses
- **Development Tools**: Integrated Vite development server with HMR support

### Database Schema
- **Users**: User authentication and profile management (id, username, password)
- **Projects**: Project showcase functionality (id, title, description, category, likes, authorId, createdAt)
- **Events**: Event management system (id, title, description, date, location, time)
- **Contacts**: Contact form submissions (id, name, email, message, createdAt)

## Data Flow

1. **Client Requests**: React frontend makes API calls using TanStack Query
2. **Server Processing**: Express.js handles requests through registered routes
3. **Data Layer**: Storage interface abstracts database operations
4. **Response Handling**: Structured JSON responses with consistent error handling
5. **State Management**: TanStack Query manages caching and synchronization

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless-first PostgreSQL database driver
- **drizzle-orm**: Type-safe ORM with PostgreSQL dialect support
- **@radix-ui/***: Comprehensive UI primitive components
- **@tanstack/react-query**: Server state management and caching
- **date-fns**: Date manipulation and formatting utilities

### Development Tools
- **Vite**: Build tool with React plugin and development server
- **TypeScript**: Static type checking across the entire stack
- **Tailwind CSS**: Utility-first CSS framework with custom configuration
- **ESBuild**: Fast bundling for production server build

## Deployment Strategy

### Development Environment
- **Frontend**: Vite development server with HMR and error overlay
- **Backend**: tsx for TypeScript execution with auto-restart
- **Database**: Configured for PostgreSQL with Drizzle migrations
- **Build Process**: Parallel frontend and backend building

### Production Build
- **Frontend**: Vite build with static asset optimization
- **Backend**: ESBuild compilation to ESM format
- **Database**: Drizzle migrations with environment-based connection
- **Deployment**: Dist directory contains both client and server builds

### Configuration
- **Environment Variables**: DATABASE_URL for database connection
- **Type Safety**: Shared schema types between frontend and backend
- **Path Aliases**: Consistent import paths across the application
- **Asset Management**: Vite-managed static assets with alias support

The architecture prioritizes developer experience with TypeScript throughout, fast development cycles with Vite, and a scalable foundation for future feature expansion.

## Recent Changes: Latest modifications with dates

### January 28, 2025
- ✓ Created complete forum system with Kickstarter-style layout
- ✓ Built project listing page with search, filtering, and project cards
- ✓ Implemented detailed project view with tabs for overview, creator, FAQs, updates, and comments
- ✓ Added navigation between home page and forum using wouter routing
- ✓ Designed responsive layout matching user's provided mockup images
- ✓ Created funding progress bars and project statistics display
- ✓ Built creator profiles and project interaction features
- ✓ Used mock data for demonstration (no database setup as requested)
- ✓ Added CMU SSO login button with demo functionality for testing
- ✓ Created comprehensive user profile page with editable professional information
- ✓ Built project creation form with all necessary fields and validation
- ✓ Implemented authentication state management (frontend only)
- ✓ Added create project and profile management features for authenticated users