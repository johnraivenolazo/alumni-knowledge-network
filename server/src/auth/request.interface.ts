import { Role } from '@akn/database';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: Role;
    name?: string;
  };
}
