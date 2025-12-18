# WordPress Headless CMS Setup Guide

This guide explains how to set up a **fresh WordPress installation** as a headless CMS for your Astro site.

> [!IMPORTANT]
> **Fresh Install Approach**: Always create a new WordPress installation specifically for headless CMS use. Do not convert an existing WordPress site in-place — this avoids plugin conflicts, legacy theme issues, and configuration problems.

---

## Current Setup (It's an Art Party)

| Item | Value |
|------|-------|
| **WordPress Admin** | `https://wordpress-961579-6054503.cloudwaysapps.com/wp-admin` |
| **REST API Base** | `https://wordpress-961579-6054503.cloudwaysapps.com/wp-json/wp/v2/` |
| **Hosting** | Cloudways (Basic WordPress / Lightning Stack) |
| **Plugin** | Secure Custom Fields (SCF) |
| **Status** | ✅ Setup complete, Home Page migration automated |

**Completed:**
- [x] Fresh WordPress installed
- [x] SCF plugin installed
- [x] `functions.php` code added (Services CPT + REST API + SCF/ACF Update Endpoint)
- [x] SCF/ACF field groups imported (`docs/acf-field-groups.json`)
- [x] Media imported from old site
- [x] Home Page SCF fields configured
- [x] Automated migration script created (`scripts/migrate-to-wordpress.mjs`)
- [x] Custom REST endpoint for SCF updates (`/itsanartparty/v1/update-acf/{id}`)

**Remaining:**
- [ ] Create Services (Kids Birthdays, Art Lessons)
- [ ] Configure subdomain (`cms.itsanartparty.com`)
- [ ] Set up Vercel deploy webhook
- [ ] Update Astro Home page to fetch from WordPress API

## Transition Strategy: Running Sites in Parallel

If your client has an existing WordPress site, run both sites during transition:

```
┌─────────────────────────────────────────┐
│     EXISTING WordPress Site             │
│     www.clientsite.com                  │
│     (Keep running during development)   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│     NEW WordPress (Headless CMS)        │
│     cms.clientsite.com (or subdomain)   │
│     • Fresh install, headless-only      │
│     • Import content from existing site │
└────────────────┬────────────────────────┘
                 │ REST API
                 ▼
┌─────────────────────────────────────────┐
│     New Astro Frontend                  │
│     staging.clientsite.com → then www   │
└─────────────────────────────────────────┘
```

**Workflow:**
1. Set up fresh WordPress at a subdomain (e.g., `cms.clientsite.com`)
2. Export content from existing site (Tools → Export)
3. Import into fresh WordPress (Tools → Import)
4. Build and test Astro frontend on staging
5. When ready, point `www` to Astro and keep `cms` for content management

---

## Required Plugin

Only **one plugin** is required:

- **Secure Custom Fields (SCF)** - Free fork of ACF with all PRO features
  - Install from: WordPress Admin → Plugins → Add New → Search "Secure Custom Fields"
  - Or download from: https://wordpress.org/plugins/secure-custom-fields/
  - Cost: **Free** (includes Repeater, Gallery, Flexible Content — all the PRO features)

> [!TIP]
> Secure Custom Fields is a community-maintained fork of ACF that includes all PRO features for free. It uses the same API as ACF, so any ACF tutorials or documentation will work.

Everything else is handled with code (see below).

---

## Theme Setup

Add all the following code to your theme's `functions.php` file, or create a custom plugin.

### 1. Remove Services Custom Post Type
**Update:** Since we have migrated Services to standard Pages, you should now **REMOVE** the `register_post_type('services', ...)` code from your `functions.php`.

1. Open `functions.php`.
2. Find the function `itsanartparty_register_services_post_type`.
3. **Delete** the entire function and the `add_action` line below it.
4. This will remove the "Services" menu item from your WordPress Admin.

---

### 1b. Disable Gutenberg Block Editor for Services and Pages

Since all content is entered via ACF fields, the Gutenberg block editor is unnecessary and confusing for content editors. Add this to disable it for Services and Pages (Blog Posts keep Gutenberg for freeform content):

