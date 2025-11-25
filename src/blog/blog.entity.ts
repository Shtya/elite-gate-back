// entities/blog.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
  } from 'typeorm';
  import { User } from '../../entities/global.entity';
  
  @Entity('blogs')
  export class Blog {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column()
    title: string;
  
    @Column({ unique: true })
    slug: string;
  
    @Column({ nullable: true })
    image: string;
  
    @Column('text')
    description: string;
  
    @Column({ type: 'timestamp', nullable: true })
    publishedAt: Date;
  
    @Column({ default: false })
    isPublished: boolean;
  
    @ManyToOne(() => User, { eager: true })
    @JoinColumn({ name: 'authorId' })
    author: User;
  
    @Column()
    authorId: number;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }