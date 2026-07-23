import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KbArticle } from './knowledge.entity';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeController } from './knowledge.controller';

/** Enterprise Knowledge Base + RAG. Exports KnowledgeService so the Copilot grounds on it. */
@Module({
  imports: [TypeOrmModule.forFeature([KbArticle])],
  controllers: [KnowledgeController],
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
