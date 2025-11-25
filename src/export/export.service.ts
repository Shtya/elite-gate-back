// export.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource, Repository, EntityTarget } from 'typeorm';
import * as ExcelJS from 'exceljs';

// 👉 Barrel import recommended: export all entities from "entities/index.ts"
import {
  // Core / Users / RBAC
  User,
  Role,
  Permission,
  RolePermission,
  UserRole,

  // Locations & Master data
  City,
  Area,
  PropertyType,

  // Properties
  Property,
  PropertyMedia,
  FavoriteProperty,

  // Listing Requests
  PropertyListingRequest,
  PropertyListingRequestAttachment,

  // Agents & Availability
  Agent,
  AgentAvailability,
  AgentPreferredProperty,

  // Appointments & Timeline
  Appointment,
  AppointmentStatusHistory,
  CustomerTimelineEvent,

  // Calendar Sync
  CalendarAccount,
  AppointmentCalendarSync,

  // Reviews
  CustomerReview,
  CustomerReviewDimension,
  AgentReview,
  AgentReviewDimension,

  // Agent Payouts
  AgentPayment,
  AgentBalance,
  AgentPayoutAccount,

  // Auth
  AuthSession,

  // Campaigns & Messaging
  Campaign,
  CampaignImage,
  MessageTemplate,

  // Traffic / UTM / Conversions
  ReferralPartner,
  VisitorTracking,
  Conversion,

  // Notifications
  Notification,

  // CMS / Site
  SiteSettings,
  FooterSettings,
  StaticPage,
  PageSection,
  HomeBackground,
  PartnerLogo,
  HomeCommonQuestion,
  AboutFeature,
  AboutStep,
  AboutHighlight,
  AboutStat,
  AboutTeam,
  FaqGroup,
  FaqItem,
  PrivacyGroup,
  PrivacyItem,
  TermsBlock,

  // Quality
  QualityCase,
  QualityCaseNote,

  // Reports
  ReportSnapshot,
} from 'entities/global.entity';

export enum ModuleName {
  USER = 'user',
  ROLE = 'role',
  PERMISSION = 'permission',
  ROLE_PERMISSION = 'role_permission',
  USER_ROLE = 'user_role',

  // Locations & Master
  CITY = 'city',
  AREA = 'area',
  PROPERTY_TYPE = 'property_type',

  // Properties
  PROPERTY = 'property',
  PROPERTY_MEDIA = 'property_media',
  FAVORITE_PROPERTY = 'favorite_property',

  // Listing Requests
  PROPERTY_LISTING_REQUEST = 'property_listing_request',
  PROPERTY_LISTING_REQUEST_ATTACHMENT = 'property_listing_request_attachment',

  // Agents
  AGENT = 'agent',
  AGENT_AVAILABILITY = 'agent_availability',
  AGENT_PREFERRED_PROPERTY = 'agent_preferred_property',

  // Appointments & Timeline
  APPOINTMENT = 'appointment',
  APPOINTMENT_STATUS_HISTORY = 'appointment_status_history',
  CUSTOMER_TIMELINE_EVENT = 'customer_timeline_event',

  // Calendar
  CALENDAR_ACCOUNT = 'calendar_account',
  APPOINTMENT_CALENDAR_SYNC = 'appointment_calendar_sync',

  // Reviews
  CUSTOMER_REVIEW = 'customer_review',
  CUSTOMER_REVIEW_DIMENSION = 'customer_review_dimension',
  AGENT_REVIEW = 'agent_review',
  AGENT_REVIEW_DIMENSION = 'agent_review_dimension',

  // Agent Payouts
  AGENT_PAYMENT = 'agent_payment',
  AGENT_BALANCE = 'agent_balance',
  AGENT_PAYOUT_ACCOUNT = 'agent_payout_account',

  // Auth
  AUTH_SESSION = 'auth_session',

  // Campaigns & Messaging
  CAMPAIGN = 'campaign',
  CAMPAIGN_IMAGE = 'campaign_image',
  MESSAGE_TEMPLATE = 'message_template',

  // Traffic / Conversions
  REFERRAL_PARTNER = 'referral_partner',
  VISITOR_TRACKING = 'visitor_tracking',
  CONVERSION = 'conversion',

  // Notifications
  NOTIFICATION = 'notification',

