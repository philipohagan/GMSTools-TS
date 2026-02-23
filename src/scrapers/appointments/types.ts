export interface SearchParams {
  clicked_find_counter: string;
  find_from_date: string;
  find_to_date: string;
  find_team_index_key: string;
  find_month: string;
  find_contact_index_key: string;
  find_competition_index_key: string;
  find_contact_type_index_key: string;
  find_organisation_index_key: string;
  find_grade_index_key: string;
  find: string;
  status_filter: string;
}

export interface AppointmentData {
  [key: string]: string;
  Date: string;
  Time: string;
  Level: string;
  'Competition/Event': string;
  'Home Team': string;
  Venue: string;
  'Away Team': string;
  Official: string;
  Role: string;
  Status: string;
}
