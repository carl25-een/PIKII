export type Role = 'shop' | 'staff' | 'rider' | 'agent';
export type ParcelStatus = 'booked' | 'at_sort' | 'on_route' | 'at_agent' | 'collected';
export type Zone = 'near' | 'middle' | 'far';

export type Profile = {
  id: string;
  role: Role;
  full_name: string;
  phone: string | null;
  shop_id: string | null;
  agent_id: string | null;
  route_id: string | null;
};

export type Agent = {
  id: string;
  route_id: string;
  place: string;
  host: string;
  zone: Zone;
  stop_order: number;
  opening_hours: string;
};

export type Route = { id: string; name: string; sort: number };

export type Parcel = {
  id: string;
  code: string;
  shop_id: string;
  customer_name: string;
  customer_phone: string;
  agent_id: string;
  size: 'small' | 'medium';
  payer: 'shop' | 'customer';
  fee_tzs: number;
  fee_paid: boolean;
  status: ParcelStatus;
  collection_code: string;
  tracking_token: string;
  run_id: string | null;
  created_at: string;
};

export type RouteBoardRow = { route_id: string; route_name: string; ready: number; out_now: number; min_run: number };

export type Tracking = {
  code: string;
  status: ParcelStatus;
  customer_first_name: string;
  shop: string;
  agent_place: string;
  agent_host: string;
  opening_hours: string;
  collection_code: string | null;
  fee_due_tzs: number | null;
  events: { status: ParcelStatus; at: string }[] | null;
};
