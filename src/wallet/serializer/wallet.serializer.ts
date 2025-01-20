import { Exclude } from 'class-transformer';

export class WalletEntity {
  @Exclude()
  accountRef: string;

  constructor(partial: Partial<WalletEntity>) {
    Object.assign(this, partial);
  }
}
