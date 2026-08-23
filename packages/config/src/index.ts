/**
 * Placement-agnostic configuration (spec FR-027/028).
 *
 * The Observatory can be mounted standalone on the Fortitude corporate domain
 * or as a section of the OSPulse site. Every host-specific value lives here and
 * is injected at deploy time; no host is hard-coded. This keeps the standalone
 * vs OSPulse-section decision a deployment variable, not a rewrite.
 */

export interface BrandConfig {
  /** Display name shown in the header and titles. */
  name: string;
  /** Design-token set to apply (matches the Fortitude / OSPulse house style). */
  themeTokenSet: string;
}

export interface OspulseOnRampConfig {
  /** Whether the honest OSPulse on-ramp is shown (spec FR-025). */
  enabled: boolean;
  /** Where the on-ramp links to. */
  href: string;
}

export interface ObservatoryConfig {
  /** Canonical base URL used for links, canonical tags, and sitemaps. */
  baseUrl: string;
  brand: BrandConfig;
  ospulseOnRamp: OspulseOnRampConfig;
}

export const DEFAULT_CONFIG: ObservatoryConfig = {
  baseUrl: "https://observatory.fortitude-omnis.group",
  brand: {
    name: "The Observatory",
    themeTokenSet: "fortitude",
  },
  ospulseOnRamp: {
    enabled: true,
    href: "https://ospulse.fortitude-omnis.group",
  },
};

/**
 * Load configuration, overlaying environment variables on the defaults so that
 * deployment (standalone vs OSPulse-section) is a matter of env, not code.
 */
export function loadConfig(
  env: Record<string, string | undefined> = process.env,
): ObservatoryConfig {
  const onRampEnabled = env.OBSERVATORY_ONRAMP_ENABLED;
  return {
    baseUrl: env.OBSERVATORY_BASE_URL ?? DEFAULT_CONFIG.baseUrl,
    brand: {
      name: env.OBSERVATORY_BRAND_NAME ?? DEFAULT_CONFIG.brand.name,
      themeTokenSet:
        env.OBSERVATORY_THEME ?? DEFAULT_CONFIG.brand.themeTokenSet,
    },
    ospulseOnRamp: {
      enabled:
        onRampEnabled === undefined
          ? DEFAULT_CONFIG.ospulseOnRamp.enabled
          : onRampEnabled === "true",
      href: env.OBSERVATORY_ONRAMP_HREF ?? DEFAULT_CONFIG.ospulseOnRamp.href,
    },
  };
}
