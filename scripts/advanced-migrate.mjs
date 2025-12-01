import StoryblokClient from 'storyblok-js-client';
import dotenv from 'dotenv';
import * as cheerio from 'cheerio';

dotenv.config({ path: '.env.development' });

const Storyblok = new StoryblokClient({
    oauthToken: process.env.STORYBLOK_PERSONAL_TOKEN,
});

const SPACE_ID = process.env.STORYBLOK_SPACE_ID;

// Helper to convert HTML node to Storyblok Rich Text Node
function convertNodeToStoryblok(node, $) {
    if (node.type === 'text') {
        const text = $(node).text();
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

            // If paragraph contains only an image, return just the image block (Storyblok doesn't like images inside paragraphs in some schemas, but usually it's fine. 
            // However, for "root" level blocks, images should be their own block type if possible, or inside a paragraph.
            // Standard Storyblok Rich Text schema allows images inside paragraphs.
            // BUT, to make them "full width" or behave like blocks, often they are top-level.
            // Let's try to keep them inside paragraphs if they were inline, or split if they were standalone.

            // For now, let's just return a paragraph with children
            if (children.length === 0) return null;

            return {
                type: 'paragraph',
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
            // Apply bold mark to all text children
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

async function migrateImages() {
    console.log('🔍 Fetching all blog posts...');

    const { data } = await Storyblok.get(`spaces/${SPACE_ID}/stories`, {
        filter_query: {
            component: {
                in: 'blogPost',
            },
        },
        per_page: 100,
    });

    const stories = data.stories;
    console.log(`📝 Found ${stories.length} blog posts`);

    for (const storyMeta of stories) {
        console.log(`Fetching full content for: ${storyMeta.name}`);
        try {
            const { data: fullStoryData } = await Storyblok.get(`spaces/${SPACE_ID}/stories/${storyMeta.id}`, {
                token: process.env.STORYBLOK_PERSONAL_TOKEN,
            });

            const story = fullStoryData.story;
            const content = story.content;

            if (typeof content.content === 'string') {
                console.log(`   Found raw HTML content in "${story.name}"`);

                // Parse HTML
                const $ = cheerio.load(content.content, { decodeEntities: false });
                const rootNodes = $('body').contents(); // Cheerio wraps in body

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

                // Wrap top-level text nodes in paragraphs (Storyblok root must be blocks)
                const finalContent = [];
                let currentParagraph = null;

                for (const node of richTextContent) {
                    if (node.type === 'text' || node.type === 'hard_break' || (node.marks && node.marks.length > 0)) {
                        if (!currentParagraph) {
                            currentParagraph = { type: 'paragraph', content: [] };
                            finalContent.push(currentParagraph);
                        }
                        currentParagraph.content.push(node);
                    } else {
                        currentParagraph = null; // Break paragraph
                        finalContent.push(node);
                    }
                }

                console.log(`   🔄 Converted to Rich Text with ${finalContent.length} root blocks.`);

                content.content = {
                    type: 'doc',
                    content: finalContent
                };

                console.log(`💾 Updating "${story.name}"...`);
                await Storyblok.put(`spaces/${SPACE_ID}/stories/${story.id}`, {
                    story: {
                        content: content,
                    },
                    publish: 0,
                });
                console.log(`✅ Updated "${story.name}"`);

            } else {
                console.log(`⏭️  Skipping "${story.name}" - content is already Rich Text (or empty)`);
            }

        } catch (error) {
            console.error(`❌ Error:`, error.message);
        }
    }

    console.log('✨ Migration complete!');
}

migrateImages().catch(console.error);
