// ─────────────────────────────────────────────
// JSON-LD structured data components for SEO
// ─────────────────────────────────────────────

interface JsonLdProps {
  data: Record<string, unknown>;
}

/**
 * Serialize data to JSON-LD with HTML-safe encoding.
 * Prevents </script> tag breakout attacks by escaping `<` to \u003c.
 */
function safeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  );
}

/** Site-wide Organization + WebSite schema — placed in root layout. */
export function SiteJsonLd() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "InformedVoter",
    url: "https://knowyourgov.us",
    description:
      "Nonpartisan platform that explains U.S. government — Congress, the Supreme Court, federal agencies, and elections — in plain English.",
    sameAs: ["https://github.com/iamscott53/InformedVoter"],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "InformedVoter",
    url: "https://knowyourgov.us",
    description:
      "Your government, in plain English. Track Congress, Supreme Court rulings, federal agency budgets, campaign finance, and your local ballot.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://knowyourgov.us/search?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <JsonLd data={organization} />
      <JsonLd data={website} />
    </>
  );
}

/** Breadcrumb schema for nested pages. */
export function BreadcrumbJsonLd({
  items,
}: {
  items: Array<{ name: string; url: string }>;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return <JsonLd data={data} />;
}

/** GovernmentOrganization schema for federal agency pages. */
export function AgencyJsonLd({
  name,
  abbreviation,
  url,
  description,
}: {
  name: string;
  abbreviation: string;
  url: string;
  description: string;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "GovernmentOrganization",
    name,
    alternateName: abbreviation,
    url,
    description,
  };

  return <JsonLd data={data} />;
}

/** Person schema for justice profiles. */
export function PersonJsonLd({
  name,
  jobTitle,
  image,
  description,
  url,
}: {
  name: string;
  jobTitle: string;
  image?: string | null;
  description?: string | null;
  url: string;
}) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    jobTitle,
    url,
    worksFor: {
      "@type": "GovernmentOrganization",
      name: "Supreme Court of the United States",
    },
  };
  if (image) data.image = image;
  if (description) data.description = description.slice(0, 300);

  return <JsonLd data={data} />;
}
