// src/team/team.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { unlinkSync } from 'fs';

import { TeamMember } from './entities/team-member.entity';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { toAbsPathImages } from 'common/upload.config';

type UploadCtx = { uploadedFilename?: string };

@Injectable()
export class TeamService {
  constructor(
    @InjectRepository(TeamMember)
    private readonly repo: Repository<TeamMember>,
  ) {}

  async findAll(): Promise<TeamMember[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<TeamMember> {
    const m = await this.repo.findOne({ where: { id } });
    if (!m) throw new NotFoundException('Team member not found.');
    return m;
  }

  private deletePhysicalImageByWebPath(webPath?: string | null) {
    if (!webPath) return;
    const filename = webPath.split('/').pop();
    if (!filename) return;
    try {
      unlinkSync(toAbsPathImages(filename));
    } catch {}
  }

  async create(
    dto: CreateTeamMemberDto & { imageUrl?: string | null },
  ): Promise<TeamMember> {
    // dto.imageUrl was already set in controller when file uploaded
    const created = this.repo.create({
      name: dto.name,
      position: dto.position,
      imageUrl: dto.imageUrl ?? null,
    });
    return this.repo.save(created);
  }

  async update(
    id: number,
    dto: UpdateTeamMemberDto & { imageUrl?: string | null },
    _ctx?: UploadCtx,
  ): Promise<TeamMember> {
    const member = await this.findOne(id);

    // If a new imageUrl is provided and it's different, we remove the old file
    if (dto.imageUrl && dto.imageUrl !== member.imageUrl) {
      // delete previous physical file (best-effort)
      this.deletePhysicalImageByWebPath(member.imageUrl);
      member.imageUrl = dto.imageUrl;
    }

    // If explicitly set to null, we remove the image (also cleanup the old file)
    if (dto.imageUrl === null) {
      this.deletePhysicalImageByWebPath(member.imageUrl);
      member.imageUrl = null;
    }

    // Update text fields
    if (typeof dto.name === 'string') member.name = dto.name;
    if (typeof dto.position === 'string') member.position = dto.position;

    return this.repo.save(member);
  }

  async remove(id: number): Promise<{ success: true }> {
    const member = await this.findOne(id);
    // Soft delete recommended; keep file or remove it based on your policy.
    // If you prefer removing file on soft delete, uncomment:
    // this.deletePhysicalImageByWebPath(member.imageUrl);
    await this.repo.softRemove(member);
    return { success: true };
  }

  // Optional: hard delete that also deletes the image file
  async hardDelete(id: number): Promise<{ success: true }> {
    const member = await this.findOne(id);
    this.deletePhysicalImageByWebPath(member.imageUrl);
    await this.repo.remove(member);
    return { success: true };
  }
}
