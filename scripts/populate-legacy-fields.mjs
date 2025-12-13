#!/usr/bin/env node
/**
 * Populate Legacy Fields for Existing Pages
 * 
 * Since the Services CPT has been removed, this script directly populates
 * the legacy field structure into the existing kids-birthdays and art-lessons Pages.
 * 
 * Usage: node scripts/populate-legacy-fields.mjs
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
    const url = endpoint.startsWith('http') ? endpoint : `${WP_API_URL}${endpoint}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WordPress API error (${response.status}): ${errorText}`);
    }

    return response.json();
}

/**
 * Update a page with legacy field data
 */
async function updatePageFields(slug, acfData) {
    console.log(`\n📝 Updating ${slug}...`);

    // Find the page
    const pages = await wpRequest(`/wp/v2/pages?slug=${slug}`);

    if (pages.length === 0) {
        console.error(`   ❌ Page "${slug}" not found`);
        return;
    }

    const pageId = pages[0].id;
    console.log(`   Found page ID: ${pageId}`);

    // Update with legacy fields (this will clear page_builder)
    await wpRequest(`/wp/v2/pages/${pageId}`, {
        method: 'POST',
        body: JSON.stringify({
            acf: acfData
        })
    });

    console.log(`   ✅ Updated successfully`);
}

/**
 * Main function
 */
async function main() {
    console.log('🚀 Populating Legacy Fields...\n');

    try {
        // Kids Birthdays Data
        const kidsBirthdaysData = {
            hero_section: {
                headline: "Kids Birthday Parties",
                subheadline: "Canvas Paint Parties",
                quote: '"The world is but a canvas to the imagination." Henry David Thoreau',
                button_text: "Book Now",
                button_link: "/contact"
            },
            main_content: {
                section_title: "Canvas Paint Parties",
                description: "<p>Celebrate your child's special day with a creative and memorable art party! I bring all the supplies and instruction to your location.</p>",
                pricing_text: "All parties are $240 for up to 8 children. Each additional child is $20.",
                features: [
                    { feature_text: "Starting From $240" },
                    { feature_text: "Up to 8 Children Included" },
                    { feature_text: "All Supplies Provided" },
                    { feature_text: "Professional Instruction" },
                    { feature_text: "Custom Paintings to Take Home" }
                ]
            },
            detail_cards: [
                {
                    color: "#5BBAB5",
                    icon: "shirt",
                    title: "What to Wear",
                    description: "Dress for fun in clothes that will get a little messy."
                },
                {
                    color: "#F5C024",
                    icon: "brush",
                    title: "Art Supplies",
                    description: "I bring the supplies to you and they are included."
                },
                {
                    color: "#EF6490",
                    icon: "gift",
                    title: "Party Favors",
                    description: "Guests get to take their custom painting home!"
                },
                {
                    color: "#2B80B0",
                    icon: "person",
                    title: "Instruction",
                    description: "I provide professional instruction and guidance."
                }
            ],
            what_to_expect: {
                what_to_expect_title: "What to Expect",
                what_to_expect_content: "<p>Party planning includes selecting a theme and coordinating all the details. I'll work with you to create the perfect party experience for your child.</p>"
            },
            cta_section: {
                cta_title: "Plan Your Party Today!",
                cta_subtitle: "Call or Text: 980-253-4829"
            },
            seo: {
                seo_description: "Celebrate your child's birthday with a custom art party in Charlotte, NC. Professional instruction and all supplies included."
            }
        };

        // Art Lessons Data
        const artLessonsData = {
            hero_section: {
                headline: "Art Lessons",
                subheadline: "Private & Group Lessons",
                quote: "Nurture creativity through personalized art instruction"
            },
            main_content: {
                section_title: "Private & Group Lessons",
                description: "<p>Personalized art instruction for children in Charlotte, NC. Perfect for developing artistic skills in a fun, supportive environment.</p>",
                pricing_text: "Private lessons: $50/hour\nSmall group (2-4 students): $35/hour per student",
                features: [
                    { feature_text: "Customized Curriculum" },
                    { feature_text: "All Materials Included" },
                    { feature_text: "Flexible Scheduling" },
                    { feature_text: "Professional Instruction" }
                ]
            },
            detail_cards: [
                {
                    color: "#5BBAB5",
                    icon: "person",
                    title: "Ages 5-12",
                    description: "Lessons tailored to your child's age and skill level."
                },
                {
                    color: "#F5C024",
                    icon: "brush",
                    title: "Various Mediums",
                    description: "Explore painting, drawing, mixed media, and more."
                },
                {
                    color: "#EF6490",
                    icon: "gift",
                    title: "Portfolio Building",
                    description: "Create a collection of artwork to be proud of."
                },
                {
                    color: "#2B80B0",
                    icon: "shirt",
                    title: "Your Location",
                    description: "Lessons at your home or another convenient location."
                }
            ],
            cta_section: {
                cta_title: "Start Creating",
                cta_subtitle: "Contact me to schedule a lesson"
            },
            seo: {
                seo_description: "Private and small group art lessons for kids in Charlotte, NC. Professional instruction with all materials included."
            }
        };

        // Update both pages
        await updatePageFields('kids-birthdays', kidsBirthdaysData);
        await updatePageFields('art-lessons', artLessonsData);

        console.log('\n✨ Migration Complete!');
        console.log('\nNext steps:');
        console.log('1. Visit http://localhost:4321/kids-birthdays');
        console.log('2. Visit http://localhost:4321/art-lessons');
        console.log('3. Compare with live site to verify designs match');

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        process.exit(1);
    }
}

main();
