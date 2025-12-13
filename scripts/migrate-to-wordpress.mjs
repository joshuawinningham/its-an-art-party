#!/usr/bin/env node
/**
 * WordPress Content Migration Script
 * 
 * This script extracts content from Astro components and pushes it to WordPress
 * via the REST API, populating ACF fields.
 * 
 * Usage: node scripts/migrate-to-wordpress.mjs
 * 
 * Requires .env with:
 * - WORDPRESS_API_URL
 * - WORDPRESS_USERNAME
 * - WORDPRESS_APP_PASSWORD
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env.development') });

const WP_API_URL = process.env.WORDPRESS_API_URL;
const WP_USERNAME = process.env.WORDPRESS_USERNAME;
const WP_APP_PASSWORD = process.env.WORDPRESS_APP_PASSWORD;

// Validate credentials
if (!WP_API_URL || !WP_USERNAME || !WP_APP_PASSWORD) {
    console.error('❌ Missing WordPress credentials in .env file');
    console.error('Required: WORDPRESS_API_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD');
    process.exit(1);
}

// Create Basic Auth header
const authHeader = 'Basic ' + Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString('base64');

/**
 * Make authenticated request to WordPress REST API
 */
async function wpRequest(endpoint, options = {}) {
    const url = `${WP_API_URL}${endpoint}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`WordPress API error (${response.status}): ${error}`);
    }

    return response.json();
}

/**
 * Upload image to WordPress Media Library
 */
async function uploadImage(imagePath, filename) {
    const absolutePath = path.resolve(__dirname, '..', imagePath);

    if (!fs.existsSync(absolutePath)) {
        console.warn(`⚠️  Image not found: ${absolutePath}`);
        return null;
    }

    const imageBuffer = fs.readFileSync(absolutePath);
    const url = `${WP_API_URL}/wp/v2/media`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': authHeader,
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Type': getMimeType(filename),
        },
        body: imageBuffer,
    });

    if (!response.ok) {
        const error = await response.text();
        console.error(`❌ Failed to upload ${filename}: ${error}`);
        return null;
    }

    const media = await response.json();
    console.log(`   ✅ Uploaded: ${filename} (ID: ${media.id})`);
    return media.id;
}

/**
 * Get MIME type from filename
 */
function getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
    };
    return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Create or update a WordPress page with ACF fields
 */
async function createOrUpdatePage(slug, title, acfFields) {
    // Check if page exists
    const existingPages = await wpRequest(`/wp/v2/pages?slug=${slug}`);

    let pageId;

    if (existingPages.length > 0) {
        // Update existing page
        pageId = existingPages[0].id;
        console.log(`   📝 Updating existing page: ${title} (ID: ${pageId})`);
        await wpRequest(`/wp/v2/pages/${pageId}`, {
            method: 'PUT',
            body: JSON.stringify({
                title: title,
                slug: slug,
                status: 'publish',
            }),
        });
    } else {
        // Create new page
        console.log(`   ➕ Creating new page: ${title}`);
        const newPage = await wpRequest(`/wp/v2/pages`, {
            method: 'POST',
            body: JSON.stringify({
                title: title,
                slug: slug,
                status: 'publish',
            }),
        });
        pageId = newPage.id;
    }

    // Now update ACF fields via custom endpoint
    console.log(`   🔧 Updating ACF fields via custom endpoint...`);
    try {
        const acfResult = await wpRequest(`/itsanartparty/v1/update-acf/${pageId}`, {
            method: 'POST',
            body: JSON.stringify(acfFields),
        });
        console.log(`   ✅ ACF fields updated:`, Object.keys(acfResult.updated || {}).join(', '));
    } catch (error) {
        console.error(`   ⚠️  ACF update failed: ${error.message}`);
        console.log(`   ℹ️  Make sure the custom endpoint is added to functions.php`);
    }

    // Return page info
    return { id: pageId, link: existingPages.length > 0 ? existingPages[0].link : `/${slug}/` };
}

/**
 * Test WordPress connection
 */
async function testConnection() {
    console.log('🔌 Testing WordPress API connection...');
    try {
        const user = await wpRequest('/wp/v2/users/me');
        console.log(`✅ Connected as: ${user.name} (${user.slug})`);
        return true;
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        return false;
    }
}

// ============================================================
// HOME PAGE CONTENT EXTRACTION
// ============================================================

/**
 * Extract content from Home page components
 * This is hardcoded for the POC - can be made dynamic later
 */
function extractHomePageContent() {
    // Using ACF Field KEYS to ensure exact matching
    return {
        // Hero Section (field_home_hero) - Group
        field_home_hero: {
            field_home_hero_headline: "MAKE YOUR PARTY FUN AMAZING MEMORABLE EASY WITH ART!",
            field_home_hero_subheadline: "CELEBRATE AND CREATE!",
            field_home_hero_description: "Mobile art and canvas painting parties with all supplies included for ages 4 and up",
            field_home_hero_button_text: "Request Your Party",
            field_home_hero_button_link: "/contact/",
        },

        // Feature Cards (field_home_feature_cards) - Repeater
        field_home_feature_cards: [
            {
                field_home_feature_title: "Custom Parties",
                field_home_feature_description: "I will work with your party theme to create an art project everyone will enjoy!",
            },
            {
                field_home_feature_title: "Supplies Included",
                field_home_feature_description: "All art supplies are included in the party price along with full setup and clean-up.",
            },
            {
                field_home_feature_title: "Mobile Parties",
                field_home_feature_description: "Canvas painting parties for kids ages 4 and up. I come to your home, park, or party location.",
            },
        ],

        // About Section (field_home_about) - Group
        field_home_about: {
            field_home_about_title: "CHARLOTTE PAINTING PARTIES FOR KIDS",
            field_home_about_content: `<p>It’s an Art Party is a mobile art and paint party service! I specialize in <a href="/kids-birthdays/">kids birthday parties</a> including canvas painting and mixed media art projects for ages 4 and up. I bring the creativity to you with all supplies included.</p>
<p>My goal is for children to experience the fun of art and paint in a celebratory atmosphere. Art parties fuel their creativity with personalized projects that make great keepsakes!</p>
<p><a href="/contact/">Contact me</a> today to plan your next party!</p>`,

            field_home_about_lessons_title: "ART LESSONS",
            field_home_about_lessons_content: `<p>I also offer options for <a href="/art-lessons/">art lessons</a> in small groups for ages 4 and up. Provide your kids with a creative outlet through one-on-one instruction and encouragement. Art provides many developmental benefits and may even improve academic performance.</p>`,

            field_home_about_zip_codes: "28207, 28209, 28211, 28210, 28226, 28270, 28105, 28277, 28104, 28173, 29715, 28273, 28278, 28079, 29708, 28078*, 28031*, 28036*",
        },

        // Testimonials (field_home_testimonials) - Repeater
        field_home_testimonials: [
            {
                field_home_testimonial_quote: "Thank you for the awesome party for my daughter's 11th. They painted a custom otter for our otter themed party. My daughter and her friends loved it!",
                field_home_testimonial_author: "Juliet",
            },
            {
                field_home_testimonial_quote: "Robin did an amazing job for my daughter's party! For everything you get, the party price is a total bargain and doesn't even compare to what else is out there!",
                field_home_testimonial_author: "Kelley",
            },
            {
                field_home_testimonial_quote: "Had a great experience with 'It's An Art Party'. Robin brought all of the supplies and guided everyone in a fun project. My daughter loved it.",
                field_home_testimonial_author: "Lyndsi",
            },
        ],

        // SEO (field_home_seo)
        field_home_seo: {
            field_home_seo_description: "Mobile art and canvas painting parties for kids in Charlotte, NC. Birthday parties starting at $240 with all supplies included, setup & cleanup. Ages 4+. Book today!",
        },
    };
}

// ============================================================
// MAIN MIGRATION FUNCTION
// ============================================================

async function migrateHomePage() {
    console.log('\n🏠 Migrating Home Page to WordPress...\n');

    // Test connection first
    const connected = await testConnection();
    if (!connected) {
        process.exit(1);
    }

    // Extract content
    console.log('\n📋 Extracting content from Astro components...');
    const homeContent = extractHomePageContent();
    console.log('   ✅ Content extracted');

    // Create/update the home page
    console.log('\n📤 Pushing to WordPress...');

    try {
        const result = await createOrUpdatePage('home', 'Home', homeContent);
        console.log(`\n✨ Home page migration complete!`);
        console.log(`   Page ID: ${result.id}`);
        console.log(`   URL: ${result.link}`);
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        process.exit(1);
    }
}

// ============================================================
// CLI
// ============================================================

const command = process.argv[2];

switch (command) {
    case 'test':
        testConnection();
        break;
    case 'home':
        migrateHomePage();
        break;
    default:
        console.log(`
WordPress Content Migration Tool

Usage:
  node scripts/migrate-to-wordpress.mjs test    - Test API connection
  node scripts/migrate-to-wordpress.mjs home    - Migrate home page

Environment variables required in .env:
  WORDPRESS_API_URL      - e.g., https://your-site.com/wp-json
  WORDPRESS_USERNAME     - WordPress admin username
  WORDPRESS_APP_PASSWORD - Application password (not regular password)
        `);
}
