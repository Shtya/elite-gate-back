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
} from "@nestjs/common";
import { MasterDataService } from "./master-data.service";
import {
  CreateCityDto,
  UpdateCityDto,
  CreateAreaDto,
  UpdateAreaDto,
  CreatePropertyTypeDto,
  UpdatePropertyTypeDto,
  MasterDataQueryDto,
} from "../../dto/master-data.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserType } from "entities/global.entity";
import { CRUD } from "common/crud.service";

@Controller("master-data")
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  // Cities
  @Get("cities")
  getCities(@Query() query: any) {
    const filters: Record<string, any> = {};
    if (typeof query.isActive !== "undefined") {
      filters.isActive =
        query.isActive === "true"
          ? true
          : query.isActive === "false"
            ? false
            : query.isActive;
    }

    return CRUD.findAll(
      this.masterDataService.citiesRepository, // repo
      "city", // alias
      query.q || query.search, // search
      query.page, // page
      query.limit ?? 100, // limit (default 100 like before)
      query.sortBy ?? "name", // sortBy
      query.sortOrder ?? "ASC", // sortOrder
      [], // relations
      ["name"], // searchFields
      filters // filters
    );
  }
@Get("cities-with-areas-count")
getCitiesWithAreasCount(@Query() query: any) {
  return this.masterDataService.getCitiesWithAreasCount(query);
}

  @Get("cities/:id")
  getCity(@Param("id") id: string) {
    return this.masterDataService.getCity(+id);
  }

  @Post("cities")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  createCity(@Body() createCityDto: CreateCityDto) {
    return this.masterDataService.createCity(createCityDto);
  }

  @Patch("cities/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  updateCity(@Param("id") id: string, @Body() updateCityDto: UpdateCityDto) {
    return this.masterDataService.updateCity(+id, updateCityDto);
  }

  // Areas
  @Get("areas")
  getAreas(@Query() query: any) {
    const filters: Record<string, any> = {};
    if (typeof query.isActive !== "undefined") {
      filters.isActive =
        query.isActive === "true"
          ? true
          : query.isActive === "false"
            ? false
            : query.isActive;
    }
    if (query.cityId) filters.city = { id: Number(query.cityId) };

    return CRUD.findAll(
      this.masterDataService.areasRepository, // repo
      "area", // alias
      query.q || query.search, // search
      query.page, // page
      query.limit ?? 100, // limit
      query.sortBy ?? "name", // sortBy
      query.sortOrder ?? "ASC", // sortOrder
      ["city"], // relations
      ["name"], // searchFields
      filters // filters
    );
  }

  @Get("areas/city/:cityId")
  getAreasByCity(@Param("cityId") cityId: string, @Query() query: any) {
    const filters: Record<string, any> = {
      city: { id: Number(cityId) },
      isActive: true,
    };

    return CRUD.findAll(
      this.masterDataService.areasRepository,
      "area",
      query?.q || query?.search,
      query?.page,
      query?.limit ?? 100,
      query?.sortBy ?? "name",
      query?.sortOrder ?? "ASC",
      ["city"],
      ["name"],
      filters
    );
  }

  @Get("areas/:id")
  getArea(@Param("id") id: string) {
    return this.masterDataService.getArea(+id);
  }

  @Post("areas")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  createArea(@Body() createAreaDto: CreateAreaDto) {
    return this.masterDataService.createArea(createAreaDto);
  }

  @Patch("areas/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  updateArea(@Param("id") id: string, @Body() updateAreaDto: UpdateAreaDto) {
    return this.masterDataService.updateArea(+id, updateAreaDto);
  }

  // Property Types
  @Get("property-types")
  getPropertyTypes(@Query() query: any) {
    const filters: Record<string, any> = {};
    if (typeof query.isActive !== "undefined") {
      filters.isActive =
        query.isActive === "true"
          ? true
          : query.isActive === "false"
            ? false
            : query.isActive;
    }

    return CRUD.findAll(
      this.masterDataService.propertyTypesRepository, // repo
      "property_type", // alias
      query.q || query.search, // search
      query.page, // page
      query.limit ?? 100, // limit
      query.sortBy ?? "name", // sortBy
      query.sortOrder ?? "ASC", // sortOrder
      [], // relations
      ["name"], // searchFields
      filters // filters
    );
  }

  @Get("property-types/:id")
  getPropertyType(@Param("id") id: string) {
    return this.masterDataService.getPropertyType(+id);
  }

  @Post("property-types")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  createPropertyType(@Body() createPropertyTypeDto: CreatePropertyTypeDto) {
    return this.masterDataService.createPropertyType(createPropertyTypeDto);
  }

  @Patch("property-types/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  updatePropertyType(
    @Param("id") id: string,
    @Body() updatePropertyTypeDto: UpdatePropertyTypeDto
  ) {
    return this.masterDataService.updatePropertyType(
      +id,
      updatePropertyTypeDto
    );
  }
  @Delete("cities/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  removeCity(@Param("id") id: string) {
    return this.masterDataService.removeCity(+id);
  }

  @Delete("areas/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  removeArea(@Param("id") id: string) {
    return this.masterDataService.removeArea(+id);
  }

  @Delete("property-types/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  removePropertyType(@Param("id") id: string) {
    return this.masterDataService.removePropertyType(+id);
  }
}
