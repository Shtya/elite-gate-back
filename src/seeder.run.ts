import * as dotenv from 'dotenv';
dotenv.config();
import { DataSource } from 'typeorm';
import * as argon from 'argon2';
import { User, UserType, VerificationStatus } from '../entities/global.entity';
import { Agent, AgentApprovalStatus } from '../entities/global.entity';
import { City } from '../entities/global.entity';
import { Area } from '../entities/global.entity';
import { PropertyType } from '../entities/global.entity';
import { Property } from '../entities/global.entity';
import { PropertyMedia } from '../entities/global.entity';
import { Appointment, AppointmentStatus, CreatedChannel } from '../entities/global.entity';
import { CustomerReview, AgentReview, RatingDimension } from '../entities/global.entity';
import { AgentPayment, PaymentStatus, PaymentGateway } from '../entities/global.entity';
import { AgentBalance } from '../entities/global.entity';
import { Campaign, CampaignChannel, CampaignAudience, CampaignRunType, CampaignStatus } from '../entities/global.entity';
import { Notification, NotificationType, NotificationChannel, NotificationStatus } from '../entities/global.entity';
import { SocialPlatform } from '../entities/global.entity';
import { VisitorTracking, TrafficSource } from '../entities/global.entity';
import { Conversion, ConversionType } from '../entities/global.entity';
import { SiteSettings } from '../entities/global.entity';
import { FooterSettings } from '../entities/global.entity';
import { StaticPage, StaticPageSlug } from '../entities/global.entity';
import { PageSection, SectionKey } from '../entities/global.entity';
import { HomeBackground } from '../entities/global.entity';
import { PartnerLogo } from '../entities/global.entity';
import { FaqGroup } from '../entities/global.entity';
import { FaqItem } from '../entities/global.entity';
import { AboutFeature } from '../entities/global.entity';
import { AboutStep } from '../entities/global.entity';
import { AboutStat } from '../entities/global.entity';
import { AboutTeam } from '../entities/global.entity';
import { MessageTemplate } from '../entities/global.entity';
import * as bcrypt from 'bcryptjs';

// Seed Users
export const seedUsers = async (dataSource: DataSource) => {
  const userRepository = dataSource.getRepository(User);

  const users = [
    {
      phoneNumber: '+966500000001',
      email: 'admin@gmail.com',
      fullName: 'System Administrator',
      userType: UserType.ADMIN,
      verificationStatus: VerificationStatus.VERIFIED,
      isActive: true,
      verifiedAt: new Date(),
      password: '123456',
    },
    {
      phoneNumber: '+966500000002',
      email: 'agent@gmail.com',
      fullName: 'Ahmed Al-Saud',
      userType: UserType.AGENT,
      verificationStatus: VerificationStatus.VERIFIED,
      isActive: true,
      verifiedAt: new Date(),
      password: '123456',
    },
    {
      phoneNumber: '+966500000003',
      email: 'agent2@gmail.com',
      fullName: 'Mohammed Al-Rashid',
      userType: UserType.AGENT,
      verificationStatus: VerificationStatus.VERIFIED,
      isActive: true,
      verifiedAt: new Date(),
      password: '123456',
    },
    {
      phoneNumber: '+966500000004',
      email: 'customer@gmail.com',
      fullName: 'Customer One',
      userType: UserType.CUSTOMER,
      verificationStatus: VerificationStatus.VERIFIED,
      isActive: true,
      verifiedAt: new Date(),
      password: '123456',
    },
    {
      phoneNumber: '+966500000005',
      email: 'customer2@gmail.com',
      fullName: 'Customer Two',
      userType: UserType.CUSTOMER,
      verificationStatus: VerificationStatus.VERIFIED,
      isActive: true,
      verifiedAt: new Date(),
      password: '123456',
    },
    {
      phoneNumber: '+966500000006',
      email: 'marketer1@gmail.com',
      fullName: 'Marketing Specialist',
      userType: UserType.MARKETER,
      verificationStatus: VerificationStatus.VERIFIED,
      isActive: true,
      verifiedAt: new Date(),
      password: '123456',
    },
    {
      phoneNumber: '+966500000007',
      email: 'quality@gmail.com',
      fullName: 'Quality Team Member',
      userType: UserType.QUALITY,
      verificationStatus: VerificationStatus.VERIFIED,
      isActive: true,
      verifiedAt: new Date(),
      password: '123456',
    },
  ];

  const hashedUsers = await Promise.all(
    users.map(async user => {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(user.password, salt);
      return {
        ...user,
        passwordHash,
      };
    }),
  );

  // 🧹 Remove plaintext password from objects
  const safeUsers = hashedUsers.map(({ password, ...rest }) => rest);

  await userRepository.save(safeUsers);
  console.log('✅ Seeded users successfully with encrypted passwords');
};

