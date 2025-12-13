# Content Migration Guide

This guide explains how to migrate content to a **fresh WordPress installation** for headless CMS use.

> [!TIP]
> **Two Migration Scenarios**: This guide covers both (A) migrating from an existing WordPress site and (B) entering content manually from Astro source files.

---

## Migration Architecture

```
┌─────────────────────────────────────────┐
│     SOURCE: Pick One                    │
│     • Existing WordPress site           │
│     • Astro Markdown/content files      │
└────────────────┬────────────────────────┘
                 │ Export/Copy
                 ▼
┌─────────────────────────────────────────┐
│     NEW WordPress (Headless CMS)        │
│     Fresh install at cms.domain.com     │
│     • SCF plugin installed              │
│     • ACF field groups imported         │
│     • Custom post types registered      │
└─────────────────────────────────────────┘
```

---

## Prerequisites

Before migrating content, ensure your **fresh WordPress install** has:

1. WordPress installed at your chosen domain/subdomain
2. **Secure Custom Fields (SCF)** plugin installed (see `wordpress-setup.md`)
3. Theme `functions.php` code added (custom post types, REST API, webhook)
4. ACF field groups created or imported from `acf-field-groups.json`

---

## Scenario A: Migrating from Existing WordPress Site

If the client has an existing WordPress site with content to preserve:

### Step 1: Export from Existing Site

1. Go to **existing site** WordPress Admin → Tools → Export
2. Select **All content** (or specific post types)
3. Click **Download Export File** (creates XML file)

### Step 2: Import to Fresh WordPress

1. Go to **new headless WordPress** → Tools → Import
2. Click **WordPress** → Install the importer if prompted
3. Upload the XML file from Step 1
4. Check **Download and import file attachments** to bring media
5. Assign authors as needed

### What Gets Imported
- ✅ Posts and pages (titles, content, dates, slugs)
- ✅ Categories and tags
- ✅ Media library (images, files)
- ✅ Authors/users
- ⚠️ ACF/custom field data (only if field groups match)
- ❌ Theme settings, widgets, menus (not needed for headless)

### Step 3: Set Up Custom Fields

After import, you'll need to:
1. Create/map ACF field groups for your structured content
2. Edit imported posts/pages to fill in custom fields
3. For Services, create new entries in the Services custom post type


---

## Scenario C: Automated Migration (Recommended)

For content already existing in the Astro project (like the Home page), use the automated migration script.

### How it Works

The script (`scripts/migrate-to-wordpress.mjs`):
1. Reads the local `.env` file for WordPress credentials
2. Extracts content from hardcoded Astro components
3. Authenticates with the WordPress REST API
4. Creates or updates pages and populates ACF fields via a custom endpoint

### Usage

1. **Configure Environment**: Ensure your `.env` has:
   ```env
   WORDPRESS_API_URL=https://your-site.com/wp-json
   WORDPRESS_USERNAME=your_username
   WORDPRESS_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
   ```

2. **Run the Script**:
   ```bash
   # Test connection
   node scripts/migrate-to-wordpress.mjs test
   
   # Migrate Home Page
   node scripts/migrate-to-wordpress.mjs home
   ```

### Supported Content
- ✅ Home Page (Hero, Features, About, Testimonials, SEO)
- 🚧 Other pages coming soon (Services, About, Contact)

---

## Scenario B: Entering Content from Astro Source Files

If starting fresh or content exists in Astro Markdown files:

### 1. Blog Posts

### Existing Blog Posts

The following blog posts need to be created in WordPress:

#### Post 1: How to Host Your Own Paint Party

- **Title**: How to Host Your Own Paint Party
- **Slug**: `how-to-host-your-own-paint-party`
- **Publish Date**: (check existing markdown file)
- **Author**: Robin Winningham
- **Content**: Copy from `src/content/blog/how-to-host-your-own-paint-party.md`

#### Post 2: Homeschool Art Projects

- **Title**: Homeschool Art Projects
- **Slug**: `homeschool-art-projects`
- **Publish Date**: (check existing markdown file)
- **Author**: Robin Winningham
- **Content**: Copy from `src/content/blog/homeschool-art-projects.md`

#### Post 3: How to Start a Paint Party Business

