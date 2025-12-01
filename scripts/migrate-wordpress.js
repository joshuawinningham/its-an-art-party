import fs from 'fs';
import xml2js from 'xml2js';
import StoryblokClient from 'storyblok-js-client';
import dotenv from 'dotenv';
import * as cheerio from 'cheerio';

dotenv.config({ path: '.env.development' });

const SPACE_ID = process.env.STORYBLOK_SPACE_ID;
const OAUTH_TOKEN = process.env.STORYBLOK_PERSONAL_TOKEN;

// Initialize Storyblok Client
const Storyblok = new StoryblokClient({
    oauthToken: OAUTH_TOKEN,
});

function htmlToRichText(html) {
    const $ = cheerio.load(html, { xmlMode: false });
    const content = [];

    function processNode(node) {
        if (node.type === 'text') {
            const text = $(node).text();
            if (text) {
                return [{ type: 'text', text: text }];
            }
            return [];
        } else if (node.type === 'tag') {
            if (node.name === 'img') {
                const src = $(node).attr('src');
                const alt = $(node).attr('alt');
                const caption = $(node).attr('title');

                return [{
                    type: 'blok',
                    attrs: {
                        body: [
                            {
                                component: 'image',
                                image: {
                                    id: null,
                                    filename: src,
                                    fieldtype: 'asset',
                                },
                                caption: caption || alt || '',
                            },
                        ],
                    },
                }];
            } else if (['br'].includes(node.name)) {
                return [{ type: 'hard_break' }];
            } else {
                // For other tags, process children
                const children = [];
                $(node).contents().each((i, child) => {
                    children.push(...processNode(child));
                });

                // If it's a heading, wrap children in heading
                if (node.name.startsWith('h')) {
                    return [{
                        type: 'heading',
                        attrs: { level: parseInt(node.name.substring(1)) },
                        content: children.filter(c => c.type === 'text' || c.type === 'hard_break')
                    }];
                }

                // If it's a list
                if (node.name === 'ul' || node.name === 'ol') {
                    return children; // Flatten lists for now as per debug script decision
                }

                return children;
            }
        }
        return [];
    }

    const flatNodes = [];
    $('body').contents().each((i, node) => {
        flatNodes.push(...processNode(node));
    });

    // Now group text nodes into paragraphs
    const finalContent = [];
    let currentParagraph = null;

    flatNodes.forEach(node => {
        if (node.type === 'blok' || node.type === 'heading') {
            if (currentParagraph) {
                finalContent.push(currentParagraph);
                currentParagraph = null;
            }
            finalContent.push(node);
        } else {
            // It's text or hard_break
            if (!currentParagraph) {
                currentParagraph = { type: 'paragraph', content: [] };
            }
            currentParagraph.content.push(node);
        }
    });

    if (currentParagraph) {
        finalContent.push(currentParagraph);
    }

    return {
        type: 'doc',
        content: finalContent,
    };
}

async function migrate() {
    if (!OAUTH_TOKEN) {
        console.error('Error: STORYBLOK_PERSONAL_TOKEN is missing in .env.development');
        return;
    }

    const filePath = '/Users/Josh/Desktop/it039sanartparty.WordPress.2025-11-20.xml';

    if (!fs.existsSync(filePath)) {
        console.error(`Error: File not found at ${filePath}`);
        return;
    }

    console.log('Reading WordPress export file...');
    const parser = new xml2js.Parser();
    const xmlData = fs.readFileSync(filePath, 'utf8');

    try {
        const result = await parser.parseStringPromise(xmlData);
        const channel = result.rss.channel[0];
        const posts = channel.item;

        console.log(`Found ${posts.length} items in export.`);

        for (const post of posts) {
            const postType = post['wp:post_type'][0];
            if (postType !== 'post') continue;

            const title = post.title[0];
            const contentHtml = post['content:encoded'][0];
            const slug = post['wp:post_name'][0] + '-' + Math.random().toString(36).substring(7);
            const date = post.pubDate[0];

            console.log(`Migrating: ${title}`);

            const richTextContent = htmlToRichText(contentHtml);

            const story = {
                name: title,
                slug: slug,
                content: {
                    component: 'blogPost',
                    title: title,
                    content: richTextContent,
                    date: date,
                },
            };

            try {
                // Note: This might fail if slug exists. Storyblok API allows upsert with ID, but here we are creating.
                // If it fails, we might need to delete first or update.
                // For now, let's try to create.
                await Storyblok.post(`spaces/${SPACE_ID}/stories`, {
                    story: story,
                });
                console.log(`Successfully created story: ${title}`);
            } catch (error) {
                console.error(`Failed to create story: ${title}`, error.response ? error.response.data : error.message);
            }
        }

        console.log('Migration complete!');

    } catch (err) {
        console.error('Error parsing XML:', err);
    }
}

migrate();