// Seed Agents
export const seedAgents = async (dataSource: DataSource) => {
  const agentRepository = dataSource.getRepository(Agent);
  const userRepository = dataSource.getRepository(User);

  const agents = await userRepository.find({ where: { userType: UserType.AGENT } });
  const cities = await dataSource.getRepository(City).find();

  const agentData: any = agents.map(async (agent, index) => ({
    user: agent,
    city: cities[index % cities.length],
    identityProofUrl: `https://example.com/agent${index + 1}_id.jpg`,
    residencyDocumentUrl: `https://example.com/agent${index + 1}_residency.jpg`,
    status: AgentApprovalStatus.APPROVED,
    kycNotes: 'All documents verified successfully',
    updatedBy: await userRepository.findOne({ where: { userType: UserType.ADMIN } }),
  }));

  await agentRepository.save(agentData);
  console.log('✅ Seeded agents successfully');
};

// Seed Cities
export const seedCities = async (dataSource: DataSource) => {
  const cityRepository = dataSource.getRepository(City);

  const cities = [
    { name: 'الرياض', isActive: true },
    { name: 'جدة', isActive: true },
    { name: 'مكة المكرمة', isActive: true },
    { name: 'المدينة المنورة', isActive: true },
    { name: 'الدمام', isActive: true },
    { name: 'الخبر', isActive: true },
    { name: 'الطائف', isActive: true },
    { name: 'تبوك', isActive: true },
    { name: 'أبها', isActive: true },
    { name: 'حائل', isActive: true },
  ];

  await cityRepository.save(cities);
  console.log('✅ Seeded cities successfully');
};

// Seed Areas
export const seedAreas = async (dataSource: DataSource) => {
  const areaRepository = dataSource.getRepository(Area);
  const cityRepository = dataSource.getRepository(City);

  const cities = await cityRepository.find();
  const areas = [];

  cities.forEach(city => {
    const cityAreas = [
      { city, name: `${city.name} - المنطقة الشمالية`, isActive: true },
      { city, name: `${city.name} - المنطقة الجنوبية`, isActive: true },
      { city, name: `${city.name} - المنطقة الشرقية`, isActive: true },
      { city, name: `${city.name} - المنطقة الغربية`, isActive: true },
      { city, name: `${city.name} - المنطقة الوسطى`, isActive: true },
    ];
    areas.push(...cityAreas);
  });

  await areaRepository.save(areas);
  console.log('✅ Seeded areas successfully');
};

// Seed Property Types
export const seedPropertyTypes = async (dataSource: DataSource) => {
  const propertyTypeRepository = dataSource.getRepository(PropertyType);

  const propertyTypes = [
    { name: 'شقة', isActive: true },
    { name: 'فيلا', isActive: true },
    { name: 'منزل', isActive: true },
    { name: 'أرض', isActive: true },
    { name: 'مكتب', isActive: true },
    { name: 'محل تجاري', isActive: true },
    { name: 'مستودع', isActive: true },
    { name: 'مزرعة', isActive: true },
  ];

  await propertyTypeRepository.save(propertyTypes);
  console.log('✅ Seeded property types successfully');
};