- **Title**: How to Start a Paint Party Business
- **Slug**: `how-to-start-a-paint-party-business`
- **Publish Date**: (check existing markdown file)
- **Author**: Robin Winningham
- **Content**: Copy from `src/content/blog/how-to-start-a-paint-party-business.md`

### Steps to Migrate Blog Posts

1. Go to WordPress Admin → Posts → Add New
2. Enter the title
3. Set the slug in the URL/Permalink settings
4. Paste the content (convert Markdown to WordPress blocks or use Classic Editor)
5. Set the publish date to match the original
6. Add a featured image if applicable
7. Fill in ACF fields:
   - `description`: SEO description for the post
   - `author`: "Robin Winningham"
8. Click Publish

---

### 2. Service Pages

### Kids Birthdays Service

Create a new Service with:

**Basic Info:**
- **Title**: PARTIES FOR KIDS
- **Slug**: `kids-birthdays`

**ACF Fields:**

```
Hero Section:
- subtitle: (leave empty or add custom)
- quote: "The world is but a canvas to the imagination." Henry David Thoreau

Main Content:
- section_title: Canvas Paint Parties
- description: 
  Paint parties are a great way to celebrate while exploring art with family and friends!
  
  **Customize any project** based on the birthday theme or the personal taste of the birthday boy or girl.

- pricing_text: All parties are $240 for up to 8 children. Add $20 for each additional child. A $75 non-refundable deposit is due at the time of booking and will be applied to the total amount on the day of the party.

- features:
  1. Starting From $240
  2. Unlimited Design Themes
  3. Up To 25 Guests
  4. 1 - 2 Hours (45-60 minute painting time)
  5. Free Planning and Consultation

Gallery:
- Upload 9 images from src/assets/images/ (kids party photos)

Detail Cards:
1. Color: #5BBAB5, Icon: shirt, Title: What to Wear, Description: Dress for fun in clothes that will get a little messy and/or bring a smock to wear.
2. Color: #F5C024, Icon: brush, Title: Art Supplies, Description: I bring the supplies to you and they are included in the party price.
3. Color: #EF6490, Icon: gift, Title: Party Favors, Description: Guests get to take their custom painting home to display as a party favor!
4. Color: #2B80B0, Icon: person, Title: Instruction, Description: I provide professional instruction for painting with hands-on help and guidance.

What to Expect:
- what_to_expect_title: What to Expect
- what_to_expect_content: Party planning includes selecting a theme for canvas designs a week in advance of the party. I will create black and white outline designs ahead of time on each canvas for the kids to paint during the party. Upon arrival, I will set up tables with all of the art supplies (tables not included). Painting will take approximately 45-60 minutes. I will clean up all art supplies and prepare your tables for other activities of your choosing (food and drinks not included). If there is anything else I can do to assist during the party, just ask! I am here to help. Most parties only require access to trash cans and sinks.
- what_to_expect_image: Upload art-diary-picasso-quote.jpg

CTA:
- cta_title: Plan Your Party Today!
- cta_subtitle: Call or Text: 980-253-4829

SEO:
- seo_description: Kids canvas paint party packages in Charlotte starting at $240 for up to 8 children. Mobile birthday parties with all supplies, setup & cleanup included. Custom themes available!
```

### Art Lessons Service

Create a new Service with:

**Basic Info:**
- **Title**: KIDS ART LESSONS
- **Slug**: `art-lessons`

**ACF Fields:**

```
Hero Section:
- quote: "Creativity is intelligence having fun." Albert Einstein

Main Content:
- section_title: KIDS ART LESSONS ARE NOW AVAILABLE!
- description: (Copy intro content from art-lessons.astro)
- pricing_text: Art lessons are available Monday-Friday. All supplies are included. A $25 non-refundable deposit is required at the time of scheduling.

(Continue with remaining fields from art-lessons.astro)

SEO:
- seo_description: Kids art lessons in Charlotte, NC starting at $45. Private one-on-one or small group instruction for ages 4+. Mobile lessons at your home with all supplies included.
```

---

### 3. About Page

1. Go to WordPress Admin → Pages
2. Find or create the "About" page
3. Set slug to `about`
4. Fill in ACF fields:

```
Hero:
- subtitle_quote: "You can't use up creativity. The more you use, the more you have." Maya Angelou

Intro Section:
- intro_image: Upload robin-winningham.jpg
- intro_text: I started It's an Art Party as a way to combine my passion for art with my love for children. There is no greater feeling than watching a child light up when given the encouragement and opportunity to create something on their own.
- owner_name: Robin Winningham
- owner_title: Artist and Owner

About Me:
- about_me_content: (Copy full about me content from about.astro)

Why Choose Section:
- why_choose_title: Why Choose It's an Art Party?
- why_choose_description: I will work behind the scenes to create a custom design for a canvas painting that kids can take home as a party favor.
- why_choose_features:
  1. Professional Planning
  2. Unlimited Party Themes
  3. Hassle Free Options
  4. Affordable Prices
- collage_images: Upload 6 images

Policies Section:
- policies_title: Other Policies
- policies_subtitle: Read more about what to expect and contact me with any questions.
- policies:
  1. icon_color: teal, title: Age Limitation, description: All parties are intended for ages 4 and up.
  2. icon_color: yellow, title: Food & Drink, description: I do not supply food or drinks.
  3. icon_color: pink, title: Decorations, description: Decorations are up to you, but I can use your theme to design custom canvas.
  4. icon_color: blue, title: Deposit, description: I require a $75 deposit to secure your date/time. This is non-refundable.

CTA:
- cta_title: Ready to Book Your Party?

SEO:
- seo_description: Meet Robin Winningham, founder of It's an Art Party in Charlotte, NC. Learn about our mobile paint party services, policies, and why families trust us for kids' birthday celebrations.
```

---

### 4. Contact Page

1. Go to WordPress Admin → Pages
2. Find or create the "Contact" page
3. Set slug to `contact`
4. Fill in ACF fields:

```
Form Section:
- form_title: Request a Party
- form_subtitle: Please fill out the form below to request more information or schedule a paint party or art lesson.

Hear From You Section:
- hear_from_you_title: I Can't Wait To Hear From You!
- hear_from_you_text: You can also call or text me directly at <a href="tel:9802534829" class="text-brand-pink hover:underline">980-253-4829</a> or send an email to <a href="mailto:robin@itsanartparty.com" class="text-brand-pink hover:underline">robin@itsanartparty.com</a> and I will respond as soon as possible.
- hear_from_you_image: Upload 9.jpg

Contact Info:
- contact_title: Get In Touch
- address: 7845 Colony Rd Ste C4-227
Charlotte, NC 28226
- phone: 980-253-4829
- email: robin@itsanartparty.com

Social Links:
1. platform: facebook, url: https://www.facebook.com/itsanartparty
2. platform: twitter, url: https://twitter.com/itsanartparty
3. platform: youtube, url: https://www.youtube.com/itsanartparty

Map:
- map_embed_url: https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3261.687867696636!2d-80.82646868475515!3d35.16436798031804!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88569f9a7a7a7a7a%3A0x7a7a7a7a7a7a7a7a!2s7845%20Colony%20Rd%20Ste%20C4-227%2C%20Charlotte%2C%20NC%2028226!5e0!3m2!1sen!2sus!4v1620000000000!5m2!1sen!2sus

Newsletter:
- newsletter_title: Newsletter
- newsletter_subtitle: Subscribe to my newsletter to stay updated!

SEO:
- seo_description: Contact It's an Art Party to book your kids paint party or art lesson in Charlotte, NC. Call 980-253-4829 or fill out our online form. Serving Charlotte and surrounding areas.
```

---

---

## Testing After Migration

After migrating all content:

1. **Test Blog Posts**
   - Visit `/blog` - should list all posts
   - Visit `/how-to-host-your-own-paint-party` - should show post content

2. **Test Service Pages**
   - Visit `/kids-birthdays` - should show Kids Birthdays content
   - Visit `/art-lessons` - should show Art Lessons content

3. **Test Static Pages**
   - Visit `/about` - should show About page with WordPress content
   - Visit `/contact` - should show Contact page with WordPress content

4. **Test Redirects**
   - Visit `/blog/post-slug` - should redirect to `/post-slug`

5. **Test Webhook**
   - Edit any content in WordPress
   - Verify Vercel triggers a new deployment
   - After deployment, verify changes appear on the live site

---

## Notes

- Images uploaded to WordPress Media Library will be served from the WordPress domain
- For best performance, consider using a CDN for WordPress media
- The Astro site includes fallback content if WordPress is unavailable
- Form submissions (contact form, newsletter) are handled by Web3Forms, not WordPress

