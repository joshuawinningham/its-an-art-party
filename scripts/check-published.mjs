import StoryblokClient from 'storyblok-js-client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

const Storyblok = new StoryblokClient({
    oauthToken: process.env.STORYBLOK_PERSONAL_TOKEN,
});

const SPACE_ID = process.env.STORYBLOK_SPACE_ID;
const STORY_ID = 114372476461958; // "How to Host Your Own Paint Party At Home"

async function checkPublished() {
    console.log(`🔍 Fetching PUBLISHED version of story ${STORY_ID}...`);

    try {
        const { data } = await Storyblok.get(`spaces/${SPACE_ID}/stories/${STORY_ID}`, {
            token: process.env.STORYBLOK_PERSONAL_TOKEN,
            version: 'published'
        });

        const story = data.story;
        const content = story.content;

        console.log(`📝 Content type: ${typeof content.content}`);
        if (typeof content.content === 'string') {
            console.log("✅ Found raw HTML in published version!");
            console.log("Preview:", content.content.substring(0, 100));
        } else {
            console.log("❌ Published version is also Rich Text (or empty).");
        }

    } catch (error) {
        console.error(`❌ Error:`, error.message);
    }
}

checkPublished().catch(console.error);
