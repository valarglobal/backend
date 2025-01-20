import { Test, TestingModule } from '@nestjs/testing';
import { VFDBankService } from '../providers/VFDBank.service';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';

dotenv.config();

describe('VFDBank', () => {
  let service: VFDBankService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        const env = {
          VFD_CONSUMER_KEY: process.env.VFD_CONSUMER_KEY,
          VFD_CONSUMER_SECRET: process.env.VFD_CONSUMER_SECRET,
          VFD_TEST_BASE_URL: process.env.VFD_TEST_BASE_URL,
          VFD_LIVE_BASE_URL: process.env.VFD_LIVE_BASE_URL,
          VFD_MODE: process.env.VFD_MODE,
        };
        return env[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VFDBankService,
        {
          provide: ConfigService,
          useValue: mockConfigService, // Use the mocked service
        },
      ],
    }).compile();

    service = module.get<VFDBankService>(VFDBankService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  //   it('should return the access token', async () => {
  //     const response: any = await service.getAccessToken();

  //     expect(response).toBeDefined();
  //     expect(response?.accessToken).toBeDefined();
  //     expect(response?.expireIn).toBeDefined();
  //   });

  //   it('should create a virtual account and return the details', async () => {
  //     const test_payload = {
  //       bvn: '22222222222',
  //       dateOfBirth: '08-Mar-1995',
  //     };

  //     const response: any =
  //       await service.createNoConsentVirtualAccount(test_payload);

  //     expect(response).toBeDefined();
  //     expect(response?.firstname).toBeDefined();
  //     expect(response?.lastname).toBeDefined();
  //     expect(response?.bvn).toBeDefined();
  //     expect(response?.acccountNo).toBeDefined();
  //   }, 100000);

  //   it('it should get all the accounts created', async () => {
  //     const response = await service.getAllAccounts();

  //     // console.log('response', response);
  //     expect(response).toBeDefined();
  //   });
});
