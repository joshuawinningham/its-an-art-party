#!/usr/bin/env node
/**
 * WordPress Content Migration Script - Art Lessons Population
 * 
 * This script populates the "Kids Art Lessons" Service page with content scraped
 * from itsanartparty.com/art-lessons/
 * 
 * Usage: node scripts/populate-art-lessons.mjs
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

function getArtLessonsContent() {
    return {
        // Hero Section
        field_hero_section: {
            field_subtitle: "Kids Art Lessons",
            field_quote: "“Creativity is intelligence having fun.” Albert Einstein",
        },

        // Main Content
        field_main_content: {
            field_section_title: "Kids Art Lessons are Now Available!",
            field_description: `<p>Art has been linked to many developmental benefits including improving fine motor skills and developing cognitive skills like how to plan, execute, and problem solve through a project. It also encourages decision making and self-expression and may even improve academic performance.</p>
<p>My goal is to encourage out-of-the-box thinking through hands-on art projects that will keep your child(ren) learning throughout the summer months. Creativity fosters imagination and expression through experimentation with a variety of materials.</p>
<p>With art lessons, I will provide private in-home one-on-one instruction on an individual basis and in small groups for children ages 4 and up. Art lesson sessions can be custom designed around the materials with which the child(ren) would like to work. I can also provide suggestions and ideas for fun projects.</p>`,
            field_pricing_text: "Art lessons are available Monday-Friday. All supplies are included. A $25 non-refundable deposit is required at the time of scheduling.\nThe deposit will be applied to the total amount on the day of the session. Each session will last 2 hours.",
            field_features: [
                { field_feature_text: "Individual Lessons: $45 (1 child)" },
                { field_feature_text: "Group Lessons: $30 per child (up to 10 children)" },
                { field_feature_text: "All Supplies Included" },
                { field_feature_text: "2-Hour Sessions" },
                { field_feature_text: "Available Monday-Friday" }
            ]
        },

        // Detail Cards (Repeater)
        field_detail_cards: [
            {
                field_card_title: "Individual Lessons",
                field_card_description: "Individual one-on-one art lesson session (1 child) – $45. Great for kids who need personalized attention and focus on detailed projects.",
                field_card_icon: "person",
                field_card_color: "#56BDBA" // Teal
            },
            {
                field_card_title: "Group Lessons",
                field_card_description: "Group art lesson session (up to 10 children) – $30 per child. Fun with friends! Group lessons are great for afternoons or summer breaks.",
                field_card_icon: "person",
                field_card_color: "#EB6290" // Pink
            },
            {
                field_card_title: "Locations",
                field_card_description: "Lessons are provided to the following zip codes: 28207, 28209, 28211, 28210, 28226, 28270, 28105, 28277, 28104, 28173, 28078, 28031, 28036, 29715",
                field_card_icon: "person",
                field_card_color: "#217BB0" // Blue
            }
        ],

        // What to Expect
        field_what_to_expect: {
            field_wte_title: "Ideas to get you started",
            field_wte_content: `<p>These projects can be completed during art lessons, or even used for parties. The possibilities are ENDLESS!</p>
<ul>
<li>Use vegetables, flowers, bubble wrap, string, shaving cream and more to create unique designs with paint.</li>
<li>“Paint” with chalk shavings or use a spray bottle filled with water or diluted paint.</li>
<li>Learn different techniques for using acrylic paint on surfaces like canvas, wood, and paper.</li>
<li>Paint a phrase, name, or initials for personalized wall art.</li>
<li>Learn to draw or paint still life images or portraits.</li>
<li>Create a collage with words that describe yourself.</li>
<li>Paint on stones or tree branches.</li>
<li>Printmaking using styrofoam templates on paper, card stock, or note cards.</li>
<li>Learn about color theory and experiment with painting using the color wheel.</li>
<li>Glue “odds and ends” (mismatched puzzle pieces, buttons, bolts, boxes, etc.) to a board and spray paint everything the same color.</li>
</ul>`,
        },

        // CTA Section
        field_cta_section: {
            field_cta_title: "CONTACT ME TODAY!",
            field_cta_subtitle: "Call or Text: 980-253-4829"
        },

        // SEO
        field_seo: {
            field_seo_description: "Individual and small group private in-home art lessons for children 4 and up with It's an Art Party! Help your child release their creativity."
        }
    };
}

async function populateArtLessonsPage() {
    console.log('\n🎨 Populating Service Page (Art Lessons)...');

    const content = getArtLessonsContent();
    const slug = 'art-lessons';
    const title = 'Kids Art Lessons';

    // Note: Assuming 'services' custom post type. Modify if endpoint differs.
    const endpoint = '/wp/v2/services';

    console.log(`   🔎 Checking for existing service: ${slug}`);

    // Check if page exists
    let posts = [];
    try {
        posts = await wpRequest(`${endpoint}?slug=${slug}`);
    } catch (e) {
        console.log(`   ⚠️  Could not fetch ${endpoint}. Checking if CPT exists...`);
    }

    let postId;

    if (posts && posts.length > 0) {
        postId = posts[0].id;
        console.log(`   📝 Updating existing service: ${title} (ID: ${postId})`);
        // Ensure published
        await wpRequest(`${endpoint}/${postId}`, {
            method: 'PUT',
            body: JSON.stringify({
                title: title,
                slug: slug,
                status: 'publish',
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
            console.error(`   ❌ Failed to create service. Ensure 'services' CPT is registered.`);
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

populateArtLessonsPage().catch(err => {
    console.error('\n❌ Script failed:', err.message);
    process.exit(1);
});
