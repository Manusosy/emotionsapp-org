import { Helmet } from 'react-helmet-async';
import { getSiteUrl } from '@/lib/utils';

export function OrganizationJsonLD() {
  const site = getSiteUrl();
  const json = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Emotions App',
    url: site,
    logo: `${site}/emotions-logo.png`,
    sameAs: [
      'https://www.facebook.com/',
      'https://www.instagram.com/',
      'https://www.linkedin.com/'
    ],
  };
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(json)}</script>
    </Helmet>
  );
}

export function WebsiteJsonLD() {
  const site = getSiteUrl();
  const json = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Emotions App',
    url: site,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${site}/resources?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(json)}</script>
    </Helmet>
  );
}

export function ArticleJsonLD({
  title,
  description,
  url,
  image,
  datePublished,
  dateModified,
  authorName,
  tags,
}: {
  title: string;
  description: string;
  url: string;
  image?: string;
  datePublished: string;
  dateModified: string;
  authorName: string;
  tags?: string[];
}) {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url,
    image,
    datePublished,
    dateModified,
    author: {
      '@type': 'Person',
      name: authorName,
    },
    keywords: tags?.join(', '),
  };
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(json)}</script>
    </Helmet>
  );
}


