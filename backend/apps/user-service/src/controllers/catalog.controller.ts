import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CatalogService } from '../services/catalog.service';

/** Public catalog reads for the passenger web/app (cities, banners). */
@ApiTags('Catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('cities')
  @ApiOperation({ summary: 'Active cities for search dropdowns' })
  cities() {
    return this.catalog.listCities(true);
  }

  @Get('banners')
  @ApiOperation({ summary: 'Active marketing banners' })
  banners(@Query('placement') placement?: string) {
    return this.catalog.listBanners(placement, true);
  }

  @Get('fare-rules')
  @ApiOperation({ summary: 'Current fare governor (min/max/surge cap)' })
  fareRules() {
    return this.catalog.getFareRules();
  }

  @Get('flags')
  @ApiOperation({ summary: 'Public feature flags for the client' })
  flags() {
    return this.catalog.getFlags();
  }
}