// Seed Properties
export const seedProperties = async (dataSource: DataSource) => {
  const propertyRepository = dataSource.getRepository(Property);
  const propertyMediaRepository = dataSource.getRepository(PropertyMedia);

  const propertyTypeRepository = dataSource.getRepository(PropertyType);
  const cityRepository = dataSource.getRepository(City);
  const areaRepository = dataSource.getRepository(Area);
  const userRepository = dataSource.getRepository(User);

  const propertyTypes = await propertyTypeRepository.find();
  const cities = await cityRepository.find();
  const areas = await areaRepository.find({ where: { city: cities[0] } });
  const adminUser = await userRepository.findOne({ where: { userType: UserType.ADMIN } });

  const properties: any = [
    {
      title: 'فيلا فاخرة في الرياض',
      description: 'فيلا فاخرة في حي العليا، 5 غرف نوم، 4 حمامات، مساحة 400 متر',
      propertyType: propertyTypes[1], // فيلا
      city: cities[0], // الرياض
      area: areas[0],
      bedrooms: 5,
      bathrooms: 4,
      areaM2: '400',
      price: '2500000',
      specifications: {
        furnished: true,
        parking: true,
        garden: true,
        pool: true,
      },
      guarantees: {
        warranty: '1 year',
        maintenance: 'included',
      },
      accessType: 'mediated',
      ownerName: 'علي أحمد',
      ownerPhone: '+966500000100',
      isActive: true,
      createdBy: adminUser,
    },
    {
      title: 'شقة جديدة في جدة',
      description: 'شقة جديدة في حي الصفا، 3 غرف نوم، 2 حمام، مطبخ أمريكي',
      propertyType: propertyTypes[0], // شقة
      city: cities[1], // جدة
      area: areas[1],
      bedrooms: 3,
      bathrooms: 2,
      areaM2: '150',
      price: '800000',
      specifications: {
        furnished: false,
        parking: true,
        elevator: true,
        security: true,
      },
      guarantees: {
        warranty: '6 months',
      },
      accessType: 'direct',
      isActive: true,
      createdBy: adminUser,
    },
    {
      title: 'أرض سكنية في الدمام',
      description: 'أرض سكنية في حي الخليج، مساحة 600 متر، موقع مميز',
      propertyType: propertyTypes[3], // أرض
      city: cities[4], // الدمام
      area: areas[2],
      bedrooms: 0,
      bathrooms: 0,
      areaM2: '600',
      price: '1200000',
      specifications: {
        utilities: 'available',
        roadAccess: 'paved',
      },
      guarantees: {
        ownership: 'clear',
      },
      accessType: 'direct',
      isActive: true,
      createdBy: adminUser,
    },
  ];

  const savedProperties = await propertyRepository.save(properties);

  // Add media for properties
  const mediaData = [];
  savedProperties.forEach((property, index) => {
    for (let i = 1; i <= 3; i++) {
      mediaData.push({
        property,
        mediaUrl: `https://example.com/property${index + 1}_image${i}.jpg`,
        isPrimary: i === 1,
        orderIndex: i,
      });
    }
  });

  await propertyMediaRepository.save(mediaData);
  console.log('✅ Seeded properties and media successfully');
};

