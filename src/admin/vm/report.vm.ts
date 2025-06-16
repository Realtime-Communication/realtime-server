import { ReportStatus } from '@prisma/client';

export class ReportVM {
  id: number;
  user_id: number;
  participant_id: number;
  report_type: string;
  notes?: string;
  status: ReportStatus;
  created_at: Date;
  rejected_reason?: string;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  participant: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export class ReportListVM {
  items: ReportVM[];
  total: number;
} 