  // CMS / Site
  SITE_SETTINGS = 'site_settings',
  FOOTER_SETTINGS = 'footer_settings',
  STATIC_PAGE = 'static_page',
  PAGE_SECTION = 'page_section',
  HOME_BACKGROUND = 'home_background',
  PARTNER_LOGO = 'partner_logo',
  HOME_COMMON_QUESTION = 'home_common_question',
  ABOUT_FEATURE = 'about_feature',
  ABOUT_STEP = 'about_step',
  ABOUT_HIGHLIGHT = 'about_highlight',
  ABOUT_STAT = 'about_stat',
  ABOUT_TEAM = 'about_team',
  FAQ_GROUP = 'faq_group',
  FAQ_ITEM = 'faq_item',
  PRIVACY_GROUP = 'privacy_group',
  PRIVACY_ITEM = 'privacy_item',
  TERMS_BLOCK = 'terms_block',

  // Quality
  QUALITY_CASE = 'quality_case',
  QUALITY_CASE_NOTE = 'quality_case_note',

  // Reports
  REPORT_SNAPSHOT = 'report_snapshot',
}

export const moduleRepoMap: Record<ModuleName, EntityTarget<any>> = {
  // Users / RBAC
  [ModuleName.USER]: User,
  [ModuleName.ROLE]: Role,
  [ModuleName.PERMISSION]: Permission,
  [ModuleName.ROLE_PERMISSION]: RolePermission,
  [ModuleName.USER_ROLE]: UserRole,

  // Locations & Master
  [ModuleName.CITY]: City,
  [ModuleName.AREA]: Area,
  [ModuleName.PROPERTY_TYPE]: PropertyType,

  // Properties
  [ModuleName.PROPERTY]: Property,
  [ModuleName.PROPERTY_MEDIA]: PropertyMedia,
  [ModuleName.FAVORITE_PROPERTY]: FavoriteProperty,

  // Listing Requests
  [ModuleName.PROPERTY_LISTING_REQUEST]: PropertyListingRequest,
  [ModuleName.PROPERTY_LISTING_REQUEST_ATTACHMENT]: PropertyListingRequestAttachment,

  // Agents
  [ModuleName.AGENT]: Agent,
  [ModuleName.AGENT_AVAILABILITY]: AgentAvailability,
  [ModuleName.AGENT_PREFERRED_PROPERTY]: AgentPreferredProperty,

  // Appointments & Timeline
  [ModuleName.APPOINTMENT]: Appointment,
  [ModuleName.APPOINTMENT_STATUS_HISTORY]: AppointmentStatusHistory,
  [ModuleName.CUSTOMER_TIMELINE_EVENT]: CustomerTimelineEvent,

  // Calendar
  [ModuleName.CALENDAR_ACCOUNT]: CalendarAccount,
  [ModuleName.APPOINTMENT_CALENDAR_SYNC]: AppointmentCalendarSync,

  // Reviews
  [ModuleName.CUSTOMER_REVIEW]: CustomerReview,
  [ModuleName.CUSTOMER_REVIEW_DIMENSION]: CustomerReviewDimension,
  [ModuleName.AGENT_REVIEW]: AgentReview,
  [ModuleName.AGENT_REVIEW_DIMENSION]: AgentReviewDimension,

  // Agent Payouts
  [ModuleName.AGENT_PAYMENT]: AgentPayment,
  [ModuleName.AGENT_BALANCE]: AgentBalance,
  [ModuleName.AGENT_PAYOUT_ACCOUNT]: AgentPayoutAccount,

  // Auth
  [ModuleName.AUTH_SESSION]: AuthSession,

  // Campaigns & Messaging
  [ModuleName.CAMPAIGN]: Campaign,
  [ModuleName.CAMPAIGN_IMAGE]: CampaignImage,
  [ModuleName.MESSAGE_TEMPLATE]: MessageTemplate,

  // Traffic / Conversions
  [ModuleName.REFERRAL_PARTNER]: ReferralPartner,
  [ModuleName.VISITOR_TRACKING]: VisitorTracking,
  [ModuleName.CONVERSION]: Conversion,

  // Notifications
  [ModuleName.NOTIFICATION]: Notification,

  // CMS / Site
  [ModuleName.SITE_SETTINGS]: SiteSettings,
  [ModuleName.FOOTER_SETTINGS]: FooterSettings,
  [ModuleName.STATIC_PAGE]: StaticPage,
  [ModuleName.PAGE_SECTION]: PageSection,
  [ModuleName.HOME_BACKGROUND]: HomeBackground,
  [ModuleName.PARTNER_LOGO]: PartnerLogo,
  [ModuleName.HOME_COMMON_QUESTION]: HomeCommonQuestion,
  [ModuleName.ABOUT_FEATURE]: AboutFeature,
  [ModuleName.ABOUT_STEP]: AboutStep,
  [ModuleName.ABOUT_HIGHLIGHT]: AboutHighlight,
  [ModuleName.ABOUT_STAT]: AboutStat,
  [ModuleName.ABOUT_TEAM]: AboutTeam,
  [ModuleName.FAQ_GROUP]: FaqGroup,
  [ModuleName.FAQ_ITEM]: FaqItem,
  [ModuleName.PRIVACY_GROUP]: PrivacyGroup,
  [ModuleName.PRIVACY_ITEM]: PrivacyItem,
  [ModuleName.TERMS_BLOCK]: TermsBlock,

  // Quality
  [ModuleName.QUALITY_CASE]: QualityCase,
  [ModuleName.QUALITY_CASE_NOTE]: QualityCaseNote,

  // Reports
  [ModuleName.REPORT_SNAPSHOT]: ReportSnapshot,
};

