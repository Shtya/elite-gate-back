import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Req,
    BadRequestException,
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { imageUploadOptions } from 'common/upload.config';
  
  import { BlogsService } from './blog.service';
  import { CreateBlogDto, UpdateBlogDto, BlogQueryDto } from '../../dto/blog.dto';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { RolesGuard } from '../auth/guards/roles.guard';
  import { Roles } from '../auth/decorators/roles.decorator';
  import { UserType } from 'entities/global.entity';
  
  interface RequestWithUser extends Request {
    user: any;
  }
  
  @Controller('blogs')
  export class BlogsController {
    constructor(private readonly blogsService: BlogsService) {}
  
    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)

    @Roles(UserType.ADMIN)
    @UseInterceptors(FileInterceptor('image', imageUploadOptions))
    async create(
      @Body() createBlogDto: CreateBlogDto,
      @Req() req: RequestWithUser,
      @UploadedFile() file?: Express.Multer.File,
    ) {
      const authorId = req.user.id;
  
      if (file) {
        createBlogDto.image = `/uploads/images/${file.filename}`;
      }
  
      return this.blogsService.create(createBlogDto, authorId);
    }
  
    @Get()
    async findAll(@Query() query: BlogQueryDto) {
      const repository = this.blogsService.blogsRepository;
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 10;
      const skip = (page - 1) * limit;
  
      const qb = repository.createQueryBuilder('blog')
        .leftJoinAndSelect('blog.author', 'author')
        .skip(skip)
        .take(limit)
        .orderBy('blog.createdAt', 'DESC');
  
      // Filters
      if (query.search) {
        qb.andWhere('blog.title ILIKE :search', { search: `%${query.search}%` });
      }
  
      if (query.isPublished !== undefined) {
        qb.andWhere('blog.isPublished = :isPublished', { isPublished: query.isPublished });
      }
  
      if (query.authorId) {
        qb.andWhere('blog.authorId = :authorId', { authorId: Number(query.authorId) });
      }
  
      const [records, total] = await qb.getManyAndCount();
  
      return {
        total_records: total,
        current_page: page,
        per_page: limit,
        records,
      };
    }
  
    @Get('published')
    async findPublished(@Query() query: BlogQueryDto) {
      const publishedQuery = {
        ...query,
        isPublished: true,
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 10,
      };
  
      return this.blogsService.findAll(publishedQuery);
    }
  
    @Get('slug/:slug')
    async findBySlug(@Param('slug') slug: string) {
      return this.blogsService.findBySlug(slug);
    }
  
    @Get(':id')
    @Roles(UserType.ADMIN, UserType.AGENT, UserType.QUALITY)
    async findOne(@Param('id') id: string) {
      return this.blogsService.findOne(+id);
    }
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Patch(':id')
    @Roles(UserType.ADMIN)
    @UseInterceptors(FileInterceptor('image', imageUploadOptions))
    async update(
      @Param('id') id: string,
      @Body() updateBlogDto: UpdateBlogDto,
      @UploadedFile() file?: Express.Multer.File,
    ) {
      if (file) {
        updateBlogDto.image = `/uploads/images/${file.filename}`;
      }
  
      return this.blogsService.update(+id, updateBlogDto);
    }
    @UseGuards(JwtAuthGuard, RolesGuard)
  
    @Post(':id/publish')
    @Roles(UserType.ADMIN, UserType.AGENT)
    async publish(@Param('id') id: string) {
      return this.blogsService.publish(+id);
    }
    @UseGuards(JwtAuthGuard, RolesGuard)
  
    @Post(':id/unpublish')
    @Roles(UserType.ADMIN, UserType.AGENT)
    async unpublish(@Param('id') id: string) {
      return this.blogsService.unpublish(+id);
    }
    @UseGuards(JwtAuthGuard, RolesGuard)
  
    @Delete(':id')
    @Roles(UserType.ADMIN)
    async remove(@Param('id') id: string) {
      return this.blogsService.remove(+id);
    }
  
    // @Get('author/my-blogs')
    // @Roles(UserType.ADMIN, UserType.AGENT)
    // async findMyBlogs(@Req() req: RequestWithUser, @Query() query: BlogQueryDto) {
    //   const authorId = req.user.id;
      
    //   const authorQuery = {
    //     ...query,
    //     authorId,
    //     page: Number(query.page) || 1,
    //     limit: Number(query.limit) || 10,
    //   };
  
    //   return this.blogsService.findAll(authorQuery);
    // }
  }