```php
/**
 * Disable Gutenberg block editor for Services and Pages (content is SCF/ACF-only)
 */
add_filter('use_block_editor_for_post_type', function($use, $post_type) {
    // Disable for Services and Pages (all content via SCF/ACF)
    if (in_array($post_type, ['services', 'page'])) {
        return false;
    }
    return $use;
}, 10, 2);

/**
 * Remove content editor and excerpt support from Services and Pages (only SCF/ACF fields needed)
 */
add_action('init', function() {
    // Services: remove editor and excerpt (all content via SCF/ACF)
    remove_post_type_support('services', 'editor');
    remove_post_type_support('services', 'excerpt');
    
    // Pages: remove editor (all content via SCF/ACF)
    remove_post_type_support('page', 'editor');
}, 100);
```

This removes the "Type / to choose a block" prompt and block inserter (+), leaving only the title and ACF fields. Blog Posts retain Gutenberg for freeform content.

---

### 2. Expose ACF Fields in REST API

This replaces the **ACF to REST API** plugin:

```php
/**
 * Add ACF fields to REST API responses
 */
function itsanartparty_add_acf_to_rest_api() {
    // Add ACF fields to posts
    register_rest_field('post', 'acf', array(
        'get_callback' => 'itsanartparty_get_acf_fields',
        'schema'       => null,
    ));

    // Add ACF fields to pages
    register_rest_field('page', 'acf', array(
        'get_callback' => 'itsanartparty_get_acf_fields',
        'schema'       => null,
    ));

    // Add ACF fields to services (Note: 'acf' key is standard for both ACF and SCF plugins)
    register_rest_field('services', 'acf', array(
        'get_callback' => 'itsanartparty_get_acf_fields',
        'schema'       => null,
    ));
}
add_action('rest_api_init', 'itsanartparty_add_acf_to_rest_api');

/**
 * Get ACF fields for a post
 */
function itsanartparty_get_acf_fields($object) {
    $post_id = $object['id'];
    
    // Check if ACF is active
    if (!function_exists('get_fields')) {
        return null;
    }
    
    $fields = get_fields($post_id);
    
    // Process image fields to include full URLs
    if ($fields) {
        $fields = itsanartparty_process_acf_images($fields);
    }
    
    return $fields ? $fields : null;
}

/**
 * Recursively process ACF fields to expand image data
 */
function itsanartparty_process_acf_images($fields) {
    if (!is_array($fields)) {
        return $fields;
    }
    
    foreach ($fields as $key => $value) {
        // Handle image fields (ACF returns array with 'url', 'id', etc.)
        if (is_array($value) && isset($value['ID']) && isset($value['url'])) {
            // Already has full image data, add sizes if missing
            if (!isset($value['sizes'])) {
                $value['sizes'] = array(
                    'medium' => wp_get_attachment_image_url($value['ID'], 'medium'),
                    'large'  => wp_get_attachment_image_url($value['ID'], 'large'),
                    'full'   => wp_get_attachment_image_url($value['ID'], 'full'),
                );
            }
            $fields[$key] = $value;
        }
        // Handle gallery fields (array of images)
        elseif (is_array($value) && !empty($value) && isset($value[0]['ID'])) {
            $fields[$key] = array_map('itsanartparty_process_acf_images', $value);
        }
        // Handle nested arrays/groups
        elseif (is_array($value)) {
            $fields[$key] = itsanartparty_process_acf_images($value);
        }
    }
    
    return $fields;
}
```

---

### 3. Auto-Deploy Webhook on Content Changes

This replaces the **WP Webhooks** plugin:

```php
/**
 * Trigger Vercel deploy when content is published/updated
 */
function itsanartparty_trigger_vercel_deploy($post_id, $post, $update) {
    // Only trigger for published content
    if ($post->post_status !== 'publish') {
        return;
    }
    
    // Only trigger for specific post types
    $allowed_types = array('post', 'page', 'services');
    if (!in_array($post->post_type, $allowed_types)) {
        return;
    }
    
    // Don't trigger for autosaves or revisions
    if (wp_is_post_autosave($post_id) || wp_is_post_revision($post_id)) {
        return;
    }
    
    // Your Vercel deploy hook URL (set this in wp-config.php or here directly)
    $webhook_url = defined('VERCEL_DEPLOY_HOOK') ? VERCEL_DEPLOY_HOOK : '';
    
    if (empty($webhook_url)) {
        return;
    }
    
    // Send POST request to trigger deploy
    wp_remote_post($webhook_url, array(
        'timeout'   => 5,
        'blocking'  => false,  // Don't wait for response
        'sslverify' => true,
    ));
}
add_action('save_post', 'itsanartparty_trigger_vercel_deploy', 10, 3);

/**
 * Also trigger on post deletion
 */
function itsanartparty_trigger_deploy_on_delete($post_id) {
    $post = get_post($post_id);
    if ($post) {
        itsanartparty_trigger_vercel_deploy($post_id, $post, true);
    }
}
add_action('before_delete_post', 'itsanartparty_trigger_deploy_on_delete');
```

