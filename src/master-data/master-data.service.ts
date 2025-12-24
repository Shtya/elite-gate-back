import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { City, Area, PropertyType } from "entities/global.entity";
import {
  CreateCityDto,
  UpdateCityDto,
  CreateAreaDto,
  UpdateAreaDto,
  CreatePropertyTypeDto,
  UpdatePropertyTypeDto,
  MasterDataQueryDto,
} from "../../dto/master-data.dto";

@Injectable()
export class MasterDataService {
  constructor(
    @InjectRepository(City)
    public readonly citiesRepository: Repository<City>, // 👈 expose
    @InjectRepository(Area)
    public readonly areasRepository: Repository<Area>, // 👈 expose
    @InjectRepository(PropertyType)
    public readonly propertyTypesRepository: Repository<PropertyType> // 👈 expose
  ) {}

  async getCity(id: number): Promise<City> {
    const city = await this.citiesRepository.findOne({ where: { id } });
    if (!city) {
      throw new NotFoundException("City not found");
    }
    return city;
  }

  async createCity(createCityDto: CreateCityDto): Promise<City> {
    const existingCity = await this.citiesRepository.findOne({
      where: { name: createCityDto.name },
    });

    if (existingCity) {
      throw new ConflictException("City with this name already exists");
    }

    const city = this.citiesRepository.create(createCityDto);
    return this.citiesRepository.save(city);
  }

  async updateCity(id: number, updateCityDto: UpdateCityDto): Promise<City> {
    const city = await this.getCity(id);

    if (updateCityDto.name && updateCityDto.name !== city.name) {
      const existingCity = await this.citiesRepository.findOne({
        where: { name: updateCityDto.name },
      });

      if (existingCity) {
        throw new ConflictException("City with this name already exists");
      }
    }

    Object.assign(city, updateCityDto);
    return this.citiesRepository.save(city);
  }

  async getArea(id: number): Promise<Area> {
    const area = await this.areasRepository.findOne({
      where: { id },
      relations: ["city"],
    });
    if (!area) {
      throw new NotFoundException("Area not found");
    }
    return area;
  }

  async createArea(createAreaDto: CreateAreaDto): Promise<Area> {
    const city = await this.citiesRepository.findOne({
      where: { id: createAreaDto.cityId },
    });
    if (!city) {
      throw new NotFoundException("City not found");
    }

    const existingArea = await this.areasRepository.findOne({
      where: {
        name: createAreaDto.name,
        city: { id: createAreaDto.cityId },
      },
    });

    if (existingArea) {
      throw new ConflictException(
        "Area with this name already exists in this city"
      );
    }

    const area = this.areasRepository.create({
      ...createAreaDto,
      city,
    });

    return this.areasRepository.save(area);
  }

  async updateArea(id: number, updateAreaDto: UpdateAreaDto): Promise<Area> {
    const area = await this.getArea(id);

    if (updateAreaDto.name && updateAreaDto.name !== area.name) {
      const existingArea = await this.areasRepository.findOne({
        where: {
          name: updateAreaDto.name,
          city: { id: area.city.id },
        },
      });

      if (existingArea) {
        throw new ConflictException(
          "Area with this name already exists in this city"
        );
      }
    }

    Object.assign(area, updateAreaDto);
    return this.areasRepository.save(area);
  }

  async getPropertyType(id: number): Promise<PropertyType> {
    const propertyType = await this.propertyTypesRepository.findOne({
      where: { id },
    });
    if (!propertyType) {
      throw new NotFoundException("Property type not found");
    }
    return propertyType;
  }

  async createPropertyType(
    createPropertyTypeDto: CreatePropertyTypeDto
  ): Promise<PropertyType> {
    const existingPropertyType = await this.propertyTypesRepository.findOne({
      where: { name: createPropertyTypeDto.name },
    });

    if (existingPropertyType) {
      throw new ConflictException(
        "Property type with this name already exists"
      );
    }

    const propertyType = this.propertyTypesRepository.create(
      createPropertyTypeDto
    );
    return this.propertyTypesRepository.save(propertyType);
  }

  async updatePropertyType(
    id: number,
    updatePropertyTypeDto: UpdatePropertyTypeDto
  ): Promise<PropertyType> {
    const propertyType = await this.getPropertyType(id);

    if (
      updatePropertyTypeDto.name &&
      updatePropertyTypeDto.name !== propertyType.name
    ) {
      const existingPropertyType = await this.propertyTypesRepository.findOne({
        where: { name: updatePropertyTypeDto.name },
      });

      if (existingPropertyType) {
        throw new ConflictException(
          "Property type with this name already exists"
        );
      }
    }

    Object.assign(propertyType, updatePropertyTypeDto);
    return this.propertyTypesRepository.save(propertyType);
  }
  async removeCity(id: number): Promise<void> {
    const city = await this.getCity(id);
    await this.citiesRepository.remove(city);
  }

  async removeArea(id: number): Promise<void> {
    const area = await this.getArea(id);
    await this.areasRepository.remove(area);
  }

  async removePropertyType(id: number): Promise<void> {
    const propertyType = await this.getPropertyType(id);
    await this.propertyTypesRepository.remove(propertyType);
  }

  async getCitiesWithAreasCount(query: any) {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 100;
  const skip = (page - 1) * limit;

  const sortBy = query.sortBy || "name";
  const sortOrder = query.sortOrder?.toUpperCase() === "DESC" ? "DESC" : "ASC";
  const search = query.q || query.search;

  const qb = this.citiesRepository
    .createQueryBuilder("city")
    .leftJoin("city.areas", "area")
    .select("city.id", "id")
    .addSelect("city.name", "name")
    .addSelect("city.isActive", "isActive")
    .addSelect("COUNT(area.id)", "areasCount")
    .groupBy("city.id");

  // 🔍 Search (same as CRUD.findAll)
  if (search) {
    qb.andWhere("LOWER(city.name) LIKE LOWER(:search)", {
      search: `%${search}%`,
    });
  }

  // ✅ Filters
  if (typeof query.isActive !== "undefined") {
    qb.andWhere("city.isActive = :isActive", {
      isActive:
        query.isActive === "true"
          ? true
          : query.isActive === "false"
          ? false
          : query.isActive,
    });
  }

  // ↕ Sorting
  qb.orderBy(`city.${sortBy}`, sortOrder);

  // 📄 Pagination
  qb.skip(skip).take(limit);

  // 📊 Count (distinct cities)
  const total = await qb.getCount();
  const data = await qb.getRawMany();

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

}
