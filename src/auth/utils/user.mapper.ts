import { User } from '@prisma/client';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export function mapUserToDto(user: User): UserResponseDto {
  return new UserResponseDto({
    id: user.id,
    email: user.email,
    phone: user.phone || '',
    role: user.role || 'USER',
    isBlocked: user.is_blocked || false,
    isActive: user.is_active ?? true,
    firstName: user.first_name || '',
    lastName: user.last_name || '',
    middleName: user.middle_name || '',
    preferences: user.preferences ? JSON.parse(JSON.stringify(user.preferences)) : {},
    createdAt: user.created_at || new Date(),
    updatedAt: user.updated_at || new Date()
  });
}
