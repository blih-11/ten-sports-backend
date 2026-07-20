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
  // Ad + affiliate slots. Nothing here requires a redeploy to change --
  // editors can flip ads on/off, swap the AdSense client ID, or point any
  // slot at an affiliate banner/link straight from the admin UI.
  //
  // Each "slot" field is type 'json' with shape:
  //   AdSense:   { type: 'adsense', slotId: '1234567890' }
  //   Affiliate: { type: 'affiliate', imageUrl, linkUrl, altText, label }
  //   Off:       { type: 'empty' }
  monetization: [
    { sectionKey: 'ads_enabled',           label: 'Ads Enabled (master switch)', group: 'Global',   type: 'boolean', content: false, order: 1 },
    { sectionKey: 'adsense_client_id',     label: 'AdSense Publisher ID (ca-pub-...)', group: 'Global', type: 'text', content: '', order: 2 },
    { sectionKey: 'responsible_gambling_note', label: 'Responsible Gambling Footer Note', group: 'Global', type: 'text',
      content: '18+ only. Gambling can be addictive, please play responsibly. If you have a gambling problem, call the NLRC helpline or self-exclude with your operator.', order: 3 },
    { sectionKey: 'slot_home_leaderboard',    label: 'Home — Leaderboard Slot',      group: 'Slots', type: 'json', content: { type: 'empty' }, order: 4 },
    { sectionKey: 'slot_article_leaderboard', label: 'Article Page — In-body Leaderboard Slot', group: 'Slots', type: 'json', content: { type: 'empty' }, order: 5 },
    { sectionKey: 'slot_article_rectangle',   label: 'Article Page — Sidebar Rectangle Slot', group: 'Slots', type: 'json', content: { type: 'empty' }, order: 6 },
    { sectionKey: 'slot_article_square',      label: 'Article Page — Sidebar Square Slot', group: 'Slots', type: 'json', content: { type: 'empty' }, order: 7 },
    { sectionKey: 'slot_category_leaderboard',label: 'Category Page — Leaderboard Slot', group: 'Slots', type: 'json', content: { type: 'empty' }, order: 8 },
    { sectionKey: 'slot_category_rectangle',  label: 'Category Page — Rectangle Slot', group: 'Slots', type: 'json', content: { type: 'empty' }, order: 9 },
    { sectionKey: 'slot_team_rectangle',      label: 'Team Page — Rectangle Slot',   group: 'Slots', type: 'json', content: { type: 'empty' }, order: 10 },
    { sectionKey: 'slot_competition_leaderboard', label: 'Competition Page — Leaderboard Slot', group: 'Slots', type: 'json', content: { type: 'empty' }, order: 11 },
    { sectionKey: 'slot_transfers_rectangle', label: 'Transfers Page — Rectangle Slot', group: 'Slots', type: 'json', content: { type: 'empty' }, order: 12 },
    { sectionKey: 'slot_match_affiliate',      label: 'Match Page — Affiliate Callout', group: 'Slots', type: 'json', content: { type: 'empty' }, order: 13 },
  ],

  // Single long-form field each, matching the DEFAULT_CONTENT fallback
  // baked into src/pages/PrivacyPolicy.jsx and TermsOfUse.jsx on the
  // frontend -- this just gets that same starting draft into the admin so
  // it's editable from day one instead of needing "Add Field" first.
  // IMPORTANT: this is a starting draft, not reviewed legal advice --
  // have someone qualified review it (especially liability/governing law,
  // and the gambling-affiliate clause below) before treating it as final,
  // and replace [DATE] with the real date.
  privacy: [
    { sectionKey: 'content', label: 'Privacy Policy Text', group: 'Content', type: 'richtext', order: 0, content: `Last updated: [DATE]

Tave Sports ("Tave Sports", "we", "us", or "our") operates this website (the "Site"). This Privacy Policy explains what information we collect, how we use it, and the choices you have.

## Information We Collect

We collect a very small amount of personal information:

Information you give us directly: if you sign up for our newsletter, we collect the email address you provide. If you contact us through the Contact page, we collect your name, email address and message.

Information collected automatically: like most websites, we use Google Analytics to understand how visitors use the Site. This collects standard usage data such as pages viewed, time on page, approximate location (derived from IP address), device and browser type, and referring website. We do not control what Google Analytics collects beyond its standard settings.

## Cookies and Advertising

This Site displays advertising through Google AdSense, and in some places affiliate links to third-party betting/gambling operators. Google and its partners may use cookies and similar technologies to serve ads based on your prior visits to this or other websites. You can review and adjust how Google personalizes ads for you at Google's Ads Settings (adssettings.google.com), and you can read Google's own policy on this at policies.google.com/technologies/ads.

Google Analytics also sets its own cookies to distinguish visitors and sessions.

Most browsers let you block or delete cookies through their settings. Blocking cookies may affect how parts of the Site work.

## How We Use Information

We use the information above to: operate and improve the Site; send the newsletter to people who sign up for it; understand traffic and readership through analytics; and respond to messages sent through the Contact page.

We do not sell your personal information.

## Third-Party Services

We use a small number of third-party services to run this Site: Google Analytics (site analytics), Google AdSense (advertising), and a cloud image-hosting provider for photos used on the Site. Each of these providers processes data under their own privacy policies.

## Your Choices

You can unsubscribe from the newsletter at any time using the link in any newsletter email, or by contacting us directly. You can ask us to delete an email address from our newsletter list by contacting us at the address below. You can control cookies through your browser settings, and control Google's ad personalization through Google's Ads Settings linked above.

## Children's Privacy

This Site is not directed at children, and we do not knowingly collect personal information from children.

## Data Security

We take reasonable steps to protect the information we hold, but no method of storage or transmission over the internet is completely secure.

## International Visitors

This Site is accessible globally. Depending on where you're located, the third-party services above (Google and our image host) may process your information on servers outside your country, including outside Nigeria.

## Changes to This Policy

We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last updated" date.

## Contact Us

Questions about this policy can be sent through our Contact page.` },
  ],

  terms: [
    { sectionKey: 'content', label: 'Terms of Use Text', group: 'Content', type: 'richtext', order: 0, content: `Last updated: [DATE]

Welcome to Tave Sports. By accessing or using this website (the "Site"), you agree to these Terms of Use. If you don't agree with them, please don't use the Site.

## Use of the Site

You may view, read and share individual articles for personal, non-commercial use. You may not republish, redistribute, scrape, or reproduce Site content in bulk, or use it for commercial purposes, without our prior written permission.

## Intellectual Property

Original articles, text, graphics, logos and the overall design of this Site are owned by Tave Sports, unless otherwise noted. All rights not expressly granted here are reserved.

Images on this Site come from a mix of sources: our own photography, wire/stock photos licensed from services like Getty Images or AP (embedded directly from their platform under their license terms, not hosted or owned by us), free-to-use stock photography from sites like Unsplash or Pexels (used under those platforms' own license terms), and, occasionally, social media posts embedded directly from the original platform. In each case, rights to that image remain with its original photographer, licensor, or the platform it was embedded from — we don't claim ownership over third-party images, including team badges, kits, and player photos, which belong to their respective clubs, leagues, or federations.

If you believe an image on this Site is being used incorrectly or without proper rights, please contact us and we'll review and correct it.

## Accounts and Conduct

Most of the Site is available without an account. You agree not to use the Site to violate any law, attempt to gain unauthorized access to our systems, interfere with the Site's normal operation, or upload anything harmful (such as malware).

## Advertising and Affiliate Links

This Site displays advertising, including through Google AdSense, and may include affiliate links to third-party betting and gambling operators. If you click one of these links, you leave this Site and become subject to that operator's own terms, privacy policy, and licensing. We may receive a commission if you sign up or place a bet through such a link — this does not cost you anything extra, but you should know the relationship exists. We do not operate any betting or gambling service ourselves, are not a party to any bet you place, and are not responsible for a third-party operator's conduct, payouts, or licensing status in your jurisdiction.

Betting and gambling products referenced or linked from this Site are intended for individuals 18 years of age or older (or the legal age in your jurisdiction, if higher), and only where legal. It is your responsibility to confirm that gambling is legal for you to access, wherever you are. If you or someone you know has a gambling problem, contact the National Lottery Regulatory Commission (NLRC) helpline or use an operator's self-exclusion tools.

## Newsletter

Signing up for our newsletter is optional and requires only an email address. You can unsubscribe at any time.

## Third-Party Links

The Site may link to other websites we don't control, including the betting/gambling operators described above. We aren't responsible for the content, accuracy, or practices of any third-party site.

## Accuracy of Content

We aim to report scores, fixtures, transfers and news accurately, but sports information can change quickly (postponed matches, late team news, transfer reversals) and errors can occur. If you believe something we've published is inaccurate, please contact us and we'll review it. Content on the Site is provided "as is" without warranties of any kind.

## Limitation of Liability

To the fullest extent permitted by law, Tave Sports is not liable for any indirect, incidental, or consequential damages arising from your use of the Site, including decisions made based on scores, fixtures, or other information published here, or from any transaction with a third-party operator reached through an affiliate link on this Site.

## Changes to These Terms

We may update these Terms from time to time. Continued use of the Site after changes are posted means you accept the updated Terms.

## Governing Law

These Terms are governed by the laws of the Federal Republic of Nigeria.

## Contact Us

Questions about these Terms can be sent through our Contact page.` },
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
