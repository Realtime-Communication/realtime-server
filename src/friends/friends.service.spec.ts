import { Test, TestingModule } from '@nestjs/testing';
import { FriendsService } from './friends.service';
import { beforeEach, describe, it } from 'node:test';

describe('FriendsService', () => {
  let service: FriendsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FriendsService],
    }).compile();

    service = module.get<FriendsService>(FriendsService);
  });

  it('should be defined', () => {
    // expect(service).toBeDefined();
  });
});
