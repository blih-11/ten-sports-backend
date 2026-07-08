require('dotenv').config();
const mongoose = require('mongoose');
const PageSection = require('./models/PageSection');

// Starter fields for each admin-managed page. Run this once after deploying
// the PageSection model so the admin UI has something to list/edit right
// away. Safe to re-run -- it only fills in sections that don't exist yet,
// it never overwrites content an editor has already changed.
const PAGE_SECTIONS = {
  home: [
    { sectionKey: 'hero_heading',       label: 'Hero Heading',            group: 'Hero',    type: 'text',  content: 'Your Home For Sports News', order: 1 },
    { sectionKey: 'hero_subheading',    label: 'Hero Subheading',         group: 'Hero',    type: 'text',  content: 'Scores, transfers, and breaking stories — all in one place.', order: 2 },
    { sectionKey: 'promo_banner_image', label: 'Promo Banner Image',      group: 'Promo',   type: 'image', content: { url: '', alt: '' }, order: 3 },
    { sectionKey: 'promo_banner_link',  label: 'Promo Banner Link URL',   group: 'Promo',   type: 'link',  content: '', order: 4 },
    { sectionKey: 'latest_news_heading',label: '"Latest News" Section Heading', group: 'Sections', type: 'text', content: 'Latest News', order: 5 },
    { sectionKey: 'seo_meta_title',     label: 'SEO Meta Title',          group: 'SEO',     type: 'text',  content: '', order: 6 },
    { sectionKey: 'seo_meta_description', label: 'SEO Meta Description',  group: 'SEO',     type: 'text',  content: '', order: 7 },
  ],
  sports: [
    { sectionKey: 'page_heading',       label: 'Page Heading',            group: 'Header',  type: 'text',  content: 'Sports', order: 1 },
    { sectionKey: 'page_subheading',    label: 'Page Subheading',         group: 'Header',  type: 'text',  content: 'Explore every league and competition we cover.', order: 2 },
    { sectionKey: 'banner_image',       label: 'Banner Image',            group: 'Header',  type: 'image', content: { url: '', alt: '' }, order: 3 },
    { sectionKey: 'seo_meta_title',     label: 'SEO Meta Title',          group: 'SEO',     type: 'text',  content: '', order: 4 },
    { sectionKey: 'seo_meta_description', label: 'SEO Meta Description',  group: 'SEO',     type: 'text',  content: '', order: 5 },
  ],
  'results': [
    { sectionKey: 'page_heading',       label: 'Page Heading',            group: 'Header',  type: 'text',  content: 'Results & Fixtures', order: 1 },
    { sectionKey: 'page_subheading',    label: 'Page Subheading',         group: 'Header',  type: 'text',  content: 'Every match, past and upcoming.', order: 2 },
    { sectionKey: 'empty_state_message',label: 'Empty State Message',     group: 'Content', type: 'text',  content: 'No fixtures scheduled right now — check back soon.', order: 3 },
    { sectionKey: 'seo_meta_title',     label: 'SEO Meta Title',          group: 'SEO',     type: 'text',  content: '', order: 4 },
    { sectionKey: 'seo_meta_description', label: 'SEO Meta Description',  group: 'SEO',     type: 'text',  content: '', order: 5 },
  ],
  transfers: [
    { sectionKey: 'page_heading',       label: 'Page Heading',            group: 'Header',  type: 'text',  content: 'Transfers', order: 1 },
    { sectionKey: 'page_subheading',    label: 'Page Subheading',         group: 'Header',  type: 'text',  content: 'The latest transfer news and rumours.', order: 2 },
    { sectionKey: 'banner_image',       label: 'Banner Image',            group: 'Header',  type: 'image', content: { url: '', alt: '' }, order: 3 },
    { sectionKey: 'seo_meta_title',     label: 'SEO Meta Title',          group: 'SEO',     type: 'text',  content: '', order: 4 },
    { sectionKey: 'seo_meta_description', label: 'SEO Meta Description',  group: 'SEO',     type: 'text',  content: '', order: 5 },
  ],
  about: [
    { sectionKey: 'hero_heading',       label: 'Hero Heading',            group: 'Hero',    type: 'text',  content: 'About Ten Sports', order: 1 },
    { sectionKey: 'hero_subheading',    label: 'Hero Subheading',         group: 'Hero',    type: 'text',  content: 'Your number one source for sports news, analysis and opinion.', order: 2 },
    { sectionKey: 'who_we_are_heading', label: '"Who We Are" Heading',    group: 'Who We Are', type: 'text', content: 'Who We Are', order: 3 },
    { sectionKey: 'who_we_are_body',    label: '"Who We Are" Body',       group: 'Who We Are', type: 'richtext', content: 'Ten Sports is a digital sports media platform dedicated to delivering fast, accurate and engaging sports content across football, NBA, tennis and more.\n\nFounded by passionate sports fans, we believe everyone deserves access to quality sports journalism — from breaking transfer news to in-depth tactical analysis.', order: 4 },
    { sectionKey: 'what_we_cover_heading', label: '"What We Cover" Heading', group: 'What We Cover', type: 'text', content: 'What We Cover', order: 5 },
    { sectionKey: 'what_we_cover_items', label: '"What We Cover" List (one per line)', group: 'What We Cover', type: 'richtext', content: 'Football — Premier League, UCL, La Liga & more\nNBA — EuroLeague & more\nTennis — ATP, WTA, Grand Slams\nTransfers — Breaking news & rumours\nAnalysis — Tactical breakdowns & opinion', order: 6 },
    { sectionKey: 'stats',              label: 'Stats (JSON: [{number,label}])', group: 'Stats', type: 'json', content: [{ number: '4.2K+', label: 'Followers' }, { number: '1M+', label: 'Monthly Views' }, { number: '1.8K+', label: 'Articles' }, { number: '10+', label: 'Sports Covered' }], order: 7 },
    { sectionKey: 'cta_heading',        label: 'Bottom CTA Heading',      group: 'Join Us', type: 'text', content: 'Join Our Team', order: 8 },
    { sectionKey: 'cta_body',           label: 'Bottom CTA Body',         group: 'Join Us', type: 'text', content: "Are you a passionate sports writer or journalist? We'd love to hear from you.", order: 9 },
    { sectionKey: 'seo_meta_title',     label: 'SEO Meta Title',          group: 'SEO',     type: 'text',  content: 'About Us — Ten Sports', order: 10 },
    { sectionKey: 'seo_meta_description', label: 'SEO Meta Description',  group: 'SEO',     type: 'text',  content: '', order: 11 },
  ],
  contact: [
    { sectionKey: 'hero_heading',       label: 'Hero Heading',            group: 'Hero',    type: 'text',  content: 'Contact Us', order: 1 },
    { sectionKey: 'hero_subheading',    label: 'Hero Subheading',         group: 'Hero',    type: 'text',  content: 'Got a story tip, advertising enquiry or just want to say hi?', order: 2 },
    { sectionKey: 'contact_email',      label: 'Email',                   group: 'Contact Details', type: 'text', content: 'hello@tensports.com', order: 3 },
    { sectionKey: 'contact_twitter',    label: 'Twitter Handle',          group: 'Contact Details', type: 'text', content: '@TenSports', order: 4 },
    { sectionKey: 'contact_facebook',   label: 'Facebook Page Name',      group: 'Contact Details', type: 'text', content: 'Ten Sports', order: 5 },
    { sectionKey: 'contact_location',   label: 'Location',                group: 'Contact Details', type: 'text', content: 'Lagos, Nigeria', order: 6 },
    { sectionKey: 'seo_meta_title',     label: 'SEO Meta Title',          group: 'SEO',     type: 'text',  content: 'Contact Us — Ten Sports', order: 7 },
    { sectionKey: 'seo_meta_description', label: 'SEO Meta Description',  group: 'SEO',     type: 'text',  content: '', order: 8 },
  ],
};

async function seedPageSections() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    let created = 0;
    let skipped = 0;

    for (const [page, sections] of Object.entries(PAGE_SECTIONS)) {
      for (const section of sections) {
        const existing = await PageSection.findOne({ page, sectionKey: section.sectionKey });
        if (existing) {
          console.log(`  skipped (exists): ${page} / ${section.sectionKey}`);
          skipped++;
          continue;
        }
        await PageSection.create({ page, ...section });
        console.log(`  created: ${page} / ${section.sectionKey}`);
        created++;
      }
    }

    console.log(`\nDone -- ${created} created, ${skipped} skipped`);
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seedPageSections();
