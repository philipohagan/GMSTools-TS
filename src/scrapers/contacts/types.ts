import { ContactTypeOption } from '../../core/constants/contactTypes';

export interface SearchParams {
  clicked_find_counter: string;
  find_contact_name: string;
  find_address: string;
  find_organisation_index_key: string;
  find_contact_type_index_key: string;
  find_contact_type: string;
  find_grade_index_key: string;
  find: string;
}

export interface ContactData {
  [key: string]: string;
  ID: string;
  Name: string;
  Level: string;
  Club: string;
}

export { ContactTypeOption };
