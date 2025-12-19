/**
 * WordPress REST API Client
 * 
 * This module provides functions to fetch content from WordPress
 * acting as a headless CMS.
 */

// WordPress API base URL - set in environment variables
// For production: cms.itsanartparty.com hosts the WordPress backend
const WP_API_URL = import.meta.env.WORDPRESS_API_URL || 'https://cms.itsanartparty.com/wp-json';

// =============================================================================
// Type Definitions
// =============================================================================

/** WordPress Media Object */
export interface WPMedia {
  id: number;
  source_url: string;
  alt_text: string;
  media_details: {
    width: number;
    height: number;
    sizes: {
      [key: string]: {
        source_url: string;
        width: number;
        height: number;
      };
    };
  };
}

/** WordPress Post (Blog) */
export interface WPPost {
  id: number;
  slug: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  excerpt: {
    rendered: string;
  };
  date: string;
  modified: string;
  featured_media: number;
  _embedded?: {
    'wp:featuredmedia'?: WPMedia[];
    author?: Array<{
      name: string;
      avatar_urls: { [key: string]: string };
    }>;
  };
  acf?: {
    description?: string;
    author?: string;
  };
}

/** Flexible Content Block Types */
export type ACFBlock =
  | HeroBlock
  | TextImageBlock
  | FeatureGridBlock
  | GalleryBlock
  | CtaBlock;

export interface HeroBlock {
  acf_fc_layout: 'hero_section';
  headline: string;
  subheadline?: string;
  image?: ACFGalleryImage;
  quote?: string;
  button_text?: string;
  button_link?: string;
}

export interface TextImageBlock {
  acf_fc_layout: 'text_image_block';
  title?: string;
  content: string;
  image?: ACFGalleryImage;
  image_position: 'left' | 'right';
  pricing_text?: string;
  features?: Array<{ text: string }>;
}

export interface FeatureGridBlock {
  acf_fc_layout: 'feature_grid';
  title?: string;
  items: Array<{
    color: string;
    icon: string;
    title: string;
    description: string;
  }>;
}

export interface GalleryBlock {
  acf_fc_layout: 'gallery_block';
  images: ACFGalleryImage[];
}

export interface CtaBlock {
  acf_fc_layout: 'cta_banner';
  title: string;
  subtitle?: string;
  link?: string;
}

/** WordPress Page with Flexible Content */
export interface WPPage {
  id: number;
  slug: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  acf: {
    // Flexible Content Builder (Generic Pages)
    page_builder?: ACFBlock[];

    // Legacy Service Fields (Migrated Service Pages)
    hero_section?: {
      headline: string;
      subheadline?: string;
      image?: any; // ID or object depending on return format
      quote?: string;
      button_text?: string;
      button_link?: string;
    };
    main_content?: {
      section_title?: string;
      description?: string;
      pricing_text?: string;
      features?: Array<{ feature_text: string }>;
      image?: any;
    };
    gallery?: {
      gallery_images?: ACFGalleryImage[];
    };
    detail_cards?: Array<{
      color: string;
      icon: string;
      title: string;
      description: string;
    }>;
    what_to_expect?: {
      what_to_expect_title?: string;
      what_to_expect_content?: string;
      what_to_expect_image?: any;
    };
    cta_section?: {
      cta_title?: string;
      cta_subtitle?: string;
      cta_link?: string;
    };

    // SEO (common across all generic pages)
    seo?: {
      seo_description?: string;
    };

    // Legacy / Specific Page Fields (kept for type safety if mixed)
    [key: string]: unknown;
  };
  _embedded?: {
    'wp:featuredmedia'?: WPMedia[];
  };
}

/** ACF Feature Item (for service pages) */
export interface ACFFeature {
  icon?: string;
  title: string;
  description?: string;
}

/** ACF Detail Card (for service pages) */
export interface ACFDetailCard {
  color: string;
  icon?: string;
  title: string;
  description: string;
}

/** ACF Gallery Image */
export interface ACFGalleryImage {
  id: number;
  url: string;
  alt: string;
  sizes: {
    medium?: string;
    large?: string;
    full?: string;
  };
}

/** ACF Policy Item (for about page) */
export interface ACFPolicy {
  icon_color: string;
  title: string;
  description: string;
}

/** ACF Social Link */
export interface ACFSocialLink {
  platform: string;
  url: string;
}

/** ACF Feature Item for repeater field */
export interface ACFFeatureItem {
  feature_text: string;
}

