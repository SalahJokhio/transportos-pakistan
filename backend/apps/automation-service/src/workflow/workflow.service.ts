import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import { WorkflowInstance, WorkflowHistoryEntry } from './entities/workflow-instance.entity';
import { EventBusService } from '../services/event-bus.service';

interface Actor { userId: string; role?: string; companyId: string | null }

/** The Approval Workflow Engine: definitions + running instances. */
@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(WorkflowDefinition) private readonly defRepo: Repository<WorkflowDefinition>,
    @InjectRepository(WorkflowInstance) private readonly instRepo: Repository<WorkflowInstance>,
    private readonly eventBus: EventBusService,
  ) {}

  // ── definitions ────────────────────────────────────────────────────
  listDefinitions(companyId: string | null) {
    const where: any[] = [{ companyId: IsNull() }];
    if (companyId) where.push({ companyId });
    return this.defRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  createDefinition(companyId: string | null, dto: Partial<WorkflowDefinition>) {
    return this.defRepo.save(this.defRepo.create({ ...dto, companyId: companyId ?? null }));
  }

  async updateDefinition(id: string, patch: Partial<WorkflowDefinition>) {
    const def = await this.defRepo.findOne({ where: { id } });
    if (!def) throw new NotFoundException('Workflow not found');
    Object.assign(def, patch);
    return this.defRepo.save(def);
  }

  async removeDefinition(id: string) {
    await this.defRepo.delete({ id });
    return { deleted: true };
  }

  // ── instances ──────────────────────────────────────────────────────
  /** Start a request against a definition (snapshots its steps). */
  async start(actor: Actor, dto: { definitionId: string; title: string; amount?: number; context?: any }) {
    const def = await this.defRepo.findOne({ where: { id: dto.definitionId } });
    if (!def) throw new NotFoundException('Workflow definition not found');
    if (!def.steps?.length) throw new BadRequestException('Workflow has no steps');

    const now = new Date().toISOString();
    const inst = await this.instRepo.save(this.instRepo.create({
      definitionId: def.id,
      companyId: actor.companyId ?? def.companyId ?? null,
      title: dto.title,
      amount: dto.amount ?? null,
      context: dto.context ?? {},
      status: 'PENDING',
      currentStep: 0,
      steps: def.steps,
      requestedBy: actor.userId,
      history: [{ step: -1, stepName: 'Request', action: 'started', by: actor.userId, byRole: actor.role, at: now }],
    }));

    this.eventBus.emit('WORKFLOW_STARTED', {
      instanceId: inst.id, definition: def.name, title: inst.title, amount: inst.amount,
    }, { companyId: inst.companyId, source: 'workflow' }).catch(() => undefined);
    return inst;
  }

  /** Approve or reject the current step. */
  async act(actor: Actor, instanceId: string, action: 'approve' | 'reject', note?: string) {
    const inst = await this.instRepo.findOne({ where: { id: instanceId } });
    if (!inst) throw new NotFoundException('Request not found');
    if (inst.status !== 'PENDING') throw new BadRequestException(`Request already ${inst.status.toLowerCase()}`);

    const step = inst.steps[inst.currentStep];
    if (!step) throw new BadRequestException('No step awaiting action');

    // Role gate: the approver's role must match the step (SUPER_ADMIN can act on any).
    if (actor.role !== 'SUPER_ADMIN' && step.approverRole && actor.role !== step.approverRole) {
      throw new ForbiddenException(`This step needs a ${step.approverRole} approver`);
    }

    const entry: WorkflowHistoryEntry = {
      step: inst.currentStep, stepName: step.name, action: action === 'approve' ? 'approved' : 'rejected',
      by: actor.userId, byRole: actor.role, note, at: new Date().toISOString(),
    };
    inst.history = [...inst.history, entry];

    if (action === 'reject') {
      inst.status = 'REJECTED';
      inst.completedAt = new Date();
      await this.instRepo.save(inst);
      this.eventBus.emit('WORKFLOW_REJECTED', {
        instanceId: inst.id, title: inst.title, step: step.name, by: actor.userId, note,
      }, { companyId: inst.companyId, source: 'workflow' }).catch(() => undefined);
      return inst;
    }

    // approve → advance
    if (inst.currentStep >= inst.steps.length - 1) {
      inst.status = 'APPROVED';
      inst.completedAt = new Date();
      await this.instRepo.save(inst);
      this.eventBus.emit('WORKFLOW_APPROVED', {
        instanceId: inst.id, title: inst.title, amount: inst.amount, definitionId: inst.definitionId,
      }, { companyId: inst.companyId, source: 'workflow' }).catch(() => undefined);
      return inst;
    }

    inst.currentStep += 1;
    await this.instRepo.save(inst);
    return inst;
  }

  async cancel(actor: Actor, instanceId: string) {
    const inst = await this.instRepo.findOne({ where: { id: instanceId } });
    if (!inst) throw new NotFoundException('Request not found');
    if (inst.requestedBy !== actor.userId && actor.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only the requester can cancel');
    }
    if (inst.status !== 'PENDING') throw new BadRequestException(`Request already ${inst.status.toLowerCase()}`);
    inst.status = 'CANCELLED';
    inst.completedAt = new Date();
    return this.instRepo.save(inst);
  }

  listInstances(companyId: string | null, status?: string) {
    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (status) where.status = status;
    return this.instRepo.find({ where, order: { createdAt: 'DESC' }, take: 200 });
  }

  /** Requests currently awaiting THIS actor's role (their approval inbox). */
  async inbox(actor: Actor) {
    const pending = await this.instRepo.find({
      where: actor.companyId ? { status: 'PENDING', companyId: actor.companyId } : { status: 'PENDING' },
      order: { createdAt: 'ASC' },
      take: 200,
    });
    return pending.filter((i) => {
      const step = i.steps[i.currentStep];
      return step && (actor.role === 'SUPER_ADMIN' || !step.approverRole || step.approverRole === actor.role);
    });
  }

  async getInstance(id: string) {
    const inst = await this.instRepo.findOne({ where: { id } });
    if (!inst) throw new NotFoundException('Request not found');
    return inst;
  }
}
