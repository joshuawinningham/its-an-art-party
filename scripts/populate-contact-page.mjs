#!/usr/bin/env node
/**
 * WordPress Content Migration Script - Contact Page Population
 * 
 * This script populates the "Contact" page with content scraped
 * from itsanartparty.com/contact/, mapping to the `group_contact_page` ACF fields.
 * 
 * Usage: node scripts/populate-contact-page.mjs
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

if (!WP_API_URL || !WP_USERNAME || !WP_APP_PASSWORD) {
    console.error('❌ Missing WordPress credentials in .env file');
    process.exit(1);
}

const authHeader = 'Basic ' + Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString('base64');

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

function getContactPageContent() {
    return {
        // Form Section (field_contact_form)
        field_contact_form: {
            field_contact_form_title: "Request A Party",
            field_contact_form_subtitle: "Please fill out the form below to request more information or schedule a paint party or art lesson."
        },

        // Hear From You Section (field_contact_hear)
        field_contact_hear: {
            field_contact_hear_title: "Alternative",
            field_contact_hear_text: "<p>I can’t wait to hear from you! You can also call or text me directly at 980-253-4829 or send an email to robin@itsanartparty.com and I will respond as soon as possible. Thank you!</p>",
            // image: skipped
        },

        // Contact Info (field_contact_info)
        field_contact_info: {
            field_contact_info_title: "Get In Touch",
            field_contact_phone: "980-253-4829",
            field_contact_email: "robin@itsanartparty.com",
            field_contact_address: "" // Not present on page
        },

        // Social Links (field_contact_social) - Inferred standard links
        field_contact_social: [
            {
                field_social_platform: "facebook",
                field_social_url: "https://www.facebook.com/itsanartparty"
            },
            {
                field_social_platform: "instagram",
                field_social_url: "https://www.instagram.com/itsanartpartycharlotte/"
            }
        ],

        // Map (field_contact_map)
        // field_contact_map: skipped (no visible map)

        // Newsletter (field_contact_newsletter)
        // field_contact_newsletter: skipped (no visible newsletter)

        // SEO (field_contact_seo)
        field_contact_seo: {
            field_contact_seo_description: "Contact It's an Art Party to schedule your child's next birthday party or art lesson! Call, text, or email Robin Winningham today."
        }
    };
}

async function populateContactPage() {
    console.log('\n🎨 Populating Contact Page...');

    const content = getContactPageContent();
    const slug = 'contact';
    const title = 'Contact';

    console.log(`   🔎 Checking for existing page: ${slug}`);

    // Check if page exists
    let pages = [];
    try {
        pages = await wpRequest(`/wp/v2/pages?slug=${slug}`);
    } catch (e) {
        console.log(`   ⚠️  Could not fetch pages.`);
    }

    let pageId;

    if (pages && pages.length > 0) {
        pageId = pages[0].id;
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
        console.log(`   ➕ Creating new page: ${title}`);
        try {
            const newPage = await wpRequest(`/wp/v2/pages`, {
                method: 'POST',
                body: JSON.stringify({
                    title: title,
                    slug: slug,
                    status: 'publish',
                }),
            });
            pageId = newPage.id;
        } catch (e) {
            console.error(`   ❌ Failed to create page.`);
            throw e;
        }
    }

    // Update ACF Fields
    console.log(`   🔧 Updating ACF fields...`);

    try {
        const acfResult = await wpRequest(`/itsanartparty/v1/update-acf/${pageId}`, {
            method: 'POST',
            body: JSON.stringify(content),
        });
        console.log(`   ✅ Success! Fields updated:`, Object.keys(acfResult.updated || {}).join(', '));
    } catch (error) {
        console.error(`   ⚠️  ACF update failed: ${error.message}`);
    }
}

populateContactPage().catch(err => {
    console.error('\n❌ Script failed:', err.message);
    process.exit(1);
});