// Seed Appointments
export const seedAppointments = async (dataSource: DataSource) => {
  const appointmentRepository = dataSource.getRepository(Appointment);

  const propertyRepository = dataSource.getRepository(Property);
  const userRepository = dataSource.getRepository(User);
  const agentRepository = dataSource.getRepository(Agent);

  const properties = await propertyRepository.find();
  const customers = await userRepository.find({ where: { userType: UserType.CUSTOMER } });
  const agents = await agentRepository.find({ relations: ['user'] });

  const appointments = [
    {
      property: properties[0],
      customer: customers[0],
      agent: agents[0].user,
      appointmentDate: '2024-02-15',
      startTime: '10:00',
      endTime: '11:00',
      status: AppointmentStatus.CONFIRMED,
      customerNotes: 'مهتم برؤية الفيلا',
      createdChannel: CreatedChannel.WEB,
    },
    {
      property: properties[1],
      customer: customers[1],
      agent: agents[1].user,
      appointmentDate: '2024-02-16',
      startTime: '14:00',
      endTime: '15:00',
      status: AppointmentStatus.PENDING,
      customerNotes: 'أرغب في معاينة الشقة',
      createdChannel: CreatedChannel.APP,
    },
    {
      property: properties[2],
      customer: customers[0],
      appointmentDate: '2024-02-17',
      startTime: '09:00',
      endTime: '10:00',
      status: AppointmentStatus.PENDING,
      customerNotes: 'معاينة الأرض',
      createdChannel: CreatedChannel.WEB,
    },
  ];

  await appointmentRepository.save(appointments);
  console.log('✅ Seeded appointments successfully');
};

// Seed Reviews
export const seedReviews = async (dataSource: DataSource) => {
  const customerReviewRepository = dataSource.getRepository(CustomerReview);
  const agentReviewRepository = dataSource.getRepository(AgentReview);

  const appointmentRepository = dataSource.getRepository(Appointment);
  const userRepository = dataSource.getRepository(User);

  const appointments = await appointmentRepository.find({
    relations: ['customer', 'agent', 'property'],
  });
  const agents = await userRepository.find({ where: { userType: UserType.AGENT } });

  // Customer Reviews
  const customerReviews = [
    {
      appointment: appointments[0],
      customer: appointments[0].customer,
      agentId: agents[0].id,
      rating: 5,
      reviewText: 'وكيل ممتاز ومحترف، شكراً جزيلاً',
      isApproved: true,
    },
    {
      appointment: appointments[1],
      customer: appointments[1].customer,
      agentId: agents[1].id,
      rating: 4,
      reviewText: 'خدمة جيدة، ولكن يمكن تحسين وقت الاستجابة',
      isApproved: true,
    },
  ];

  await customerReviewRepository.save(customerReviews);

  // Agent Reviews
  const agentReviews = [
    {
      appointment: appointments[0],
      agent: agents[0],
      customer: appointments[0].customer,
      rating: 5,
      reviewText: 'عميل محترم والتزم بالموعد',
    },
  ];

  await agentReviewRepository.save(agentReviews);
  console.log('✅ Seeded reviews successfully');
};

// Seed Payments
export const seedPayments = async (dataSource: DataSource) => {
  const paymentRepository = dataSource.getRepository(AgentPayment);
  const balanceRepository = dataSource.getRepository(AgentBalance);

  const appointmentRepository = dataSource.getRepository(Appointment);
  const userRepository = dataSource.getRepository(User);
  const agentRepository = dataSource.getRepository(Agent);

  const appointments = await appointmentRepository.find({ relations: ['agent'] });
  const adminUser = await userRepository.findOne({ where: { userType: UserType.ADMIN } });
  const agents = await agentRepository.find({ relations: ['user'] });

  const payments = [
    {
      appointment: appointments[0],
      agent: appointments[0].agent,
      amount: '500',
      status: PaymentStatus.COMPLETED,
      gateway: PaymentGateway.MANUAL,
      currency: 'SAR',
      paidAt: new Date(),
      updatedBy: adminUser,
    },
    {
      appointment: appointments[1],
      agent: appointments[1].agent,
      amount: '400',
      status: PaymentStatus.PENDING,
      gateway: PaymentGateway.MANUAL,
      currency: 'SAR',
      updatedBy: adminUser,
    },
  ];

  // await paymentRepository.save(payments);

  // Seed Agent Balances
  const balanceData = agents.map(agent => ({
    agent: agent.user,
    totalEarnings: '500',
    pendingBalance: '400',
  }));

  await balanceRepository.save(balanceData);
  console.log('✅ Seeded payments and balances successfully');
};

