// src/team/team-member.entity.ts
import { CoreEntity } from 'entities/global.entity';
import { Entity, Column, Index } from 'typeorm';

@Entity('team_members')
@Index('IDX_team_members_name', ['name' , "position"])
export class TeamMember extends CoreEntity {
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 150 })
  position: string;

  // Public web URL (e.g., /uploads/images/xxxx.webp)
  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl?: string | null;
}
