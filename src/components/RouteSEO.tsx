import { Helmet } from 'react-helmet-async';
import { buildCanonical, getSiteUrl } from '@/lib/utils';

type SEOProps = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noindex?: boolean;
  keywords?: string[];
  type?: 'website' | 'article' | 'profile' | 'product';
  publishedTime?: string;
  modifiedTime?: string;
};

const DEFAULT_TITLE = 'Emotions App – Mood Mentors, Support Groups, Resources, Mood Tracking';
const DEFAULT_DESC = 'Emotions App connects you with professional Mood Mentors, support groups, journaling, mood tracking, and evidence-based resources for emotional wellbeing.';
const DEFAULT_IMAGE = '/og-image.png';

export function RouteSEO({
  title,
  description,
  path = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/',
  image = DEFAULT_IMAGE,
  noindex = false,
  keywords = [],
  type = 'website',
  publishedTime,
  modifiedTime,
}: SEOProps) {
  const fullTitle = title ? `${title} | Emotions App` : DEFAULT_TITLE;
  const fullDesc = description || DEFAULT_DESC;
  const canonical = buildCanonical(path);
  const site = getSiteUrl();

  const ogImage = image.startsWith('http') ? image : `${site}${image}`;
  const robots = noindex ? 'noindex, nofollow' : 'index, follow';
  const kw = keywords.length ? keywords.join(', ') : 'mental health, mood mentor, therapy, support groups, journaling, mood tracking, resources, wellbeing, anxiety, stress, depression';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={fullDesc} />
      <meta name="keywords" content={kw} />
      <link rel="canonical" href={canonical} />
      <meta name="robots" content={robots} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDesc} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content="Emotions App" />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content="Emotions App" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={fullDesc} />
      <meta name="twitter:image" content={ogImage} />

      {/* Article structured meta */}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}

      {/* LLM-friendly hints */}
      <meta name="llm:domain" content="emotionsapp.org" />
      <meta name="llm:topics" content="mental health, therapist matching, mood tracking, support groups, journaling, resources" />
    </Helmet>
  );
}

export function NoIndex() {
  return (
    <Helmet>
      <meta name="robots" content="noindex, nofollow" />
      <meta name="googlebot" content="noindex, nofollow" />
    </Helmet>
  );
}