/** Service Custom Post Type with ACF fields (nested group structure) */
export interface WPService {
  id: number;
  slug: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  _embedded?: {
    'wp:featuredmedia'?: WPMedia[];
  };
  acf: {
    // Hero Section (group)
    hero_section?: {
      subtitle?: string;
      quote?: string;
      hero_image?: ACFGalleryImage | false;
    };

    // Main Content (group)
    main_content?: {
      section_title?: string;
      description?: string;
      pricing_text?: string;
      features?: ACFFeatureItem[];
    };

    // Gallery (group)
    gallery?: {
      gallery_images?: ACFGalleryImage[];
    };

    // Detail Cards (repeater - not in a group)
    detail_cards?: ACFDetailCard[];

    // What to Expect (group)
    what_to_expect?: {
      what_to_expect_title?: string;
      what_to_expect_content?: string;
      what_to_expect_image?: ACFGalleryImage | false;
    };

    // CTA Section (group)
    cta_section?: {
      cta_title?: string;
      cta_subtitle?: string;
    };

    // SEO (group)
    seo?: {
      seo_description?: string;
    };
  };
}

/** About Page ACF Fields */
export interface WPAboutPage extends WPPage {
  acf: {
    // Hero Section (group)
    hero?: {
      subtitle_quote?: string;
    };

    // Intro Section (group)
    intro_section?: {
      intro_image?: ACFGalleryImage;
      intro_text?: string;
      owner_name?: string;
      owner_title?: string;
    };

    // About Me Section (group)
    about_me?: {
      about_me_content?: string;
    };

    // Why Choose Section (group)
    why_choose_section?: {
      why_choose_title?: string;
      why_choose_description?: string;
      why_choose_features?: Array<{ feature_text: string }>;
      collage_images?: ACFGalleryImage[];
    };

    // Policies Section (group)
    policies_section?: {
      policies_title?: string;
      policies_subtitle?: string;
      policies?: ACFPolicy[];
    };

    // CTA (group)
    cta?: {
      cta_title?: string;
    };

    // SEO (group)
    seo?: {
      seo_description?: string;
    };
  };
}

/** Contact Page ACF Fields */
export interface WPContactPage extends WPPage {
  acf: {
    // Form Section
    form_title?: string;
    form_subtitle?: string;

    // Hear From You Section
    hear_from_you_title?: string;
    hear_from_you_text?: string;
    hear_from_you_image?: ACFGalleryImage;

    // Contact Info
    contact_title?: string;
    address?: string;
    phone?: string;
    email?: string;

    // Social Links
    social_links?: ACFSocialLink[];

    // Map
    map_embed_url?: string;

    // Newsletter
    newsletter_title?: string;
    newsletter_subtitle?: string;

    // SEO
    seo_description?: string;
  };
}

/** Home Page ACF Fields */
export interface WPHomePage {
  id: number;
  slug: string;
  title: { rendered: string };
  content: { rendered: string };
  acf: {
    // Hero Section
    hero_section?: {
      hero_headline?: string;
      hero_subheadline?: string;
      hero_description?: string;
      hero_button_text?: string;
      hero_button_link?: string;
      hero_image?: ACFGalleryImage;
    };

    // Feature Cards (Repeater)
    feature_cards?: Array<{
      title: string;
      description: string;
      image?: ACFGalleryImage; // May be null if only text populated initially
    }>;

    // About Section
    about_section?: {
      title?: string;
      content?: string;
      art_lessons_title?: string;
      art_lessons_content?: string;
      zip_codes?: string;
      image?: ACFGalleryImage;
    };

    // Testimonials (Repeater)
    testimonials?: Array<{
      quote: string;
      author: string;
      image?: ACFGalleryImage;
    }>;

    // Press Section
    press_section?: {
      press_logos?: ACFGalleryImage[];
    };

    // SEO
    seo?: {
      seo_description?: string;
    };
  };
}

// =============================================================================
// API Fetch Helper
// =============================================================================

/**
 * Generic fetch helper with error handling
 */
