export interface AppointmentCreate {
  client_name: string;
  phone: string;
  time_slot: string;
}

export interface AppointmentResponse {
  id: number;
  client_name: string;
  phone: string;
  time_slot: string;
  turn_number: number;
}