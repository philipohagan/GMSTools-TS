/**
 * Contact type options used in the contacts scraper
 */
export interface ContactTypeOption {
  name: string;
  key: string;
}

export const CONTACT_TYPES: ContactTypeOption[] = [
  { name: 'Umpire - Outdoor', key: '6C3A3D2A0D3E2D3D' },
  { name: 'Umpire - Indoor', key: '2D1E2B4E5A2E2F2D' },
  { name: 'Umpire - Young', key: '6C3A3D2A0D3E2D3D' },
  { name: 'Umpire Assessor - Outdoor', key: '1C2E3E5E0B0A6E' },
  { name: 'Umpire Coach - Outdoor', key: '8B0A3C3B9D6A8D5D' }
];