async function wpFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${WP_API_URL}${endpoint}`);

  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`WordPress API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch from WordPress: ${endpoint}`, error);
    throw error;
  }
}

// =============================================================================
// Blog Posts
// =============================================================================

/**
 * Fetch all published blog posts
 */
export async function getPosts(options: {
  perPage?: number;
  page?: number;
  orderBy?: 'date' | 'title' | 'modified';
  order?: 'asc' | 'desc';
} = {}): Promise<WPPost[]> {
  const { perPage = 100, page = 1, orderBy = 'date', order = 'desc' } = options;

  return wpFetch<WPPost[]>('/wp/v2/posts', {
    per_page: perPage.toString(),
    page: page.toString(),
    orderby: orderBy,
    order: order,
    _embed: 'true', // Include featured media and author
  });
}

/**
 * Fetch a single blog post by slug
 */
export async function getPost(slug: string): Promise<WPPost | null> {
  const posts = await wpFetch<WPPost[]>('/wp/v2/posts', {
    slug: slug,
    _embed: 'true',
  });

  return posts.length > 0 ? posts[0] : null;
}

/**
 * Get all post slugs (for static path generation)
 */
export async function getPostSlugs(): Promise<string[]> {
  const posts = await getPosts({ perPage: 100 });
  return posts.map(post => post.slug);
}

// =============================================================================
// Pages
// =============================================================================

/**
 * Fetch a page by slug
 */
export async function getPage<T extends WPPage = WPPage>(slug: string): Promise<T | null> {
  const pages = await wpFetch<T[]>('/wp/v2/pages', {
    slug: slug,
    _embed: 'true',
  });

  return pages.length > 0 ? pages[0] : null;
}

/**
 * Fetch the About page with ACF fields
 */
export async function getAboutPage(): Promise<WPAboutPage | null> {
  return getPage<WPAboutPage>('about');
}

/**
 * Fetch the Contact page with ACF fields
 */
export async function getContactPage(): Promise<WPContactPage | null> {
  return getPage<WPContactPage>('contact');
}

/**
 * Fetch the Home page with ACF fields
 */
export async function getHomePage(): Promise<WPHomePage | null> {
  // Try fetching page with slug 'home', 'homepage', or ID if known. 
  // Standard WP home often has slug 'home' or is set as front page.
  // We can try fetching by slug 'home' first.
  let page = await getPage<WPHomePage>('home');
  return page;
}

/**
 * Fetch the Kids Birthdays page with ACF fields
 */
export async function getKidsBirthdaysPage(): Promise<WPPage | null> {
  return getPage<WPPage>('kids-birthdays');
}

/**
 * Fetch the Art Lessons page with ACF fields
 */
export async function getArtLessonsPage(): Promise<WPPage | null> {
  return getPage<WPPage>('art-lessons');
}

// =============================================================================
// Media
// =============================================================================

/**
 * Fetch a media item by ID
 */
export async function getMedia(id: number): Promise<WPMedia | null> {
  try {
    return await wpFetch<WPMedia>(`/wp/v2/media/${id}`);
  } catch {
    return null;
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Strip HTML tags from a string
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Decode HTML entities
 */
export function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
    '&#39;': "'",
    '&#8217;': "'",
    '&#8216;': "'",
    '&#8220;': '"',
    '&#8221;': '"',
    '&#8211;': '–',
    '&#8212;': '—',
    '&#8230;': '…',
    '&nbsp;': ' ',
    '&rsquo;': "'",
    '&lsquo;': "'",
    '&rdquo;': '"',
    '&ldquo;': '"',
    '&ndash;': '–',
    '&mdash;': '—',
    '&hellip;': '…',
    '&apos;': "'",
  };

  return text.replace(/&[^;]+;/g, (entity) => entities[entity] || entity);
}

/**
 * Format a WordPress date string
 */
export function formatDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', options || {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Get featured image URL from embedded media
 */
export function getFeaturedImageUrl(post: WPPost | WPService | WPPage, size: 'medium' | 'large' | 'full' = 'large'): string | null {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  if (!media) return null;

  // Try to get requested size, fall back to source_url
  return media.media_details?.sizes?.[size]?.source_url || media.source_url;
}

/**
 * Get author name from embedded author data
 */
export function getAuthorName(post: WPPost): string {
  // scf/acf field compatibility: 'acf' key is used by both plugins
  return post._embedded?.author?.[0]?.name || post.acf?.author || 'Robin Winningham';
}

/**
 * Extract excerpt text from HTML, only using paragraph content (not headings)
 * This provides cleaner excerpts by skipping h1-h6 tags
 */
export function getExcerptText(html: string, maxLength: number = 150): string {
  // Remove WordPress block comments
  const cleanHtml = html.replace(/<!--.*?-->/gs, '');

  // Match only paragraph tags and extract their content
  const paragraphMatches = cleanHtml.match(/<p[^>]*>(.*?)<\/p>/gs);

  if (!paragraphMatches || paragraphMatches.length === 0) {
    // Fallback: strip all HTML and return
    return stripHtml(cleanHtml).substring(0, maxLength) + '...';
  }

  // Extract text from paragraphs, skipping empty ones
  let excerptText = '';
  for (const p of paragraphMatches) {
    const text = stripHtml(p).trim();
    if (text && text.length > 0) {
      excerptText += (excerptText ? ' ' : '') + text;
      if (excerptText.length >= maxLength) break;
    }
  }

  // Truncate to max length
  if (excerptText.length > maxLength) {
    excerptText = excerptText.substring(0, maxLength).trim() + '...';
  } else if (excerptText.length > 0) {
    excerptText = excerptText + '...';
  }

  return decodeHtmlEntities(excerptText);
}

