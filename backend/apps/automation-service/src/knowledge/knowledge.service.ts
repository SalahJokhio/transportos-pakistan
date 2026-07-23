import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { KbArticle } from './knowledge.entity';

const STOP = new Set(['the', 'a', 'an', 'is', 'are', 'of', 'to', 'in', 'for', 'and', 'or', 'how', 'what', 'kya', 'hai', 'ka', 'ki', 'ke', 'do', 'kar', 'ko', 'me', 'mein']);

/**
 * Enterprise Knowledge Base + lightweight RAG. Stores SOPs/policies/FAQs and
 * retrieves the most relevant articles for a query (keyword TF scoring over
 * title/tags/body) — no external vector DB needed. The Copilot uses `retrieve`
 * to ground answers on company knowledge.
 */
@Injectable()
export class KnowledgeService {
  constructor(@InjectRepository(KbArticle) private readonly repo: Repository<KbArticle>) {}

  list(companyId: string | null, category?: string) {
    const base: any = category ? { category } : {};
    const where: any[] = [{ ...base, companyId: IsNull() }];
    if (companyId) where.push({ ...base, companyId });
    return this.repo.find({ where, order: { updatedAt: 'DESC' }, take: 300 });
  }

  create(companyId: string | null, dto: Partial<KbArticle>) {
    return this.repo.save(this.repo.create({ ...dto, companyId: companyId ?? null }));
  }

  async update(id: string, patch: Partial<KbArticle>) {
    const a = await this.repo.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Article not found');
    Object.assign(a, patch);
    return this.repo.save(a);
  }

  async remove(id: string) {
    await this.repo.delete({ id });
    return { deleted: true };
  }

  private tokens(s: string): string[] {
    return (s.toLowerCase().match(/[a-z0-9]+/g) || []).filter((t) => t.length > 2 && !STOP.has(t));
  }

  /** Retrieve the top-k relevant active articles for a query. */
  async retrieve(companyId: string | null, query: string, k = 3): Promise<{ id: string; title: string; category: string; body: string; score: number }[]> {
    const where: any[] = [{ companyId: IsNull(), isActive: true }];
    if (companyId) where.push({ companyId, isActive: true });
    const articles = await this.repo.find({ where, take: 500 });
    const qTokens = this.tokens(query);
    if (!qTokens.length) return [];

    const scored = articles.map((a) => {
      const title = this.tokens(a.title);
      const tags = (a.tags || []).map((t) => t.toLowerCase());
      const body = this.tokens(a.body);
      let score = 0;
      for (const qt of qTokens) {
        if (title.includes(qt)) score += 5;      // title match weighs most
        if (tags.includes(qt)) score += 4;
        score += body.filter((b) => b === qt).length; // term frequency in body
      }
      return { id: a.id, title: a.title, category: a.category, body: a.body, score };
    });
    return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, k);
  }
}
