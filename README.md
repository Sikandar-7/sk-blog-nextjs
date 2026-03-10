# Headless WordPress Blog (Next.js 14)

A modern, full-stack headless blog built with Next.js 14 (App Router) and WordPress as a headless CMS.

## Features
- **Frontend:** Next.js 14, React, TypeScript, CSS Variables (Premium Warm Editorial Theme)
- **Backend:** WordPress REST API
- **Auth:** WordPress Application Passwords, Custom REST endpoints for Registration/Login
- **Editor:** TipTap Rich Text Editor for creating blog posts directly from the Next.js frontend
- **Workflows:**
  - Submit posts for review (Pending status)
  - Admin Dashboard to Review, Approve (Publish), or Reject posts
  - Category and Tag creation from frontend

## Repository Structure
- `/src` - The Next.js frontend code.
- `/wordpress-setup` - The required WordPress configuration files to make the headless setup work.

## WordPress Backend Setup

To run this project, you need a local WordPress installation (e.g., using LocalWP) running at `http://wp-blog.local`.

### 1. Configure WordPress API Plugin
This project relies on custom REST API endpoints for user authentication and content creation.
- Copy the file `wordpress-setup/sk-blog-auth.php` into your WordPress installation's `wp-content/mu-plugins` folder.
- This creates endpoints like `/wp-json/sk-blog/v1/login` and `/wp-json/sk-blog/v1/register`.

### 2. Generate Sample Content
- Copy `wordpress-setup/add-blog-posts.php` to your `wp-content/` folder and visit `http://wp-blog.local/wp-content/add-blog-posts.php` to automatically generate Categories and Categories.

### 3. Application Passwords
- Go to WordPress Admin -> Users -> Your Profile.
- Scroll down to "Application Passwords" and generate a new password to use with the Next.js frontend API.

## Frontend Setup

1. Install dependencies:
```bash
npm install
```

2. Configure Environment:
Ensure you have `.env.local` configured:
```env
NEXT_PUBLIC_WP_API=http://wp-blog.local/wp-json/wp/v2
```

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
