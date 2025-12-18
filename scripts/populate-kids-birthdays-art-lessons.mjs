#!/usr/bin/env node
/**
 * WordPress Content Migration Script - Kids Birthdays & Art Lessons Pages
 * 
 * This script populates the "Kids Birthday Art Parties" and "Kids Art Lessons" 
 * pages with content scraped from itsanartparty.com
 * 
 * Usage: node scripts/populate-kids-birthdays-art-lessons.mjs
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

function getKidsBirthdaysContent() {
    return {
        // Hero Section
        hero: {
            subtitle_quote: '"The world is but a canvas to the imagination." Henry David Thoreau',
        },

        // Main Content
        main_content: {
            description: `<p>Paint parties are a great way to celebrate while exploring art with family and friends!</p>
<p>Customize any project based on the birthday theme or the personal taste of the birthday boy or girl.</p>`,
            pricing_text: "All parties are $240 for up to 8 children. Add $20 for each additional child.",
            features: [
                { feature_text: "Starting From $240" },
                { feature_text: "Unlimited Design Themes" },
                { feature_text: "Up To 25 Guests" },
                { feature_text: "1 - 2 Hours (45-60 minute painting time)" },
                { feature_text: "Free Planning and Consultation" }
            ]
        },

        // Detail Cards
        detail_cards: [
            {
                title: "What to Wear",
                description: "Dress for fun in clothes that will get a little messy and/or bring a smock to wear.",
                color: "#5BBAB5"
            },
            {
                title: "Art Supplies",
                description: "I bring the supplies to you and they are included in the party price.",
                color: "#F5C024"
            },
            {
                title: "Party Favors",
                description: "Guests get to take their custom painting home to display as a party favor!",
                color: "#EF6490"
            },
            {
                title: "Instruction",
                description: "I provide professional instruction for painting with hands-on help and guidance.",
                color: "#2B80B0"
            }
        ],

        // What to Expect
        what_to_expect: {
            title: "What To Expect",
            content: `<p>Party planning includes selecting a theme for canvas designs a week in advance of the party. I will create black and white outline designs ahead of time on each canvas for the kids to paint during the party. Upon arrival, I will set up tables with all of the art supplies (tables not included). Painting will take approximately 45-60 minutes. I will clean up all art supplies and prepare your tables for other activities of your choosing (food and drinks not included). If there is anything else I can do to assist during the party, just ask! I am here to help! Most parties only require access to trash cans and sinks.</p>`
        },

        // CTA Section
        cta_section: {
            cta_title: "Plan Your Party Today!",
            cta_subtitle: "Call or Text: 980-253-4829"
        },

        // SEO
        seo: {
            seo_description: "Celebrate your kids next birthday party with It's an Art Party! I bring the supplies and fun to you!"
        }
    };
}

function getArtLessonsContent() {
    return {
        // Hero Section
        hero: {
            subtitle_quote: '"Creativity is intelligence having fun." Albert Einstein',
        },

        // Main Content
        main_content: {
            description: `<p>Art has been linked to many developmental benefits including improving fine motor skills and developing cognitive skills like how to plan, execute, and problem solve through a project. It also encourages decision making and self-expression and may even improve academic performance.</p>
<p>My goal is to encourage out-of-the-box thinking through hands-on art projects that will keep your child(ren) learning throughout the summer months. Creativity fosters imagination and expression through experimentation with a variety of materials.</p>
<p>With art lessons, I will provide private in-home one-on-one instruction on an individual basis and in small groups for children ages 4 and up. Art lesson sessions can be custom designed around the materials with which the child(ren) would like to work. I can also provide suggestions and ideas for fun projects.</p>`,
            pricing_text: "Art lessons are available Monday-Friday. All supplies are included. A $25 non-refundable deposit is required at the time of scheduling.\n\nThe deposit will be applied to the total amount on the day of the session. Each session will last 2 hours.",
            features: [
                { feature_text: "Individual Lessons: $45 (1 child)" },
                { feature_text: "Group Lessons: $30 per child (up to 10 children)" },
                { feature_text: "All Supplies Included" },
                { feature_text: "2-Hour Sessions" },
                { feature_text: "Available Monday-Friday" }
            ]
        },

        // Detail Cards (Lesson Types)
        detail_cards: [
            {
                title: "Individual Lessons",
                description: "Individual one-on-one art lesson session (1 child) – $45. Great for kids who need personalized attention and focus on detailed projects.",
                color: "#5BBAB5"
            },
            {
                title: "Group Lessons",
                description: "Group art lesson session (up to 10 children) – $30 per child. Fun with friends! Group lessons are great for afternoons or summer breaks.",
                color: "#EF6490"
            },
            {
                title: "Locations",
                description: "Lessons are provided to the following zip codes: 28207, 28209, 28211, 28210, 28226, 28270, 28105, 28277, 28104, 28173, 28078, 28031, 28036, 29715",
                color: "#F5C024"
            }
        ],

        // What to Expect (Ideas Section)
        what_to_expect: {
            title: "Ideas to get you started",
            content: `<p>These projects can be completed during art lessons, or even used for parties. The possibilities are ENDLESS!</p>
<ul>
<li>Use vegetables, flowers, bubble wrap, string, shaving cream and more to create unique designs with paint.</li>
<li>"Paint" with chalk shavings or use a spray bottle filled with water or diluted paint.</li>
<li>Learn different techniques for using acrylic paint on surfaces like canvas, wood, and paper.</li>
<li>Paint a phrase, name, or initials for personalized wall art.</li>
<li>Learn to draw or paint still life images or portraits.</li>
<li>Create a collage with words that describe yourself.</li>
<li>Paint on stones or tree branches.</li>
<li>Printmaking using styrofoam templates on paper, card stock, or note cards.</li>
<li>Learn about color theory and experiment with painting using the color wheel.</li>
<li>Glue "odds and ends" (mismatched puzzle pieces, buttons, bolts, boxes, etc.) to a board and spray paint everything the same color.</li>
</ul>`
        },

        // CTA Section
        cta_section: {
            cta_title: "CONTACT ME TODAY!",
            cta_subtitle: "Call or Text: 980-253-4829"
        },

        // SEO
        seo: {
            seo_description: "Individual and small group private in-home art lessons for children 4 and up with It's an Art Party! Help your child release their creativity."
        }
    };
}

async function populatePage(slug, title, content) {
    console.log(`\n🎨 Populating Page: ${title}...`);
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

async function main() {
    console.log('\n🚀 Starting WordPress Page Population...\n');
    console.log('📋 Pages to create/update:');
    console.log('   1. Kids Birthday Art Parties (/kids-birthdays)');
    console.log('   2. Kids Art Lessons (/art-lessons)');

    try {
        // Populate Kids Birthdays page
        await populatePage(
            'kids-birthdays',
            'Kids Birthday Art Parties',
            getKidsBirthdaysContent()
        );

        // Populate Art Lessons page
        await populatePage(
            'art-lessons',
            'Kids Art Lessons',
            getArtLessonsContent()
        );

        console.log('\n✨ All pages populated successfully!\n');
        console.log('📍 Next steps:');
        console.log('   1. Log into WordPress admin to verify the pages');
        console.log('   2. Check that ACF fields are populated correctly');
        console.log('   3. Visit your Astro site to see the pages live');
        console.log('      - http://localhost:4321/kids-birthdays');
        console.log('      - http://localhost:4321/art-lessons\n');

    } catch (error) {
        console.error('\n❌ Script failed:', error.message);
        process.exit(1);
    }
}

main();
