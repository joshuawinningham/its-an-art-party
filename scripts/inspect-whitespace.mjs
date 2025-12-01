import StoryblokClient from 'storyblok-js-client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

const Storyblok = new StoryblokClient({
    oauthToken: process.env.STORYBLOK_PERSONAL_TOKEN,
});

const SPACE_ID = process.env.STORYBLOK_SPACE_ID;
const STORY_ID = 114372476461958; // "How to Host Your Own Paint Party At Home"

async function inspectContent() {
    console.log(`🔍 Fetching story ${STORY_ID}...`);

    try {
        const { data } = await Storyblok.get(`spaces/${SPACE_ID}/stories/${STORY_ID}`, {
            token: process.env.STORYBLOK_PERSONAL_TOKEN,
        });

        const story = data.story;
        const content = story.content;

        if (content.content && content.content.content) {
            console.log(`📝 Content Nodes (${content.content.content.length}):`);
            content.content.content.forEach((node, index) => {
                let summary = node.type;
                if (node.type === 'paragraph') {
                    if (!node.content || node.content.length === 0) {
                        summary += ' [EMPTY]';
                    } else {
                        const textContent = node.content.map(c => c.text || '').join('');
                        if (!textContent.trim()) {
                            summary += ' [WHITESPACE ONLY]';
                        } else {
                            summary += ` ("${textContent.substring(0, 20)}...")`;
                        }
                    }
                } else if (node.type === 'image') {
                    summary += ` (src: ${node.attrs?.src?.substring(0, 20)}...)`;
                }
                console.log(`   ${index}: ${summary}`);
            });
        }

    } catch (error) {
        console.error(`❌ Error:`, error.message);
    }
}

inspectContent().catch(console.error);
