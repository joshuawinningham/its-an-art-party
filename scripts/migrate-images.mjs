import StoryblokClient from 'storyblok-js-client';
import dotenv from 'dotenv';
import { parseStringPromise } from 'xml2js';

dotenv.config({ path: '.env.development' });

const Storyblok = new StoryblokClient({
    oauthToken: process.env.STORYBLOK_PERSONAL_TOKEN,
});

const SPACE_ID = process.env.STORYBLOK_SPACE_ID;

async function migrateImages() {
    console.log('🔍 Fetching all blog posts...');

    // Get all blog post stories
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
        console.log(`Fetching full content for: ${storyMeta.name} (ID: ${storyMeta.id})`);
        try {
            // Fetch full story content
            const { data: fullStoryData } = await Storyblok.get(`spaces/${SPACE_ID}/stories/${storyMeta.id}`, {
                token: process.env.STORYBLOK_PERSONAL_TOKEN,
            });

            const story = fullStoryData.story;
            const content = story.content;
            let modified = false;

            // Case 1: Content is a string (Raw HTML)
            if (typeof content.content === 'string') {
                console.log(`   Found raw HTML content in "${story.name}"`);

                // Simple regex to find images in the HTML string
                const imgRegex = /<img[^>]+src="([^">]+)"[^>]*>/g;
                let match;
                const images = [];

                while ((match = imgRegex.exec(content.content)) !== null) {
                    const src = match[1];
                    const altMatch = match[0].match(/alt="([^"]*)"/);
                    const alt = altMatch ? altMatch[1] : '';

                    console.log(`   Found image: ${src}`);
                    images.push({ src, alt });
                }

                if (images.length > 0) {
                    console.log(`   🔄 Converting raw HTML to basic Rich Text structure...`);

                    // Create a basic Rich Text structure
                    // We'll preserve the original HTML as a text node (so text isn't lost)
                    // and append the images as blocks

                    // Strip HTML tags for the text content to avoid raw HTML in the editor
                    // This is a simple strip, ideally we'd parse it better but for now this preserves the text
                    const textContent = content.content.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();

                    const newContent = {
                        type: 'doc',
                        content: [
                            {
                                type: 'paragraph',
                                content: [
                                    {
                                        type: 'text',
                                        text: textContent
                                    }
                                ]
                            }
                        ]
                    };

                    // Add images as separate blocks
                    for (const img of images) {
                        newContent.content.push({
                            type: 'image',
                            attrs: {
                                src: img.src,
                                alt: img.alt,
                                title: img.alt,
                            }
                        });
                    }

                    content.content = newContent;
                    modified = true;
                }
            }
            // Case 2: Content is a Rich Text Object
            else if (content.content && typeof content.content === 'object') {
                const richTextContent = content.content;

                // Recursive function to find and replace images in text nodes
                const processNodes = (nodes) => {
                    for (const node of nodes) {
                        if (node.content) {
                            // Check children
                            for (let i = 0; i < node.content.length; i++) {
                                const child = node.content[i];

                                // Check if this is a text node with HTML image
                                if (child.type === 'text' && child.text && child.text.includes('<img')) {
                                    console.log(`   Found HTML image in text node`);
                                    const imgMatch = child.text.match(/<img[^>]+src="([^">]+)"/);
                                    const altMatch = child.text.match(/<img[^>]+alt="([^">]+)"/);

                                    if (imgMatch) {
                                        const imageUrl = imgMatch[1];
                                        const altText = altMatch ? altMatch[1] : '';

                                        console.log(`   Converting to block: ${imageUrl}`);

                                        // Replace the text node with an image block
                                        // Note: This splits the text node. For simplicity, we're replacing the whole node
                                        // if it contains an image, which might lose surrounding text if in the same node.
                                        // A better approach would be to split the text node.

                                        node.content[i] = {
                                            type: 'image',
                                            attrs: {
                                                src: imageUrl,
                                                alt: altText,
                                                title: altText,
                                            },
                                        };
                                        modified = true;
                                    }
                                }

                                // Recurse
                                if (child.content) {
                                    processNodes([child]);
                                }
                            }
                        }
                    }
                };

                processNodes(richTextContent.content || []);
            }

            if (modified) {
                console.log(`💾 Updating "${story.name}"...`);
                await Storyblok.put(`spaces/${SPACE_ID}/stories/${story.id}`, {
                    story: {
                        content: content,
                    },
                    publish: 0,
                });
                console.log(`✅ Updated "${story.name}"`);
            } else {
                console.log(`⏭️  No changes needed for "${story.name}"`);
            }

        } catch (error) {
            console.error(`❌ Error fetching/updating "${storyMeta.name}":`, error.message);
        }
    }

    console.log('✨ Migration complete!');
}

migrateImages().catch(console.error);
