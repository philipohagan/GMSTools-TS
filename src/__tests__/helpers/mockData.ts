export const mockAppointmentData = {
  Date: '04-09-2021',
  Time: '12:30',
  Level: '2',
  'Competition/Event': 'London Friendlies',
  'Home Team': 'London Academicals M1',
  Venue: 'Test Ground',
  'Away Team': 'TBC 1 Men',
  Official: 'Surinder BODWAL',
  Role: 'Umpire - Outdoor',
  Status: 'Y'
};

export const mockPaginatedData = {
  firstPage: [...Array(50)].map(() => ({ ...mockAppointmentData })),
  secondPage: [...Array(10)].map(() => ({ ...mockAppointmentData, Date: '02-01-2024' }))
};

export const mockSearchParams = {
  function: 'view',
  from_date: '01-01-2024',
  to_date: '31-12-2024',
  team: 'All teams',
  month: 'All months',
  contact: 'All contacts',
  competition: 'All competitions',
  contact_type: 'All contact types',
  association: 'England Hockey - London',
  show_others: '0',
  show_events: '0',
  unconfirmed_only: '0',
  offset: '0',
  limit: '50',
  status_filter: 'Y'
};
