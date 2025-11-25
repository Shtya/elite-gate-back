import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentAvailability, AgentPreferredProperty, User, Property } from 'entities/global.entity';
import { CreateAgentAvailabilityDto, UpdateAgentAvailabilityDto, CreateAgentPreferredPropertyDto, AgentAvailabilityQueryDto } from '../../dto/agent-availability.dto';

@Injectable()
export class AgentAvailabilityService {
  constructor(
    @InjectRepository(AgentAvailability)
    public readonly agentAvailabilityRepository: Repository<AgentAvailability>, // 👈 expose
    @InjectRepository(AgentPreferredProperty)
    public readonly preferredPropertyRepository: Repository<AgentPreferredProperty>, // 👈 expose
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Property)
    private propertiesRepository: Repository<Property>,
  ) {}

  async createAvailability(createAgentAvailabilityDto: CreateAgentAvailabilityDto): Promise<AgentAvailability> {
    const agent = await this.usersRepository.findOne({ 
      where: { id: createAgentAvailabilityDto.agentId } 
    });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    // Check if availability already exists for this day
    const existingAvailability = await this.agentAvailabilityRepository.findOne({
      where: {
        agent: { id: createAgentAvailabilityDto.agentId },
        dayOfWeek: createAgentAvailabilityDto.dayOfWeek,
      }
    });

    if (existingAvailability) {
      throw new ConflictException('Availability already exists for this day');
    }

    const availability = this.agentAvailabilityRepository.create({
      ...createAgentAvailabilityDto,
      agent,
    });

    return this.agentAvailabilityRepository.save(availability);
  }

 

  async getAvailabilityById(id: number): Promise<AgentAvailability> {
    const availability = await this.agentAvailabilityRepository.findOne({
      where: { id },
      relations: ['agent']
    });

    if (!availability) {
      throw new NotFoundException('Availability not found');
    }

    return availability;
  }

  async updateAvailability(id: number, updateAgentAvailabilityDto: UpdateAgentAvailabilityDto): Promise<AgentAvailability> {
    const availability = await this.getAvailabilityById(id);
    Object.assign(availability, updateAgentAvailabilityDto);
    return this.agentAvailabilityRepository.save(availability);
  }

  async deleteAvailability(id: number): Promise<void> {
    const availability = await this.getAvailabilityById(id);
    await this.agentAvailabilityRepository.remove(availability);
  }

  async addPreferredProperty(createAgentPreferredPropertyDto: CreateAgentPreferredPropertyDto): Promise<AgentPreferredProperty> {
    const agent = await this.usersRepository.findOne({ 
      where: { id: createAgentPreferredPropertyDto.agentId } 
    });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const property = await this.propertiesRepository.findOne({ 
      where: { id: createAgentPreferredPropertyDto.propertyId } 
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // Check if already exists
    const existingPreference = await this.preferredPropertyRepository.findOne({
      where: {
        agent: { id: createAgentPreferredPropertyDto.agentId },
        property: { id: createAgentPreferredPropertyDto.propertyId },
      }
    });

    if (existingPreference) {
      throw new ConflictException('Property already in preferred list');
    }

    const preferredProperty = this.preferredPropertyRepository.create({
      agent,
      property,
      addedBy: { id: 1 } as User, // From authenticated user
    });

    return this.preferredPropertyRepository.save(preferredProperty);
  }

 

  async removePreferredProperty(id: number): Promise<void> {
    const preferredProperty = await this.preferredPropertyRepository.findOne({
      where: { id }
    });

    if (!preferredProperty) {
      throw new NotFoundException('Preferred property not found');
    }

    await this.preferredPropertyRepository.remove(preferredProperty);
  }

  async getAvailableAgents(date: string, time: string): Promise<any[]> {
    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.getDay();
    
    const availableSlots = await this.agentAvailabilityRepository.find({
      where: { dayOfWeek },
      relations: ['agent'],
    });

    // Filter agents available at the specified time
    const availableAgents = availableSlots.filter(slot => {
      return time >= slot.startTime && time <= slot.endTime;
    });

    return availableAgents.map(slot => ({
      agent: slot.agent,
      availability: {
        startTime: slot.startTime,
        endTime: slot.endTime,
      }
    }));
  }
}