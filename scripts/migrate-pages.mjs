import StoryblokClient from 'storyblok-js-client';
import dotenv from 'dotenv';
import * as cheerio from 'cheerio';
import fs from 'fs';
import { parseStringPromise } from 'xml2js';

dotenv.config({ path: '.env.development' });

const Storyblok = new StoryblokClient({
    oauthToken: process.env.STORYBLOK_PERSONAL_TOKEN,
});

const SPACE_ID = process.env.STORYBLOK_SPACE_ID;
const XML_FILE = 'it039sanartparty.WordPress.2025-11-21.xml';

// Helper to convert HTML to Storyblok Rich Text
function htmlToRichText(html) {
    const $ = cheerio.load(html, { decodeEntities: false });
    const content = [];

    function processNode(node) {
        if (node.type === 'text') {
            const text = $(node).text();
            if (!text.trim()) return null;
            return { type: 'text', text: text };
        }

        if (node.type === 'tag') {
            const tagName = node.name;

            // Handle Paragraphs
            if (tagName === 'p') {
                const children = $(node).contents().map((i, el) => processNode(el)).get().filter(Boolean);
                if (children.length === 0) return null;
                return { type: 'paragraph', content: children };
            }

            // Handle Headers
            if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
                const level = parseInt(tagName.replace('h', ''));
                const children = $(node).contents().map((i, el) => processNode(el)).get().filter(Boolean);
                return { type: 'heading', attrs: { level }, content: children };
            }

            // Handle Links
            if (tagName === 'a') {
                const href = $(node).attr('href');
                const children = $(node).contents().map((i, el) => processNode(el)).get().filter(Boolean);
                return children.map(child => {
                    if (child.type === 'text') {
                        child.marks = [...(child.marks || []), {
                            type: 'link',
                            attrs: { href, target: '_self', linktype: 'url' }
                        }];
                    }
                    return child;
                }).flat();
            }

            // Handle Bold/Strong
            if (tagName === 'b' || tagName === 'strong') {
                const children = $(node).contents().map((i, el) => processNode(el)).get().filter(Boolean);
                return children.map(child => {
                    if (child.type === 'text') {
                        child.marks = [...(child.marks || []), { type: 'bold' }];
                    }
                    return child;
                }).flat();
            }

            // Handle Line Breaks
            if (tagName === 'br') {
                return { type: 'hard_break' };
            }

            // Default: process children
            const children = $(node).contents().map((i, el) => processNode(el)).get().filter(Boolean);
            return children.flat();
        }

        return null;
    }

    $('body').contents().each((i, el) => {
        const converted = processNode(el);
        if (converted) {
            if (Array.isArray(converted)) {
                content.push(...converted);
            } else {
                content.push(converted);
            }
        }
    });

    return {
        type: 'doc',
        content: content.filter(Boolean)
    };
}

async function migratePages() {
    console.log(`📖 Reading XML file: ${XML_FILE}...`);
    const xmlData = fs.readFileSync(XML_FILE, 'utf8');
    const result = await parseStringPromise(xmlData);

    const items = result.rss.channel[0].item;
    console.log(`🔍 Found ${items.length} items in XML.`);

    // Filter for pages only
    const pages = items.filter(item => {
        const postType = item['wp:post_type'] ? item['wp:post_type'][0] : null;
        return postType === 'page';
    });

    console.log(`📄 Found ${pages.length} pages to migrate.`);

    for (const page of pages) {
        const title = page.title[0];
        const slug = page['wp:post_name'][0];
        const contentHtml = page['content:encoded'] ? page['content:encoded'][0] : '';

        console.log(`\\n📝 Processing page: "${title}" (slug: ${slug})`);

        // Skip if no content
        if (!contentHtml || contentHtml.trim() === '') {
            console.log(`   ⚠️  Skipping - no content`);
            continue;
        }

        // Convert HTML to Rich Text
        const richTextContent = htmlToRichText(contentHtml);

        // Create a simple page with richText block
        const storyContent = {
            component: 'page',
            body: [
                {
                    component: 'pageHeader',
                    title: title,
                    subtitle: '',
                    _uid: generateUID()
                },
                {
                    component: 'richText',
                    title: '',
                    content: richTextContent,
                    background_color: 'white',
                    _uid: generateUID()
                }
            ]
        };

        try {
            // Check if story already exists
            const { data: existingStories } = await Storyblok.get(`spaces/${SPACE_ID}/stories`, {
                filter_query: {
                    slug: {
                        in: slug,
                    },
                },
            });

            if (existingStories.stories.length > 0) {
                console.log(`   ⚠️  Story with slug "${slug}" already exists. Skipping.`);
                continue;
            }

            // Create the story
            await Storyblok.post(`spaces/${SPACE_ID}/stories`, {
                story: {
                    name: title,
                    slug: slug,
                    content: storyContent,
                },
                publish: 0, // Save as draft
            });

            console.log(`   ✅ Created page: "${title}"`);
        } catch (error) {
            console.error(`   ❌ Failed to create page: "${title}"`, error.response ? error.response.data : error.message);
        }
    }

    console.log('\\n✨ Migration complete!');
}

// Helper to generate unique IDs for blocks
function generateUID() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

migratePages().catch(console.error);
