// blogs/blogs.service.ts
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Blog } from './blog.entity';
import { User } from 'entities/global.entity';
import { CreateBlogDto, UpdateBlogDto, BlogQueryDto } from '../../dto/blog.dto';
import slugify from 'slugify';

@Injectable()
export class BlogsService {
  constructor(
    @InjectRepository(Blog)
    public blogsRepository: Repository<Blog>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  private generateSlug(title: string): string {
    return slugify(title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    });
  }

  async create(createBlogDto: CreateBlogDto, authorId: number): Promise<Blog> {
    // Generate slug if not provided
    const slug = createBlogDto.slug || this.generateSlug(createBlogDto.title);

    // Check if slug already exists
    const existingBlog = await this.blogsRepository.findOne({
      where: { slug },
    });

    if (existingBlog) {
      throw new ConflictException('Blog with this slug already exists');
    }

    // Verify author exists
    const author = await this.usersRepository.findOne({
      where: { id: authorId },
    });

    if (!author) {
      throw new NotFoundException('Author not found');
    }

    const blog = this.blogsRepository.create({
      ...createBlogDto,
      slug,
      author,
      authorId,
      // Set publishedAt if isPublished is true and publishedAt is not provided
      publishedAt: createBlogDto.isPublished 
        ? (createBlogDto.publishedAt || new Date())
        : null,
    });

    return this.blogsRepository.save(blog);
  }

  async findAll(query: BlogQueryDto): Promise<{ data: Blog[]; total: number }> {
    const { search, isPublished, authorId, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (isPublished !== undefined) {
      where.isPublished = isPublished;
    }

    if (authorId) {
      where.authorId = authorId;
    }

    if (search) {
      where.title = ILike(`%${search}%`);
    }

    const [data, total] = await this.blogsRepository.findAndCount({
      where,
      relations: ['author'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total };
  }

  async findOne(id: number): Promise<Blog> {
    const blog = await this.blogsRepository.findOne({
      where: { id },
      relations: ['author'],
    });

    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    return blog;
  }

  async findBySlug(slug: string): Promise<Blog> {
    const blog = await this.blogsRepository
    .createQueryBuilder('blog')
    .leftJoinAndSelect('blog.author', 'author')
    .where('blog.slug ILIKE :slug', { slug })
    .getOne();

    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    // Only return published blogs when accessing by slug
    if (!blog.isPublished) {
      throw new NotFoundException('Blog not found');
    }

    return blog;
  }

  async update(id: number, updateBlogDto: UpdateBlogDto): Promise<Blog> {
    const blog = await this.findOne(id);

    // If slug is being updated, check for conflicts
    if (updateBlogDto.slug && updateBlogDto.slug !== blog.slug) {
      const existingBlog = await this.blogsRepository.findOne({
        where: { slug: updateBlogDto.slug },
      });

      if (existingBlog && existingBlog.id !== id) {
        throw new ConflictException('Blog with this slug already exists');
      }
    }

    // Generate slug if title is updated but slug is not provided
    if (updateBlogDto.title && !updateBlogDto.slug) {
      updateBlogDto.slug = this.generateSlug(updateBlogDto.title);
    }

    // Handle publishedAt logic
    if (updateBlogDto.isPublished !== undefined) {
      if (updateBlogDto.isPublished && !blog.publishedAt) {
        updateBlogDto.publishedAt = new Date(updateBlogDto.publishedAt);

      } else if (!updateBlogDto.isPublished) {
        updateBlogDto.publishedAt = null;
      }
    }

    Object.assign(blog, updateBlogDto);
    return this.blogsRepository.save(blog);
  }

  async remove(id: number): Promise<void> {
    const blog = await this.findOne(id);
    await this.blogsRepository.remove(blog);
  }

  async publish(id: number): Promise<Blog> {
    const blog = await this.findOne(id);
    
    blog.isPublished = true;
    blog.publishedAt = blog.publishedAt || new Date();
    
    return this.blogsRepository.save(blog);
  }

  async unpublish(id: number): Promise<Blog> {
    const blog = await this.findOne(id);
    
    blog.isPublished = false;
    blog.publishedAt = null;
    
    return this.blogsRepository.save(blog);
  }
}