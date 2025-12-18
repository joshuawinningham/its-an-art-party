# Feature Backlog: ACF Flexible Content Page Builder

## Overview

Enable clients to create custom page layouts without developer assistance by implementing an ACF Flexible Content field that provides pre-styled, reusable content blocks.

---

## Problem

Currently, new pages require:
1. Developer creates Astro page file
2. Developer creates ACF field group
3. Developer syncs both together

Clients cannot independently create pages with unique layouts.

---

## Proposed Solution

### ACF Flexible Content Blocks

Create a "Page Builder" field group with these layouts:

| Block Name | Fields | Use Case |
|------------|--------|----------|
| **Hero** | Title, subtitle, background image, CTA button | Page headers |
| **Text + Image** | Heading, content (WYSIWYG), image, layout (left/right) | Content sections |
| **Feature Cards** | Cards repeater (icon, title, description, color) | Highlight features |
| **Gallery** | Gallery images, layout (grid/carousel) | Photo displays |
| **Pricing Table** | Title, items repeater (name, price, features) | Pricing info |
| **CTA Banner** | Title, subtitle, button text, button link | Call to action |
| **FAQ Accordion** | Items repeater (question, answer) | FAQs |
| **Testimonials** | Items repeater (quote, author, image) | Social proof |

---

## Implementation Steps

### 1. ACF Setup (2-3 hours)
- Create "Flexible Page Builder" field group
- Define each layout with sub-fields
- Assign to Pages post type

### 2. Astro Components (4-6 hours)
- Create component for each block type
- `src/components/blocks/HeroBlock.astro`
- `src/components/blocks/TextImageBlock.astro`
- etc.

### 3. Dynamic Page Route (2-3 hours)
- Create `/[...slug].astro` catch-all route
- Fetch page from WordPress API
- Loop through flexible content, render matching components

### 4. Testing & Polish (2-3 hours)
- Test all block combinations
- Responsive design verification
- Client documentation

---

## Estimated Effort

| Phase | Hours |
|-------|-------|
| ACF Setup | 2-3 |
| Astro Components | 4-6 |
| Dynamic Route | 2-3 |
| Testing | 2-3 |
| **Total** | **10-15 hours** |

---

## Dependencies

- Existing ACF field groups must remain compatible
- May want to migrate About/Contact pages to use flexible content (optional)

---

## Priority

**Low** — Current fixed-layout pages meet business needs. Implement when:
- Client frequently requests new page types
- Client wants more independence from developer

---

## Related Files

When implemented, will affect:
- `docs/acf-field-groups.json` — Add flexible content definitions
- `src/components/blocks/` — New block components (create folder)
- `src/pages/[...slug].astro` — Dynamic page renderer
- `docs/wordpress-setup.md` — Document new field group
