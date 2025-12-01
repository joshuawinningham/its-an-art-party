import StoryblokClient from 'storyblok-js-client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

const Storyblok = new StoryblokClient({
    oauthToken: process.env.STORYBLOK_PERSONAL_TOKEN,
});

const SPACE_ID = process.env.STORYBLOK_SPACE_ID;

// Target posts to clean up
const TARGET_POSTS = [
    "How to Host Your Own Paint Party At Home",
    "How to Start a Kids Paint Party Business"
];

async function cleanupWhitespace() {
    console.log('🔍 Fetching stories for cleanup...');

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
            console.log(`Processing "${storyMeta.name}"...`);

            try {
                const { data: fullStoryData } = await Storyblok.get(`spaces/${SPACE_ID}/stories/${storyMeta.id}`, {
                    token: process.env.STORYBLOK_PERSONAL_TOKEN,
                });

                const story = fullStoryData.story;
                const content = story.content;

                if (content.content && content.content.content) {
                    const originalLength = content.content.content.length;

                    // Filter out empty/whitespace paragraphs
                    const cleanContent = content.content.content.filter(node => {
                        if (node.type === 'paragraph') {
                            // Keep if it has no content array (might be valid empty line? usually not needed)
                            if (!node.content || node.content.length === 0) {
                                return false; // Remove empty paragraph
                            }

                            // Check if it has any non-whitespace text or other nodes (like images/links)
                            const hasMeaningfulContent = node.content.some(child => {
                                if (child.type === 'text') {
                                    return child.text && child.text.trim().length > 0;
                                }
                                // Keep other types (hard_break, image, etc.)
                                return true;
                            });

                            return hasMeaningfulContent;
                        }
                        return true; // Keep non-paragraph nodes
                    });

                    const newLength = cleanContent.length;

                    if (newLength < originalLength) {
                        console.log(`   🧹 Removing ${originalLength - newLength} empty/whitespace nodes.`);

                        content.content.content = cleanContent;

                        console.log(`💾 Updating "${story.name}"...`);
                        await Storyblok.put(`spaces/${SPACE_ID}/stories/${story.id}`, {
                            story: {
                                content: content,
                            },
                            publish: 0,
                        });
                        console.log(`✅ Cleaned "${story.name}"`);
                    } else {
                        console.log(`   ✨ No cleanup needed.`);
                    }
                }

            } catch (error) {
                console.error(`❌ Error processing "${storyMeta.name}":`, error.message);
            }
        }
    }

    console.log('✨ Cleanup complete!');
}

cleanupWhitespace().catch(console.error);
