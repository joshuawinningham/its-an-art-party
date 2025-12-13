#!/usr/bin/env node
/**
 * WordPress Content Migration Script - About Page Population
 * 
 * This script populates the "About" page with content scraped
 * from itsanartparty.com/about/, mapping to the `group_about_page` ACF fields.
 * 
 * Usage: node scripts/populate-about-page.mjs
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

function getAboutPageContent() {
    return {
        // Hero Section
        field_about_hero: {
            field_about_subtitle_quote: "“You can’t use up creativity. The more you use, the more you have.” Maya Angelou",
        },

        // Intro Section
        field_about_intro: {
            // field_about_intro_image: skipped
            field_about_intro_text: "I started It’s an Art Party as a way to combine my passion for art with my love for children. There’s no greater feeling than watching a child light up when given the encouragement and opportunity to create something all their own.",
            field_about_owner_name: "Robin Winningham",
            field_about_owner_title: "Artist and Owner"
        },

        // About Me Section
        field_about_me: {
            field_about_me_content: `<p>Hi! My name is Robin and I am the creator of It’s an Art Party!</p>
<p>I believe that everyone has the ability to be creative and express themselves through one art form or another. The possibilities are endless! I hope to help the next generation express themselves freely through art. It’s an Art Party takes that goal and combines it with the celebration of a special event such as a birthday.</p>
<p>My fondest childhood birthday memories are the art parties I had with friends. Not only did I love working on my special birthday art project, but I loved seeing what my friends created as well. It was a special time for making memories and doing something fun as a group.</p>
<p>I can’t remember a time when I wasn’t pursuing a love of art. I started taking art classes in elementary school and put my first portfolio together at the age of 10. I was accepted into a magnet school for performing and visual arts from grades 6-8. What I learned about art in those 3 years became the foundation for my dream of becoming a full-time artist.</p>
<p>I sampled a lot of different mediums and tried many new techniques in those years. I continued to take art classes throughout high school and into college. I love working with my hands and today I am continuing to experiment with different mediums and challenge myself creatively. My abstract paintings can be found on my <a href="https://www.robinwinninghamart.com/" target="_blank">artist website</a>. You can also read more about me there.</p>
<p>I have also spent many years teaching Sunday school and working with children at my church. I love watching children discover all the fun that art has to offer!</p>
<p>Through It’s an Art Party, I want to help celebrate your special occasions by bringing art to you! Visit the <a href="/kids-birthdays/">kids painting parties page</a> for project examples and pricing.</p>
<p>I also offer art lessons for individuals or small groups. Find out more about <a href="/art-lessons/">art lessons here</a>.</p>`
        },

        // Why Choose Section
        field_about_why_choose: {
            field_about_why_title: "Why Choose It's an art party?",
            field_about_why_description: "I will work behind the scenes to create a custom design for a canvas painting that kids can take home as a party favor.",
            field_about_why_features: [
                { field_about_feature_text: "Professional Planning" },
                { field_about_feature_text: "Unlimited Party Themes" },
                { field_about_feature_text: "Hassle Free Options" },
                { field_about_feature_text: "Affordable Prices" }
            ],
            // field_about_collage: skipped
        },

        // Policies Section
        field_about_policies: {
            field_about_policies_title: "Other Policies",
            field_about_policies_subtitle: "Read more about what to expect and contact me with any questions.",
            field_about_policies_list: [
                {
                    field_policy_title: "Age Limitation",
                    field_policy_description: "Art parties are best suited for ages 4 and up.",
                    field_policy_icon_color: "teal" // inferred from content/colors often used
                },
                {
                    field_policy_title: "Food & Drink",
                    field_policy_description: "I do not supply food or drinks.",
                    field_policy_icon_color: "yellow"
                },
                {
                    field_policy_title: "Decorations",
                    field_policy_description: "Decorations are up to you, but I can use your theme to design custom canvases.",
                    field_policy_icon_color: "pink"
                },
                {
                    field_policy_title: "Deposit",
                    field_policy_description: "I require a $75 deposit at the time of booking to secure your party date and time.",
                    field_policy_icon_color: "blue"
                }
            ]
        },

        // CTA Section
        field_about_cta: {
            field_about_cta_title: "Ready To Book Your Party?"
        },

        // SEO
        field_about_seo: {
            field_about_seo_description: "“Every child is an artist. The problem is how to remain an artist once we grow up.” -Pablo Picasso Hi! My name is Robin and I am the creator of It’s an Art Party!"
        }
    };
}

async function populateAboutPage() {
    console.log('\n🎨 Populating About Page...');

    const content = getAboutPageContent();
    const slug = 'about';
    const title = 'About';

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

populateAboutPage().catch(err => {
    console.error('\n❌ Script failed:', err.message);
    process.exit(1);
});
