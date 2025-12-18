#!/usr/bin/env node
/**
 * Convert Services to Pages
 * 
 * This script migrates content from the "Services" Custom Post Type
 * to standard "Pages" using the new "Page Builder" flexible content field.
 * 
 * Usage: node scripts/convert-services-to-pages.mjs
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env.development') });

const WP_API_URL = process.env.WORDPRESS_API_URL;
const WP_USERNAME = process.env.WORDPRESS_USERNAME;
const WP_APP_PASSWORD = process.env.WORDPRESS_APP_PASSWORD;

if (!WP_API_URL || !WP_USERNAME || !WP_APP_PASSWORD) {
    console.error('❌ Missing WordPress credentials in .env file');
    process.exit(1);
}

const authHeader = 'Basic ' + Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString('base64');

/**
 * Make authenticated request
 */
async function wpRequest(endpoint, options = {}) {
    // Handle full URL vs endpoint
    const url = endpoint.startsWith('http') ? endpoint : `${WP_API_URL}${endpoint}`;

    // Add per_page=100 default if listing
    const fetchUrl = new URL(url);
    if (!fetchUrl.searchParams.has('per_page') && endpoint.includes('/wp/v2/')) {
        // Only add to list endpoints roughly
    }

    const response = await fetch(fetchUrl.toString(), {
        ...options,
        headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        throw new Error(`WordPress API error (${response.status}): ${await response.text()}`);
    }

    return response.json();
}

/**
 * Transform Service ACF to Page Builder Flexible Content
 */
function transformServiceToPageBuilder(service) {
    // --- 3. MAPPING LOGIC (Legacy Fields 1:1) ---
    // Instead of building a flexible content array, we just map 
    // the source ACF fields directly to the destination ACF fields.
    // The keys in 'scf-legacy-service-fields.json' match the original keys.

    const newAcfData = {
        // 1. Hero
        hero_section: {
            headline: service.acf.hero_section?.headline || service.title.rendered,
            subheadline: service.acf.hero_section?.subheadline,
            image: service.acf.hero_section?.image?.id || null, // Pass ID for image field
            quote: service.acf.hero_section?.quote,
            button_text: service.acf.hero_section?.button_text,
            button_link: service.acf.hero_section?.button_link,
        },

        // 2. Main Content
        main_content: {
            section_title: service.acf.main_content?.section_title,
            description: service.acf.main_content?.description,
            pricing_text: service.acf.main_content?.pricing_text,
            features: service.acf.main_content?.features || [], // Pass repeater directly
            image: service.acf.main_content?.image?.id || null
        },

        // 3. Gallery
        gallery: {
            gallery_images: service.acf.gallery?.gallery_images?.map(img => img.id) || []
        },

        // 4. Detail Cards
        detail_cards: service.acf.detail_cards || [],

        // 5. What to Expect
        what_to_expect: {
            what_to_expect_title: service.acf.what_to_expect?.what_to_expect_title,
            what_to_expect_content: service.acf.what_to_expect?.what_to_expect_content,
            what_to_expect_image: service.acf.what_to_expect?.what_to_expect_image?.id || null
        },

        // 6. CTA
        cta_section: {
            cta_title: service.acf.cta_section?.cta_title,
            cta_subtitle: service.acf.cta_section?.cta_subtitle,
            cta_link: service.acf.cta_section?.cta_link
        },

        // 7. SEO
        seo: {
            seo_description: service.acf.seo?.seo_description
        }
    };

    // Log for debugging
    console.log(`Prepared ACF data for ${service.slug}:`, JSON.stringify(newAcfData, null, 2));
    return newAcfData;
}

/**
 * Main Migration
 */
async function migrate() {
    console.log('🚀 Starting Service -> Page Migration...');

    try {
        // 1. Fetch all services
        console.log('📦 Fetching services...');
        const services = await wpRequest('/wp/v2/services?per_page=100&_embed');
        console.log(`   Found ${services.length} services.`);

        for (const service of services) {
            console.log(`\nProcessing: ${service.slug}`);

            // 2. Prepare Page Builder Data
            const pageBuilderData = transformServiceToPageBuilder(service);

            // 3. Check if Page exists
            const existingPages = await wpRequest(`/wp/v2/pages?slug=${service.slug}`);
            let pageId;

            if (existingPages.length > 0) {
                console.log(`   📝 Page exists (ID: ${existingPages[0].id}). Updating...`);
                pageId = existingPages[0].id;

                // Update
                // Note: pageBuilderData is now the full ACF object structure
                await wpRequest(`/wp/v2/pages/${pageId}`, {
                    method: 'POST', // Update uses POST/PUT
                    body: JSON.stringify({
                        title: service.title.rendered,
                        status: 'publish',
                        acf: pageBuilderData
                    })
                });
            } else {
                console.log(`   ➕ Creating new page...`);

                const newPage = await wpRequest(`/wp/v2/pages`, {
                    method: 'POST',
                    body: JSON.stringify({
                        title: service.title.rendered,
                        slug: service.slug,
                        status: 'publish',
                        acf: pageBuilderData
                    })
                });
                pageId = newPage.id;
            }

            console.log(`   ✅ Migrated to Page ID: ${pageId}`);
        }

        console.log('\n✨ Migration Complete!');
        console.log('NOTE: Ensure you have imported docs/scf-page-builder.json in WordPress > SCF > Tools first!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
}

migrate();
