import StoryblokClient from 'storyblok-js-client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

const Storyblok = new StoryblokClient({
    oauthToken: process.env.STORYBLOK_PERSONAL_TOKEN,
});

const SPACE_ID = process.env.STORYBLOK_SPACE_ID;

async function checkContentState() {
    console.log('🔍 Checking content state...');

    const { data } = await Storyblok.get(`spaces/${SPACE_ID}/stories`, {
        filter_query: {
            component: {
                in: 'blogPost',
            },
        },
        per_page: 100,
    });

    const stories = data.stories;

    for (const storyMeta of stories) {
        try {
            const { data: fullStoryData } = await Storyblok.get(`spaces/${SPACE_ID}/stories/${storyMeta.id}`, {
                token: process.env.STORYBLOK_PERSONAL_TOKEN,
            });

            const story = fullStoryData.story;
            const content = story.content;

            console.log(`\nStory: "${story.name}"`);
            console.log(`   Content Type: ${typeof content.content}`);
            if (typeof content.content === 'string') {
                console.log(`   ✅ State: Raw HTML String (Ready for migration)`);
                console.log(`   Preview: ${content.content.substring(0, 50)}...`);
            } else if (typeof content.content === 'object') {
                console.log(`   ⚠️ State: Rich Text Object`);
                // Check if it has images
                const hasImages = JSON.stringify(content.content).includes('"type":"image"');
                console.log(`   Has Images: ${hasImages}`);
            } else {
                console.log(`   ❓ State: Unknown (${content.content})`);
            }

        } catch (error) {
            console.error(`❌ Error:`, error.message);
        }
    }
}

checkContentState().catch(console.error);
