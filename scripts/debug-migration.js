import * as cheerio from 'cheerio';

function htmlToRichText(html) {
    const $ = cheerio.load(html, { xmlMode: false });
    const content = [];

    function processNode(node) {
        if (node.type === 'text') {
            const text = $(node).text();
            // Don't trim here, whitespace might be significant between inline elements
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
                        content: children.filter(c => c.type === 'text' || c.type === 'hard_break') // Headings usually only contain text
                    }];
                }

                // If it's a list
                if (node.name === 'ul' || node.name === 'ol') {
                    // Lists are complex, let's simplify: just extract text for now or handle strictly if needed.
                    // But wait, we want to flatten images out of lists too? That breaks the list.
                    // For now, let's just return the children. If an image is in a list, it will break the list structure in Storyblok
                    // but at least it will appear.
                    // Actually, let's just return children for everything else and let the top-level aggregator group them into paragraphs.
                    return children;
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

const sampleHtml = `
<p>Here is some text.</p>
<p>
    Text before image.
    <img src="https://example.com/nested-image.jpg" alt="Nested Image" />
    Text after image.
</p>
<img src="https://example.com/image.jpg" alt="An example image" title="Image Caption" />
<p>More text.</p>
`;

console.log(JSON.stringify(htmlToRichText(sampleHtml), null, 2));
