import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@bogcha/shared';
import { RequirePermissions, Scope } from '../common/decorators';
import type { RequestScope } from '../common/scope/request-scope';
import {
  CreateRecipeDto,
  RecipeQueryDto,
  ScaleRecipeQueryDto,
  UpdateRecipeDto,
} from './dto/nutrition.dto';
import { RecipesService } from './recipes.service';

@ApiTags('Nutrition')
@Controller('nutrition')
export class NutritionController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get('recipes')
  @RequirePermissions(Permission.RECIPE_VIEW)
  @ApiOperation({ summary: "Retseptlar ro'yxati" })
  recipes(@Query() query: RecipeQueryDto, @Scope() scope: RequestScope) {
    return this.recipesService.list(scope, query);
  }

  @Get('recipes/:id')
  @RequirePermissions(Permission.RECIPE_VIEW)
  @ApiOperation({ summary: 'Retsept tarkibi va tannarxi' })
  recipe(@Param('id', ParseUUIDPipe) id: string, @Scope() scope: RequestScope) {
    return this.recipesService.findOne(scope, id);
  }

  @Get('recipes/:id/scale')
  @RequirePermissions(Permission.RECIPE_VIEW)
  @ApiOperation({ summary: 'Retseptni bolalar soniga moslash' })
  scaleRecipe(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ScaleRecipeQueryDto,
    @Scope() scope: RequestScope,
  ) {
    return this.recipesService.scale(scope, id, query.headcount);
  }

  @Post('recipes')
  @RequirePermissions(Permission.RECIPE_MANAGE)
  @ApiOperation({ summary: 'Yangi retsept' })
  createRecipe(@Body() body: CreateRecipeDto, @Scope() scope: RequestScope) {
    return this.recipesService.create(scope, body);
  }

  @Patch('recipes/:id')
  @RequirePermissions(Permission.RECIPE_MANAGE)
  @ApiOperation({ summary: "Retseptni o'zgartirish" })
  updateRecipe(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateRecipeDto,
    @Scope() scope: RequestScope,
  ) {
    return this.recipesService.update(scope, id, body);
  }

  @Delete('recipes/:id')
  @RequirePermissions(Permission.RECIPE_MANAGE)
  @ApiOperation({ summary: "Retseptni o'chirish" })
  removeRecipe(@Param('id', ParseUUIDPipe) id: string, @Scope() scope: RequestScope) {
    return this.recipesService.remove(scope, id);
  }
}