// Seed Campaigns
export const seedCampaigns = async (dataSource: DataSource) => {
  const campaignRepository = dataSource.getRepository(Campaign);
  const userRepository = dataSource.getRepository(User);

  const adminUser = await userRepository.findOne({ where: { userType: UserType.ADMIN } });

  const campaigns: any = [
    {
      name: 'ترويج الشتاء',
      title: 'عروض الشتاء الخاصة',
      description: 'عروض وتخفيضات خاصة لفصل الشتاء',
      targetChannel: CampaignChannel.WHATSAPP,
      targetAudience: CampaignAudience.CUSTOMERS,
      runType: CampaignRunType.ONCE,
      runOnceDatetime: new Date('2024-12-01T10:00:00'),
      status: CampaignStatus.SCHEDULED,
      messageContent: 'اكتشف عروضنا الخاصة لفصل الشتاء! خصومات تصل إلى 20% على مجموعة مختارة من العقارات.',
      createdBy: adminUser,
    },
    {
      name: 'ترحيب بالعملاء الجدد',
      title: 'مرحباً بكم في منصتنا',
      description: 'رسالة ترحيبية للعملاء الجدد',
      targetChannel: CampaignChannel.WHATSAPP,
      targetAudience: CampaignAudience.NEW_CUSTOMERS,
      runType: CampaignRunType.RECURRING,
      runFrequency: 'daily',
      runTime: '09:00',
      status: CampaignStatus.RUNNING,
      messageContent: 'مرحباً بك في منصتنا العقارية! نحن هنا لمساعدتك في العثور على العقار المثالي.',
      createdBy: adminUser,
    },
  ];

  await campaignRepository.save(campaigns);
  console.log('✅ Seeded campaigns successfully');
};

// Seed Notifications
export const seedNotifications = async (dataSource: DataSource) => {
  const notificationRepository = dataSource.getRepository(Notification);
  const userRepository = dataSource.getRepository(User);

  const customers = await userRepository.find({ where: { userType: UserType.CUSTOMER } });

  const notifications = [
    {
      user: customers[0],
      type: NotificationType.APPOINTMENT_REMINDER,
      title: 'تذكير بالموعد',
      message: 'موعدك مجدول ليوم الغد الساعة 10:00 صباحاً',
      channel: NotificationChannel.WHATSAPP,
      status: NotificationStatus.DELIVERED,
      sentAt: new Date(),
    },
    {
      user: customers[1],
      type: NotificationType.SYSTEM,
      title: 'مرحباً بك',
      message: 'شكراً لتسجيلك في منصتنا العقارية',
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.PENDING,
    },
  ];

  await notificationRepository.save(notifications);
  console.log('✅ Seeded notifications successfully');
};

