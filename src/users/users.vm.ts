export class UserVm {
  id: number;
  phone: string;
  email: string;
  password: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  is_active: boolean;
  is_reported: boolean;
  is_blocked: boolean;
  preferences: string;
  created_at: Date;
  updated_at: Date;
}
