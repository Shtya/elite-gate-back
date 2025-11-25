import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FavoriteProperty, Property, User } from 'entities/global.entity';
import { FavoritesController } from './favorite-property.controller';
import { FavoritesService } from './favorite-property.service';

@Module({
  imports: [TypeOrmModule.forFeature([FavoriteProperty, Property , User])],
  controllers: [FavoritesController],
  providers: [FavoritesService],
  exports: [FavoritesService],
})
export class FavoritesModule {}