Then add your Vercel deploy hook URL to `wp-config.php`:

```php
// Add this to wp-config.php (get URL from Vercel Dashboard → Settings → Git → Deploy Hooks)
define('VERCEL_DEPLOY_HOOK', 'https://api.vercel.com/v1/integrations/deploy/prj_xxx/xxx');
```

---

## Complete functions.php Code

Here's all the code combined for easy copy/paste:

```php
<?php
/**
 * It's an Art Party - Headless CMS Functions
 * Add this to your theme's functions.php
 */

// =============================================================================
### 2. Configure Themes & Functions

In your WordPress theme's `functions.php`, add the following code to expose ACF Data to the API.

> [!NOTE]
> Since we are using standard Pages with Flexible Content, we do NOT need to register a custom post type for Services anymore.

```php
// Expose ACF/SCF fields to REST API
function itsanartparty_add_acf_to_rest_api() {
    register_rest_field(array('page', 'post'), 'acf', array(
        'get_callback' => 'itsanartparty_get_acf_fields',
        'schema'       => null,
    ));
}
add_action('rest_api_init', 'itsanartparty_add_acf_to_rest_api');

function itsanartparty_get_acf_fields($object) {
    if (function_exists('get_fields')) {
        return get_fields($object['id']);
    }
    return null;
}

// Enable Page Excerpts (optional, good for SEO)
add_post_type_support('page', 'excerpt');

// Register Custom Endpoint for Programmatic Updates (Used for Migration Scripts)
function itsanartparty_register_update_endpoint() {
    register_rest_route('itsanartparty/v1', '/update-acf/(?P<id>\d+)', array(
        'methods' => 'POST',
        'callback' => 'itsanartparty_handle_acf_update',
        'permission_callback' => function () {
            return current_user_can('edit_posts');
        }
    ));
}
add_action('rest_api_init', 'itsanartparty_register_update_endpoint');

function itsanartparty_handle_acf_update($request) {
    $post_id = $request['id'];
    $fields = $request->get_json_params();

    if (empty($fields)) {
        return new WP_Error('no_fields', 'No fields provided', array('status' => 400));
    }

    $updated = array();
    foreach ($fields as $key => $value) {
        update_field($key, $value, $post_id);
        $updated[$key] = $value;
    }

    return array('success' => true, 'updated' => $updated);
}
```

### 3. Import Field Groups (SCF)

Instead of manually creating field groups, you can import the pre-configured **Page Builder** field group.

1.  Go to **SCF (Custom Fields) > Tools** in WordPress admin.
2.  Under **Import Field Groups**, upload the file: `docs/scf-page-builder.json` (from this repository).
3.  Click **Import File**.

This will create the "Page Builder" flexible content group and assign it to all **Pages**.

### 4. Migrate Content

Since we are moving from "Services" to "Pages", you need to migrate your content.

1.  Run the automated migration script:
    ```bash
    node scripts/convert-services-to-pages.mjs
    ```
2.  This script will:
    *   Read your existing "kids-birthdays" and "art-lessons" services.
    *   Create new Pages with the same slugs.
    *   Convert your content into "Page Builder" blocks automatically.

### 5. Deployment

1.  **Commit & Push**: Push your changes to GitHub.
2.  **Vercel**: Vercel will automatically redeploy the site.
3.  **Verify**: Check that `/kids-birthdays` and `/art-lessons` load correctly.
ds;
}


// =============================================================================
// 3. VERCEL AUTO-DEPLOY WEBHOOK
// =============================================================================

function itsanartparty_trigger_vercel_deploy($post_id, $post, $update) {
    if ($post->post_status !== 'publish') {
        return;
    }
    
    $allowed_types = array('post', 'page', 'services');
    if (!in_array($post->post_type, $allowed_types)) {
        return;
    }
    
    if (wp_is_post_autosave($post_id) || wp_is_post_revision($post_id)) {
        return;
    }
    
    $webhook_url = defined('VERCEL_DEPLOY_HOOK') ? VERCEL_DEPLOY_HOOK : '';
    
    if (empty($webhook_url)) {
        return;
    }
    
    wp_remote_post($webhook_url, array(
        'timeout'   => 5,
        'blocking'  => false,
        'sslverify' => true,
    ));
}
add_action('save_post', 'itsanartparty_trigger_vercel_deploy', 10, 3);

function itsanartparty_trigger_deploy_on_delete($post_id) {
    $post = get_post($post_id);
    if ($post) {
        itsanartparty_trigger_vercel_deploy($post_id, $post, true);
    }
}
add_action('before_delete_post', 'itsanartparty_trigger_deploy_on_delete');


// =============================================================================
// 4. CUSTOM REST ENDPOINT FOR ACF UPDATES (Migration Script Support)
// =============================================================================

/**
 * Register custom REST endpoint for updating ACF fields programmatically
 * Used by: scripts/migrate-to-wordpress.mjs
 */
add_action('rest_api_init', function() {
    register_rest_route('itsanartparty/v1', '/update-acf/(?P<id>\d+)', array(
        'methods'  => 'POST',
        'callback' => 'itsanartparty_update_acf_fields',
        'permission_callback' => function() {
            return current_user_can('edit_posts');
        },
        'args' => array(
            'id' => array(
                'validate_callback' => function($param) {
                    return is_numeric($param);
                }
            ),
        ),
    ));
});

function itsanartparty_update_acf_fields($request) {
    $post_id = $request['id'];
    $fields = $request->get_json_params();
    
    if (!function_exists('update_field')) {
        return new WP_Error('acf_not_active', 'ACF/SCF is not active', array('status' => 500));
    }
    
    $updated = array();
    foreach ($fields as $field_name => $field_value) {
        $result = update_field($field_name, $field_value, $post_id);
        $updated[$field_name] = $result;
    }
    
    return array('success' => true, 'updated' => $updated);
}
```

