/**
 * Organization codes used across different scrapers
 * These are the internal codes used by the system to identify organizations
 */
export const ORGANIZATIONS = {
  'England Hockey - London': '6C3E7C3F9C2B9F',
  'England Hockey - East': '7B3F7A6A2E6D0E',
  'England Hockey - South Central': '1B7D6D1B1C0C8D',
  'England Hockey': '8B9A8A0F8D0C7E',
  'All Associations': '0'
} as const;

export type OrganizationKey = keyof typeof ORGANIZATIONS;
