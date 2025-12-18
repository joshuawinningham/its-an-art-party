#!/usr/bin/env node
/**
 * WordPress Content Migration Script - Service Page Population
 * 
 * This script populates the "Parties for Kids" Service page with content scraped
 * from itsanartparty.com/kids-birthdays/, mapping to the `group_service_page` ACF fields.
 * 
 * Usage: node scripts/populate-service-page.mjs
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

function getServicePageContent() {
    return {
        // Hero Section
        field_hero_section: {
            field_subtitle: "Parties for Kids",
            field_quote: "“The world is but a canvas to the imagination.” Henry David Thoreau",
            // hero_image: skipped (no XML)
        },

        // Main Content
        field_main_content: {
            field_section_title: "Canvas Paint Parties",
            field_description: `<p>Paint parties are a great way to celebrate while exploring art with family and friends!</p>
<p>Customize any project based on the birthday theme or the personal taste of the birthday boy or girl.</p>`,
            field_pricing_text: "All parties are $240 for up to 8 children. Add $20 for each additional child.\nA $75 non-refundable deposit is due at the time of booking and will be applied to the total amount on the day of the party.",
            field_features: [
                { field_feature_text: "Starting From $240" },
                { field_feature_text: "Unlimited Design Themes" },
                { field_feature_text: "Up To 25 Guests" },
                { field_feature_text: "1 - 2 Hours (45-60 minute painting time)" },
                { field_feature_text: "Free Planning and Consultation" }
            ]
        },

        // Detail Cards (Repeater)
        // Mapped from "additional details" section
        field_detail_cards: [
            {
                field_card_title: "What to Wear",
                field_card_description: "Dress for fun in clothes that will get a little messy and/or bring a smock to wear.",
                field_card_icon: "shirt",
                field_card_color: "#56BDBA" // Teal
            },
            {
                field_card_title: "Art Supplies",
                field_card_description: "I bring the supplies to you and they are included in the party price.",
                field_card_icon: "brush",
                field_card_color: "#F7BE19" // Yellow
            },
            {
                field_card_title: "Party Favors",
                field_card_description: "Guests get to take their custom painting home to display as a party favor!",
                field_card_icon: "gift",
                field_card_color: "#EB6290" // Pink
            },
            {
                field_card_title: "Instruction",
                field_card_description: "I provide professional instruction for painting with hands-on help and guidance.",
                field_card_icon: "person",
                field_card_color: "#217BB0" // Blue
            }
        ],

        // What to Expect
        field_what_to_expect: {
            field_wte_title: "What To Expect",
            field_wte_content: `<p>Party planning includes selecting a theme for canvas designs a week in advance of the party. I will create black and white outline designs ahead of time on each canvas for the kids to paint during the party.</p>
<p>Upon arrival, I will set up tables with all of the art supplies (tables not included). Painting will take approximately 45-60 minutes. I will clean up all art supplies and prepare your tables for other activities of your choosing (food and drinks not included).</p>
<p>If there is anything else I can do to assist during the party, just ask! I am here to help! Most parties only require access to trash cans and sinks.</p>`,
            // what_to_expect_image: skipped
        },

        // CTA Section
        field_cta_section: {
            field_cta_title: "Plan Your Party Today!",
            field_cta_subtitle: "Call or Text: 980-253-4829"
        },

        // SEO
        field_seo: {
            field_seo_description: "Celebrate your kids next birthday party with It's an Art Party! I bring the supplies and fun to you!"
        }
    };
}

async function populateServicePage() {
    console.log('\n🎨 Populating Service Page (Kids Birthdays)...');

    const content = getServicePageContent();
    const slug = 'kids-birthdays';
    const title = 'Parties for Kids';

    // Note: Assuming 'services' custom post type. Modify if endpoint differs.
    const endpoint = '/wp/v2/services';

    console.log(`   🔎 Checking for existing service: ${slug}`);

    // Check if page exists
    let posts = [];
    try {
        posts = await wpRequest(`${endpoint}?slug=${slug}`);
    } catch (e) {
        console.log(`   ⚠️  Could not fetch ${endpoint}. Checking if CPT exists...`);
        // If 404, maybe CPT isn't exposed or name is different. 
        // Failing gracefully instructions: "Use the content scraped directly".
    }

    let postId;

    if (posts && posts.length > 0) {
        postId = posts[0].id;
        console.log(`   📝 Updating existing service: ${title} (ID: ${postId})`);
        await wpRequest(`${endpoint}/${postId}`, {
            method: 'PUT',
            body: JSON.stringify({
                title: title,
                slug: slug,
                status: 'publish', // Ensure it's published
            }),
        });
    } else {
        console.log(`   ➕ Creating new service: ${title}`);
        try {
            const newPost = await wpRequest(endpoint, {
                method: 'POST',
                body: JSON.stringify({
                    title: title,
                    slug: slug,
                    status: 'publish',
                }),
            });
            postId = newPost.id;
        } catch (e) {
            console.error(`   ❌ Failed to create service. Ensure 'services' CPT is registered and exposed to REST.`);
            throw e;
        }
    }

    // Update ACF Fields
    console.log(`   🔧 Updating ACF fields...`);

    try {
        const acfResult = await wpRequest(`/itsanartparty/v1/update-acf/${postId}`, {
            method: 'POST',
            body: JSON.stringify(content),
        });
        console.log(`   ✅ Success! Fields updated:`, Object.keys(acfResult.updated || {}).join(', '));
    } catch (error) {
        console.error(`   ⚠️  ACF update failed: ${error.message}`);
    }
}

populateServicePage().catch(err => {
    console.error('\n❌ Script failed:', err.message);
    process.exit(1);
});