---

## SCF/ACF Field Groups

### 1. Service Page Fields

**Field Group Name**: Service Page Fields  
**Location**: Post Type == Services

| Field Name | Field Type | Instructions |
|------------|------------|--------------|
| **Hero Section** | Group | |
| └ subtitle | Text | Short subtitle below the title |
| └ quote | Text | Quote with attribution (e.g., "Quote text" Author Name) |
| └ hero_image | Image | Return: Array |
| **Main Content** | Group | |
| └ section_title | Text | e.g., "Canvas Paint Parties" |
| └ description | WYSIWYG | Main description content |
| └ pricing_text | Text | e.g., "All parties are $240 for up to 8 children..." |
| └ features | Repeater | |
| └── feature_text | Text | e.g., "Starting From $240" |
| **Gallery** | Group | |
| └ gallery_images | Gallery | Return: Array |
| **Detail Cards** | Repeater | 4 colored info cards |
| └ color | Color Picker | Background color (hex) |
| └ title | Text | e.g., "What to Wear" |
| └ description | Textarea | Card description |
| └ icon | Select | Options: shirt, brush, gift, person |
| **What to Expect** | Group | |
| └ what_to_expect_title | Text | Section title |
| └ what_to_expect_content | WYSIWYG | Section content |
| └ what_to_expect_image | Image | Return: Array |
| **CTA Section** | Group | |
| └ cta_title | Text | e.g., "Plan Your Party Today!" |
| └ cta_subtitle | Text | e.g., "Call or Text: 980-253-4829" |
| **SEO** | Group | |
| └ seo_description | Textarea | Meta description for the page |

---

### 2. About Page Fields

**Field Group Name**: About Page Fields  
**Location**: Page == About (or page slug == about)

| Field Name | Field Type | Instructions |
|------------|------------|--------------|
| **Hero** | Group | |
| └ subtitle_quote | Text | Quote displayed in page header |
| **Intro Section** | Group | |
| └ intro_image | Image | Robin's photo |
| └ intro_text | Textarea | Opening paragraph |
| └ owner_name | Text | e.g., "Robin Winningham" |
| └ owner_title | Text | e.g., "Artist and Owner" |
| **About Me** | Group | |
| └ about_me_content | WYSIWYG | Full about me content |
| **Why Choose Section** | Group | |
| └ why_choose_title | Text | Section title |
| └ why_choose_description | Textarea | Section intro text |
| └ why_choose_features | Repeater | |
| └── feature_text | Text | e.g., "Professional Planning" |
| └ collage_images | Gallery | 6 images for the collage |
| **Policies Section** | Group | |
| └ policies_title | Text | e.g., "Other Policies" |
| └ policies_subtitle | Text | Subtitle text |
| └ policies | Repeater | |
| └── icon_color | Select | teal, yellow, pink, blue |
| └── title | Text | e.g., "Age Limitation" |
| └── description | Textarea | Policy description |
| **CTA** | Group | |
| └ cta_title | Text | e.g., "Ready to Book Your Party?" |
| **SEO** | Group | |
| └ seo_description | Textarea | Meta description |

