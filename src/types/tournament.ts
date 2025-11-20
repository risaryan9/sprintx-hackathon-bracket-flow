export interface Tournament {
  id: string;
  name: string;
  category: string;
  sport: string;
  start_date: string;
  end_date: string;
  venue: string;
  city: string;
  organizer_name: string;
  organizer_contact: string;
  organizer_email: string;
  image_url: string;
  prize_pool: number;
  registration_fee: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