// Seed CMS Content
export const seedCMS = async (dataSource: DataSource) => {
  const siteSettingsRepository = dataSource.getRepository(SiteSettings);
  const footerSettingsRepository = dataSource.getRepository(FooterSettings);
  const staticPageRepository = dataSource.getRepository(StaticPage);
  const pageSectionRepository = dataSource.getRepository(PageSection);
  const homeBackgroundRepository = dataSource.getRepository(HomeBackground);
  const partnerLogoRepository = dataSource.getRepository(PartnerLogo);
  const faqGroupRepository = dataSource.getRepository(FaqGroup);
  const faqItemRepository = dataSource.getRepository(FaqItem);
  const aboutFeatureRepository = dataSource.getRepository(AboutFeature);
  const aboutStepRepository = dataSource.getRepository(AboutStep);
  const aboutStatRepository = dataSource.getRepository(AboutStat);
  const aboutTeamRepository = dataSource.getRepository(AboutTeam);
  const userRepository = dataSource.getRepository(User);

  const adminUser = await userRepository.findOne({ where: { userType: UserType.ADMIN } });

  // Site Settings
  const siteSettings = siteSettingsRepository.create({
    introVideoUrl: 'https://example.com/intro.mp4',
    customerCount: 1500,
    yearsExperience: 5,
    projectCount: 300,
    email: 'info@realestate.com',
    phoneNumber: '+966112345678',
    twitterUrl: 'https://twitter.com/realestate',
    instagramUrl: 'https://instagram.com/realestate',
    updatedBy: adminUser,
  });
  await siteSettingsRepository.save(siteSettings);

  // Footer Settings
  const footerSettings = footerSettingsRepository.create({
    footerParagraph: 'منصة عقارية رائدة تقدم أفضل الخدمات العقارية في المملكة العربية السعودية',
    newsletterTitle: 'اشترك في نشرتنا الإخبارية',
    newsletterParagraph: 'احصل على آخر العروض والتحديثات',
    updatedBy: adminUser,
  });
  await footerSettingsRepository.save(footerSettings);

  // Static Pages
  const staticPages = [
    { slug: StaticPageSlug.MAIN, title: 'الصفحة الرئيسية', description: 'منصة عقارية متكاملة' },
    { slug: StaticPageSlug.ABOUT, title: 'من نحن', description: 'تعرف على منصتنا العقارية' },
    { slug: StaticPageSlug.TERMS, title: 'الشروط والأحكام', description: 'شروط استخدام المنصة' },
    { slug: StaticPageSlug.PRIVACY, title: 'سياسة الخصوصية', description: 'سياسة الخصوصية والحماية' },
    { slug: StaticPageSlug.FAQ, title: 'الأسئلة الشائعة', description: 'إجابات على الأسئلة المتكررة' },
  ];
  const savedStaticPages = await staticPageRepository.save(staticPages);

  // Page Sections
  const pageSections = [
    {
      page: savedStaticPages[0], // Main page
      sectionKey: SectionKey.CATEGORIES,
      title: 'فئات العقارات',
      description: 'اكتشف مجموعة متنوعة من العقارات المناسبة لاحتياجاتك',
    },
    {
      page: savedStaticPages[0],
      sectionKey: SectionKey.SERVICES,
      title: 'خدماتنا',
      description: 'نقدم مجموعة شاملة من الخدمات العقارية',
    },
  ];
  await pageSectionRepository.save(pageSections);

  // Home Backgrounds
  const homeBackgrounds = [{ imageUrl: 'https://example.com/background1.jpg' }, { imageUrl: 'https://example.com/background2.jpg' }];
  await homeBackgroundRepository.save(homeBackgrounds);

  // Partner Logos
  const partnerLogos = [
    { imageUrl: 'https://example.com/partner1.png', altText: 'شريك 1' },
    { imageUrl: 'https://example.com/partner2.png', altText: 'شريك 2' },
  ];
  await partnerLogoRepository.save(partnerLogos);

  // FAQ
  const faqGroup = faqGroupRepository.create({
    title: 'أسئلة عامة',
  });
  const savedFaqGroup = await faqGroupRepository.save(faqGroup);

  const faqItems = [
    {
      group: savedFaqGroup,
      question: 'كيف يمكنني التسجيل في المنصة؟',
      answer: 'يمكنك التسجيل عن طريق رقم الهاتف والبريد الإلكتروني',
    },
    {
      group: savedFaqGroup,
      question: 'ما هي رسوم الخدمة؟',
      answer: 'نحن نعمل بدون رسوم على العملاء، الرسوم على المعلنين فقط',
    },
  ];
  await faqItemRepository.save(faqItems);

  // About Features
  const aboutFeatures = [{ featureText: 'عقارات متنوعة' }, { featureText: 'وكلاء موثوقون' }, { featureText: 'أسعار تنافسية' }];
  await aboutFeatureRepository.save(aboutFeatures);

  // About Steps
  const aboutSteps = [
    { stepNumber: 1, title: 'اختر العقار', description: 'اختر من بين آلاف العقارات المناسبة' },
    { stepNumber: 2, title: 'حدد الموعد', description: 'حدد موعد المعاينة المناسب لك' },
    { stepNumber: 3, title: 'تملك العقار', description: 'استكمل إجراءات التملك بسهولة' },
  ];
  await aboutStepRepository.save(aboutSteps);

  // About Stats
  const aboutStats = [
    { label: 'عملاء راضون', value: '1500+' },
    { label: 'عقار متاح', value: '500+' },
    { label: 'وكيل معتمد', value: '50+' },
  ];
  await aboutStatRepository.save(aboutStats);

  // About Team
  const aboutTeam = [
    { name: 'أحمد محمد', role: 'المدير التنفيذي', imageUrl: 'https://example.com/team1.jpg' },
    { name: 'سارة أحمد', role: 'مديرة التسويق', imageUrl: 'https://example.com/team2.jpg' },
  ];
  await aboutTeamRepository.save(aboutTeam);

  console.log('✅ Seeded CMS content successfully');
};

