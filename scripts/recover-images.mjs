import StoryblokClient from 'storyblok-js-client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

const Storyblok = new StoryblokClient({
    oauthToken: process.env.STORYBLOK_PERSONAL_TOKEN,
});

const SPACE_ID = process.env.STORYBLOK_SPACE_ID;
const STORY_ID = 114372476461958; // ID for "How to Host Your Own Paint Party At Home"

const LOST_IMAGES = [
    "https://www.itsanartparty.com/wp-content/uploads/2022/07/paint-party-at-home-smocks-700x480-1.jpeg",
    "https://www.itsanartparty.com/wp-content/uploads/2022/07/living-room-painting-party-700x480-1.jpeg",
    "https://www.itsanartparty.com/wp-content/uploads/2022/07/mermaid-theme-paint-party-kit-700x480-1.jpeg",
    "https://www.itsanartparty.com/wp-content/uploads/2022/07/diy-paint-party-supplies-700x480-1.jpeg",
    "https://www.itsanartparty.com/wp-content/uploads/2022/07/dinosaur-paint-at-home-kit-700x480-1.jpeg",
    "https://www.itsanartparty.com/wp-content/uploads/2022/07/painting-party-at-home-table-setup-700x480-1.jpeg",
    "https://www.itsanartparty.com/wp-content/uploads/2022/07/art-party-clean-up-700x480-1.jpeg",
    "https://www.itsanartparty.com/wp-content/uploads/2022/07/create-your-own-painting-party-700x480-1.jpeg"
];

async function recoverImages() {
    console.log(`🔍 Fetching story ${STORY_ID}...`);

    try {
        const { data } = await Storyblok.get(`spaces/${SPACE_ID}/stories/${STORY_ID}`, {
            token: process.env.STORYBLOK_PERSONAL_TOKEN,
        });

        const story = data.story;
        const content = story.content;

        console.log(`📝 Current content type: ${typeof content.content}`);

        // Ensure content.content is an object (Rich Text)
        if (!content.content || typeof content.content !== 'object') {
            console.error("❌ Content is not in Rich Text format. Please save it in Storyblok first.");
            return;
        }

        // Create image blocks
        const imageBlocks = LOST_IMAGES.map(url => ({
            type: 'image',
            attrs: {
                src: url,
                alt: '',
                title: '',
            }
        }));

        // Append images to the end of the content
        // We'll add a paragraph break before them
        content.content.content = [
            ...(content.content.content || []),
            { type: 'paragraph' },
            ...imageBlocks
        ];

        console.log(`💾 Restoring ${imageBlocks.length} images to "${story.name}"...`);

        await Storyblok.put(`spaces/${SPACE_ID}/stories/${STORY_ID}`, {
            story: {
                content: content,
            },
            publish: 0,
        });

        console.log(`✅ Images restored!`);

    } catch (error) {
        console.error(`❌ Error:`, error.message);
    }
}

recoverImages().catch(console.error);
