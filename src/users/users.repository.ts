import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from 'src/base/base.repository';
import { SUser, SUserDocument } from './schemas/user.schema';

@Injectable()
export class UserRepository extends BaseRepository<SUserDocument> {
  constructor(
    @InjectModel(SUser.name) 
    private readonly userModel: Model<SUserDocument>
  ) {
    super(userModel);
  }

  async findByEmail(email: string): Promise<SUser | null> {
    return await this.findOne({ email });
  }
}