@Injectable()
export class ExportService {
  constructor(public readonly dataSource: DataSource) {}

  async exportEntityToExcel(
    dataSource: DataSource,
    moduleName: string,
    res: any,
    options: {
      exportLimit?: number | string; // 'all' | number
      columns?: { header: string; key: string; width?: number }[];
    } = {},
  ) {
    // Normalize & resolve entity
    const normalized = (moduleName || '').toLowerCase().trim() as ModuleName;
    const entityClass = moduleRepoMap[normalized];

    if (!entityClass) {
      const allowed = Object.values(ModuleName);
      throw new BadRequestException({
        message: `Invalid module "${moduleName}". Allowed modules are: ${allowed.join(', ')}`,
        allowedModules: allowed,
      });
    }

    const repository: Repository<any> = dataSource.getRepository(entityClass);

    // Parse limit
    const rawLimit = options.exportLimit;
    let take: number | undefined;

    if (rawLimit === 'all' || (typeof rawLimit === 'string' && rawLimit.toLowerCase().trim() === 'all')) {
      take = undefined; // fetch all
    } else if (rawLimit === undefined || rawLimit === null || rawLimit === '') {
      take = 10;
    } else {
      const n = typeof rawLimit === 'number' ? rawLimit : Number(rawLimit);
      take = Number.isFinite(n) && n > 0 ? Math.floor(n) : 10;
    }

    const findOptions: any = {};
    if (take !== undefined) findOptions.take = take;

    const entities = await repository.find(findOptions);

    // Serialize rows so relations become IDs/JSON strings
    const serialize = (v: any): any => {
      if (v === null || v === undefined) return '';
      if (typeof v !== 'object') return v;
      if ('id' in v && typeof v.id !== 'object') return v.id;
      try {
        return JSON.stringify(v);
      } catch {
        return String(v);
      }
    };

    const rows = entities.map(e => {
      const plain: Record<string, any> = {};
      Object.entries(e as Record<string, any>).forEach(([k, v]) => {
        // Strip timestamps we don’t want
        if (k === 'deletedAt' || k === 'updatedAt') return;
        plain[k] = serialize(v);
      });
      return plain;
    });

    // Build workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    const columns = options.columns ?? (rows.length > 0 ? Object.keys(rows[0]).map(key => ({ header: key, key, width: 20 })) : []);

    worksheet.columns = columns;

    rows.forEach(r => {
      const row = worksheet.addRow(r);
      row.eachCell(cell => {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    });

    // Header styling
    worksheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCCCCC' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Auto width
    worksheet.columns.forEach(column => {
      let maxLength = 10;
      column.eachCell({ includeEmpty: true }, cell => {
        const val = cell.value ? String(cell.value) : '';
        if (val.length > maxLength) maxLength = val.length;
      });
      column.width = Math.min(maxLength + 2, 60);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${normalized}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  }

  // Keep your helper (unchanged except for consistent column width capping)
  async exportRowsToExcel(
    res: any,
    rows: any[],
    options: {
      sheetName?: string;
      fileName?: string;
      columns?: { header: string; key: string; width?: number }[];
    } = {},
  ) {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(options.sheetName || 'Report');

    const columns = options.columns ?? (rows.length > 0 ? Object.keys(rows[0]).map(key => ({ header: key, key, width: 20 })) : []);

    worksheet.columns = columns;

    rows.forEach(r => {
      const row = worksheet.addRow(r);
      row.eachCell(cell => {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    });

    worksheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCCCCC' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    worksheet.columns.forEach(col => {
      let max = 10;
      col.eachCell({ includeEmpty: true }, cell => {
        const v = cell.value ? String(cell.value) : '';
        if (v.length > max) max = v.length;
      });
      col.width = Math.min(max + 2, 60);
    });

    const fileName = (options.fileName || 'export') + '.xlsx';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    await workbook.xlsx.write(res);
    res.end();
  }
}
