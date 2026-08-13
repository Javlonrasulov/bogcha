import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryModule } from '../inventory/inventory.module';
import { Recipe } from '../entities/recipe.entity';
import { RecipeItem } from '../entities/recipe-item.entity';
import { NutritionController } from './nutrition.controller';
import { RecipesService } from './recipes.service';

@Module({
  imports: [InventoryModule, TypeOrmModule.forFeature([Recipe, RecipeItem])],
  controllers: [NutritionController],
  providers: [RecipesService],
  exports: [RecipesService],
})
export class NutritionModule {}
