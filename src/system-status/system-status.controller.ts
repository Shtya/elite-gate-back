import { Controller, Get } from '@nestjs/common';
import { UserType, VerificationStatus, AgentApprovalStatus, SocialPlatform, TrafficSource, AccessType, RelationshipType, ListingRequestStatus, AppointmentStatus, CreatedChannel, ConversionType, TimelineEventType, RatingDimension, PaymentStatus, PaymentGateway, CampaignChannel, CampaignAudience, CampaignRunType, CampaignFrequency, CampaignStatus, NotificationType, NotificationChannel, NotificationStatus, StaticPageSlug, SectionKey, CalendarProvider, QualityCaseStatus, QualityCasePriority, ReportSnapshotType } from 'entities/global.entity';

@Controller('system')
export class SystemStatusController {
  @Get('statuses')
  getAllStatuses() {
    return {
      userType: Object.values(UserType),
      verificationStatus: Object.values(VerificationStatus),
      agentApprovalStatus: Object.values(AgentApprovalStatus),
      socialPlatform: Object.values(SocialPlatform),
      trafficSource: Object.values(TrafficSource),
      accessType: Object.values(AccessType),
      relationshipType: Object.values(RelationshipType),
      listingRequestStatus: Object.values(ListingRequestStatus),
      appointmentStatus: Object.values(AppointmentStatus),
      createdChannel: Object.values(CreatedChannel),
      conversionType: Object.values(ConversionType),
      timelineEventType: Object.values(TimelineEventType),
      ratingDimension: Object.values(RatingDimension),
      paymentStatus: Object.values(PaymentStatus),
      paymentGateway: Object.values(PaymentGateway),
      campaignChannel: Object.values(CampaignChannel),
      campaignAudience: Object.values(CampaignAudience),
      campaignRunType: Object.values(CampaignRunType),
      campaignFrequency: Object.values(CampaignFrequency),
      campaignStatus: Object.values(CampaignStatus),
      notificationType: Object.values(NotificationType),
      notificationChannel: Object.values(NotificationChannel),
      notificationStatus: Object.values(NotificationStatus),
      staticPageSlug: Object.values(StaticPageSlug),
      sectionKey: Object.values(SectionKey),
      calendarProvider: Object.values(CalendarProvider),
      qualityCaseStatus: Object.values(QualityCaseStatus),
      qualityCasePriority: Object.values(QualityCasePriority),
      reportSnapshotType: Object.values(ReportSnapshotType),
    };
  }
}
