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

// Target posts to restore
const TARGET_POSTS = [
    "How to Host Your Own Paint Party At Home",
    "How to Start a Kids Paint Party Business"
];

// Helper to convert HTML node to Storyblok Rich Text Node
function convertNodeToStoryblok(node, $) {
    if (node.type === 'text') {
        const text = $(node).text();
        // If text is just whitespace, ignore it unless it's significant? 
        // For now, let's keep it if it has length, but trim? 
        // No, keep as is but maybe collapse whitespace if needed.
        if (!text) return null;
        return {
            type: 'text',
            text: text
        };
    }

    if (node.type === 'tag') {
        const tagName = node.name;

        // Handle Images
        if (tagName === 'img') {
            const src = $(node).attr('src');
            const alt = $(node).attr('alt') || '';
            return {
                type: 'image',
                attrs: {
                    src: src,
                    alt: alt,
                    title: alt
                }
            };
        }

        // Handle Paragraphs
        if (tagName === 'p') {
            const children = $(node).contents().map((i, el) => convertNodeToStoryblok(el, $)).get().filter(Boolean);
            if (children.length === 0) return null;

            return {
                type: 'paragraph',
                content: children
            };
        }

        // Handle Headers
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
            const level = parseInt(tagName.replace('h', ''));
            const children = $(node).contents().map((i, el) => convertNodeToStoryblok(el, $)).get().filter(Boolean);
            return {
                type: 'heading',
                attrs: { level: level },
                content: children
            };
        }

        // Handle Lists
        if (tagName === 'ul' || tagName === 'ol') {
            const listType = tagName === 'ul' ? 'bullet_list' : 'ordered_list';
            const children = $(node).children('li').map((i, el) => {
                const liChildren = $(el).contents().map((j, child) => convertNodeToStoryblok(child, $)).get().filter(Boolean);
                // List items must contain paragraphs in Storyblok schema usually, or just text?
                // Actually, list_item content must be blocks (usually paragraph).
                return {
                    type: 'list_item',
                    content: [{
                        type: 'paragraph',
                        content: liChildren
                    }]
                };
            }).get();

            return {
                type: listType,
                content: children
            };
        }

        // Handle Line Breaks
        if (tagName === 'br') {
            return { type: 'hard_break' };
        }

        // Handle Bold/Strong
        if (tagName === 'b' || tagName === 'strong') {
            const children = $(node).contents().map((i, el) => convertNodeToStoryblok(el, $)).get().filter(Boolean);
            return children.map(child => {
                if (child.type === 'text') {
                    child.marks = [...(child.marks || []), { type: 'bold' }];
                }
                return child;
            }).flat();
        }

        // Handle Italic/Em
        if (tagName === 'i' || tagName === 'em') {
            const children = $(node).contents().map((i, el) => convertNodeToStoryblok(el, $)).get().filter(Boolean);
            return children.map(child => {
                if (child.type === 'text') {
                    child.marks = [...(child.marks || []), { type: 'italic' }];
                }
                return child;
            }).flat();
        }

        // Handle Links
        if (tagName === 'a') {
            const href = $(node).attr('href');
            const children = $(node).contents().map((i, el) => convertNodeToStoryblok(el, $)).get().filter(Boolean);
            return children.map(child => {
                if (child.type === 'text') {
                    child.marks = [...(child.marks || []), {
                        type: 'link',
                        attrs: {
                            href: href,
                            target: '_blank',
                            linktype: 'url'
                        }
                    }];
                }
                return child;
            }).flat();
        }

        // Default: just return children (unwrap tags we don't know)
        const children = $(node).contents().map((i, el) => convertNodeToStoryblok(el, $)).get().filter(Boolean);
        return children.flat();
    }

    return null;
}

async function restoreFromXML() {
    console.log(`📖 Reading XML file: ${XML_FILE}...`);
    const xmlData = fs.readFileSync(XML_FILE, 'utf8');
    const result = await parseStringPromise(xmlData);

    const items = result.rss.channel[0].item;
    console.log(`🔍 Found ${items.length} items in XML.`);

    // Map titles to content
    const contentMap = {};
    for (const item of items) {
        const title = item.title[0];
        if (TARGET_POSTS.includes(title)) {
            console.log(`   Found target post in XML: "${title}"`);
            // content:encoded is usually in the 'content:encoded' property or similar depending on parser
            // xml2js usually handles namespaces by stripping or keeping. Let's check keys.
            // Usually it's item['content:encoded'][0]
            const contentEncoded = item['content:encoded'] ? item['content:encoded'][0] : null;
            if (contentEncoded) {
                contentMap[title] = contentEncoded;
            }
        }
    }

    // Now update Storyblok
    console.log('\n🔄 Updating Storyblok...');

    // Get stories from Storyblok to get their IDs
    const { data } = await Storyblok.get(`spaces/${SPACE_ID}/stories`, {
        filter_query: {
            component: {
                in: 'blogPost',
            },
        },
        per_page: 100,
    });

    for (const storyMeta of data.stories) {
        if (TARGET_POSTS.includes(storyMeta.name)) {
            const originalHTML = contentMap[storyMeta.name];

            if (!originalHTML) {
                console.log(`⚠️  Could not find original HTML for "${storyMeta.name}" in XML.`);
                continue;
            }

            console.log(`Processing "${storyMeta.name}"...`);

            // Parse HTML with Cheerio
            const $ = cheerio.load(originalHTML, { decodeEntities: false });
            const rootNodes = $('body').contents();

            const richTextContent = [];

            rootNodes.each((i, el) => {
                const converted = convertNodeToStoryblok(el, $);
                if (converted) {
                    if (Array.isArray(converted)) {
                        richTextContent.push(...converted);
                    } else {
                        richTextContent.push(converted);
                    }
                }
            });

            // Wrap top-level text nodes in paragraphs
            const finalContent = [];
            let currentParagraph = null;

            for (const node of richTextContent) {
                // If it's a block type, push it directly
                if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'bullet_list' || node.type === 'ordered_list' || node.type === 'image') {
                    currentParagraph = null;
                    finalContent.push(node);
                }
                // If it's inline content (text, marks, break), put in paragraph
                else {
                    if (!currentParagraph) {
                        currentParagraph = { type: 'paragraph', content: [] };
                        finalContent.push(currentParagraph);
                    }
                    currentParagraph.content.push(node);
                }
            }

            // Fetch full story first to get current content object structure
            const { data: fullStoryData } = await Storyblok.get(`spaces/${SPACE_ID}/stories/${storyMeta.id}`, {
                token: process.env.STORYBLOK_PERSONAL_TOKEN,
            });

            const story = fullStoryData.story;
            const content = story.content;

            // Update content
            content.content = {
                type: 'doc',
                content: finalContent
            };

            console.log(`💾 Updating "${story.name}" with restored content...`);
            await Storyblok.put(`spaces/${SPACE_ID}/stories/${story.id}`, {
                story: {
                    content: content,
                },
                publish: 0,
            });
            console.log(`✅ Restored "${story.name}"`);
        }
    }

    console.log('✨ Restoration complete!');
}

restoreFromXML().catch(console.error);
