import StoryblokClient from 'storyblok-js-client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

const Storyblok = new StoryblokClient({
    oauthToken: process.env.STORYBLOK_PERSONAL_TOKEN,
});

const SPACE_ID = process.env.STORYBLOK_SPACE_ID;

async function debugContent() {
    console.log('🔍 Fetching all blog posts...');

    const { data } = await Storyblok.get(`spaces/${SPACE_ID}/stories`, {
        filter_query: {
            component: {
                in: 'blogPost',
            },
        },
        per_page: 100,
        version: 'draft',
    });

    const stories = data.stories;
    console.log(`📝 Found ${stories.length} blog posts`);

    for (const story of stories) {
        console.log('\n---');
        console.log('Story:', story.name);
        console.log('Content keys:', Object.keys(story.content || {}));
        console.log('Content.content type:', typeof story.content?.content);
        console.log('Content.content value:', JSON.stringify(story.content?.content, null, 2).substring(0, 500));
    }
}

debugContent().catch(console.error);
