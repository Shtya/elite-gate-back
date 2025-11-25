import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentPayoutAccount, User } from 'entities/global.entity';
import { CreatePayoutAccountDto, UpdatePayoutAccountDto } from '../../dto/payout-accounts.dto';

@Injectable()
export class PayoutAccountsService {
constructor(
    @InjectRepository(AgentPayoutAccount)
    public readonly payoutAccountsRepository: Repository<AgentPayoutAccount>, // 👈 expose
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createPayoutAccountDto: CreatePayoutAccountDto): Promise<AgentPayoutAccount> {
    const agent = await this.usersRepository.findOne({ 
      where: { id: createPayoutAccountDto.agentId } 
    });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    // Check if account already exists for this agent
    const existingAccount = await this.payoutAccountsRepository.findOne({
      where: { agent: { id: createPayoutAccountDto.agentId } }
    });

    if (existingAccount) {
      throw new ConflictException('Payout account already exists for this agent');
    }

    // Validate IBAN format (basic validation)
    if (!this.validateIBAN(createPayoutAccountDto.iban)) {
      throw new ConflictException('Invalid IBAN format');
    }

    const payoutAccount = this.payoutAccountsRepository.create({
      ...createPayoutAccountDto,
      agent,
    });

    return this.payoutAccountsRepository.save(payoutAccount);
  }

  async findByAgent(agentId: number): Promise<AgentPayoutAccount> {
    const payoutAccount = await this.payoutAccountsRepository.findOne({
      where: { agent: { id: agentId } },
      relations: ['agent']
    });

    if (!payoutAccount) {
      throw new NotFoundException('Payout account not found for this agent');
    }

    return payoutAccount;
  }

  async findOne(id: number): Promise<AgentPayoutAccount> {
    const payoutAccount = await this.payoutAccountsRepository.findOne({
      where: { id },
      relations: ['agent']
    });

    if (!payoutAccount) {
      throw new NotFoundException('Payout account not found');
    }

    return payoutAccount;
  }

  async update(id: number, updatePayoutAccountDto: UpdatePayoutAccountDto): Promise<AgentPayoutAccount> {
    const payoutAccount = await this.findOne(id);

    if (updatePayoutAccountDto.iban && !this.validateIBAN(updatePayoutAccountDto.iban)) {
      throw new ConflictException('Invalid IBAN format');
    }

    Object.assign(payoutAccount, updatePayoutAccountDto);
    return this.payoutAccountsRepository.save(payoutAccount);
  }

  async remove(id: number): Promise<void> {
    const payoutAccount = await this.findOne(id);
    await this.payoutAccountsRepository.remove(payoutAccount);
  }

  async verifyAccount(agentId: number): Promise<{ verified: boolean; message: string }> {
    const payoutAccount = await this.findByAgent(agentId);
    
    // In a real implementation, this would integrate with bank verification services
    // For now, perform basic validation
    const isValid = this.validateIBAN(payoutAccount.iban) && 
                   payoutAccount.accountHolderName.length > 0 &&
                   payoutAccount.bankName.length > 0;

    return {
      verified: isValid,
      message: isValid ? 'Account verified successfully' : 'Account verification failed'
    };
  }

  private validateIBAN(iban: string): boolean {
    // Basic IBAN validation - in real implementation, use a proper IBAN validation library
    const ibanRegex = /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/;
    return ibanRegex.test(iban.replace(/\s/g, '').toUpperCase());
  }
}