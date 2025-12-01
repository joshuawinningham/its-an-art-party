import fs from 'fs';
import path from 'path';
import xml2js from 'xml2js';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

const filePath = path.join(process.cwd(), 'it039sanartparty.WordPress.2025-11-21.xml');
const outputDir = path.join(process.cwd(), 'src/content/blog');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced'
});

// Custom rule for images to keep them as HTML or standard markdown
// For now, standard markdown is fine, but we might want to handle captions if possible.
// Turndown handles images by default, but let's see if we need custom handling.

async function migrate() {
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
            const slug = post['wp:post_name'][0];
            const date = post.pubDate[0];
            const description = post.description ? post.description[0] : '';

            // Extract first image as hero image if available
            const $ = cheerio.load(contentHtml);
            let heroImage = '';
            const firstImg = $('img').first();
            if (firstImg.length > 0) {
                heroImage = firstImg.attr('src') || '';
                // Optional: remove the first image from content if it's used as hero
                // firstImg.remove(); 
            }

            // Convert HTML to Markdown
            // We might need to clean up some WordPress specific classes or tags
            let markdown = turndownService.turndown(contentHtml);

            // Create Frontmatter
            const frontmatter = [
                '---',
                `title: "${title.replace(/"/g, '\\"')}"`,
                `description: "${description.replace(/"/g, '\\"')}"`,
                `pubDate: "${new Date(date).toISOString()}"`,
                `author: "Robin Winningham"`,
                heroImage ? `heroImage: "${heroImage}"` : '',
                '---',
                '',
                ''
            ].filter(line => line !== '').join('\n');

            const fileContent = frontmatter + markdown;
            const outputPath = path.join(outputDir, `${slug}.md`);

            fs.writeFileSync(outputPath, fileContent);
            console.log(`Created ${slug}.md`);
        }

        console.log('Migration complete!');

    } catch (err) {
        console.error('Error parsing XML:', err);
    }
}

migrate();
