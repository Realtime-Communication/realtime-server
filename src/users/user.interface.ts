import { UUIDTypes } from 'uuid';

export interface IUser {
  email: string;
  password: string;
  _id: UUIDTypes;
  name: string;
  image: string;
}
