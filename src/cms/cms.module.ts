import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CmsService } from './cms.service';
import { CmsController } from './cms.controller';
import { 
  StaticPage, PageSection, SiteSettings, FooterSettings, HomeBackground, 
  PartnerLogo, FaqGroup, FaqItem, AboutFeature, AboutStep, AboutStat, AboutTeam, 
	AboutHighlight
} from 'entities/global.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    StaticPage, PageSection, SiteSettings, FooterSettings, HomeBackground, 
    PartnerLogo, FaqGroup, FaqItem, AboutFeature, AboutStep, AboutStat, AboutTeam , AboutHighlight
  ])],
  controllers: [CmsController],
  providers: [CmsService],
  exports: [CmsService],
})
export class CmsModule {}