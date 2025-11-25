import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {Blog } from './blog.entity';
import { BlogsController } from './blog.controller';
import { BlogsService } from './blog.service';
import { User } from 'entities/global.entity';


@Module({
  imports: [
    TypeOrmModule.forFeature([Blog,User]),
   
  ],
  controllers: [BlogsController],
  providers: [BlogsService],
  exports: [BlogsService],
})
export class BlogModule {}