---

### 3. Contact Page Fields

**Field Group Name**: Contact Page Fields  
**Location**: Page == Contact (or page slug == contact)

| Field Name | Field Type | Instructions |
|------------|------------|--------------|
| **Form Section** | Group | |
| └ form_title | Text | e.g., "Request a Party" |
| └ form_subtitle | Textarea | Instructions above the form |
| **Hear From You Section** | Group | |
| └ hear_from_you_title | Text | Section title |
| └ hear_from_you_text | WYSIWYG | Contact info text |
| └ hear_from_you_image | Image | Section image |
| **Contact Info** | Group | |
| └ contact_title | Text | e.g., "Get In Touch" |
| └ address | Textarea | Full address |
| └ phone | Text | Phone number |
| └ email | Email | Email address |
| **Social Links** | Repeater | |
| └ platform | Select | facebook, twitter, youtube, instagram, pinterest |
| └ url | URL | Profile URL |
| **Map** | Group | |
| └ map_embed_url | URL | Google Maps embed URL |
| **Newsletter** | Group | |
| └ newsletter_title | Text | e.g., "Newsletter" |
| └ newsletter_subtitle | Text | Subtitle text |
| **SEO** | Group | |
| └ seo_description | Textarea | Meta description |

---

## Vercel Deploy Hook Setup

### Step 1: Create Deploy Hook in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (its-an-art-party)
3. Go to **Settings** → **Git**
4. Scroll down to **Deploy Hooks**
5. Click **Create Hook**
6. Name it: `WordPress Content Update`
7. Select branch: `main` (or your production branch)
8. Click **Create Hook**
9. **Copy the webhook URL**

### Step 2: Add to wp-config.php

Add this line to your `wp-config.php` file (before "That's all, stop editing!"):

```php
define('VERCEL_DEPLOY_HOOK', 'https://api.vercel.com/v1/integrations/deploy/prj_xxx/xxx');
```

Replace the URL with your actual deploy hook URL from Step 1.

---

## REST API Endpoints

After setup, these endpoints will be available:

| Endpoint | Description |
|----------|-------------|
| `/wp-json/wp/v2/posts` | Blog posts |
| `/wp-json/wp/v2/services` | Service pages |
| `/wp-json/wp/v2/pages?slug=about` | About page |
| `/wp-json/wp/v2/pages?slug=contact` | Contact page |

Add `?_embed=true` to include featured images and author data.

---

## Environment Variables

Add to your Astro project's `.env` file:

```env
WORDPRESS_API_URL=https://www.itsanartparty.com/wp-json
```

For Vercel deployment, add this environment variable in:
Vercel Dashboard → Project → Settings → Environment Variables

---

## Testing the Setup

1. **Test REST API**: Visit `https://wordpress-961579-6054503.cloudwaysapps.com/wp-json/wp/v2/posts` in your browser
2. **Test Services**: Visit `https://wordpress-961579-6054503.cloudwaysapps.com/wp-json/wp/v2/services`
3. **Test SCF fields**: Check that `acf` object appears in API responses (SCF uses the same `acf` key)
4. **Test webhook**: Edit a post and verify Vercel triggers a new deployment

---

## URL Structure

All pages are at root-level URLs:

| Content Type | URL Example |
|--------------|-------------|
| Blog posts | `/how-to-host-your-own-paint-party` |
| Kids Birthdays | `/kids-birthdays` |
| Art Lessons | `/art-lessons` |
| About | `/about` |
| Contact | `/contact` |
| Blog listing | `/blog` |

**Redirects**: Old `/blog/slug` URLs automatically redirect to `/slug`.

---

## After Adding the Code

1. **Flush permalinks**: Go to Settings → Permalinks and click **Save Changes**
2. **Verify Services menu**: You should see "Services" in the WordPress admin menu
3. **Test the REST API**: Visit `/wp-json/wp/v2/services` to confirm it works
