import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayoutAccountsService } from './payout-accounts.service';
import { PayoutAccountsController } from './payout-accounts.controller';
import { AgentPayoutAccount, User } from 'entities/global.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AgentPayoutAccount, User])],
  controllers: [PayoutAccountsController],
  providers: [PayoutAccountsService],
  exports: [PayoutAccountsService],
})
export class PayoutAccountsModule {}