// Seed Message Templates
export const seedMessageTemplates = async (dataSource: DataSource) => {
  const messageTemplateRepository = dataSource.getRepository(MessageTemplate);

  const messageTemplates = [
    {
      name: 'APPOINTMENT_REMINDER_AR',
      channel: NotificationChannel.WHATSAPP,
      body: 'مرحباً {{customer_name}}، هذا تذكير بموعدك في {{appointment_date}} الساعة {{appointment_time}}',
      approved: true,
      locale: 'ar',
    },
    {
      name: 'APPOINTMENT_REMINDER_EN',
      channel: NotificationChannel.WHATSAPP,
      body: 'Hello {{customer_name}}, this is a reminder for your appointment on {{appointment_date}} at {{appointment_time}}',
      approved: true,
      locale: 'en',
    },
    {
      name: 'WELCOME_MESSAGE_AR',
      channel: NotificationChannel.WHATSAPP,
      body: 'مرحباً بك {{customer_name}} في منصتنا العقارية! شكراً لتسجيلك معنا.',
      approved: true,
      locale: 'ar',
    },
    {
      name: 'RATING_REQUEST_AR',
      channel: NotificationChannel.WHATSAPP,
      body: 'مرحباً {{customer_name}}، نرجو تقييم تجربتك مع الوكيل {{agent_name}}',
      approved: true,
      locale: 'ar',
    },
  ];

  await messageTemplateRepository.save(messageTemplates);
  console.log('✅ Seeded message templates successfully');
};

// Main Seeder Function
async function runSeeder() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'password',
    database: process.env.DATABASE_NAME || 'real_estate',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: true,
  });

  try {
    await dataSource.initialize();
    console.log('🚀 Starting database seeding...');

    // Clear existing data
    const tables = await dataSource.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public';`);
    const tableNames = tables.map((t: { tablename: string }) => `"${t.tablename}"`).join(', ');

    await dataSource.query(`TRUNCATE ${tableNames} RESTART IDENTITY CASCADE;`);
    console.log('🗑️  Cleared existing data');

    // Run seeders in order (respecting foreign key constraints)
    await seedUsers(dataSource);
    await seedCities(dataSource);
    await seedAreas(dataSource);
    await seedPropertyTypes(dataSource);
    await seedAgents(dataSource);
    await seedProperties(dataSource);
    await seedAppointments(dataSource);
    await seedReviews(dataSource);
    await seedPayments(dataSource);
    await seedCampaigns(dataSource);
    await seedNotifications(dataSource);
    await seedCMS(dataSource);
    await seedMessageTemplates(dataSource);

    console.log('🎉 All seeders completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

// Run the seeder
runSeeder();
