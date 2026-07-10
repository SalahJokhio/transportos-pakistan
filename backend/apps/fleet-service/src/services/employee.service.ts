import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee, EmployeeStatus, EmployeeType } from '../entities/employee.entity';

export interface CreateEmployeeInput {
  employeeType: EmployeeType;
  firstName: string;
  lastName?: string;
  cnic?: string;
  phone?: string;
  address?: string;
  nextOfKin?: string;
  depot?: string;
  joinDate?: string;
  salary?: number;
  status?: EmployeeStatus;
  photoUrl?: string;
  documents?: any;
  userId?: string;
  notes?: string;
}

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee) private readonly repo: Repository<Employee>,
  ) {}

  async create(dto: CreateEmployeeInput, companyId: string): Promise<Employee> {
    const employee = this.repo.create({ ...dto, companyId });
    return this.repo.save(employee);
  }

  async list(companyId: string, filters: { type?: string; status?: string; search?: string } = {}) {
    const qb = this.repo.createQueryBuilder('e').where('e.companyId = :companyId', { companyId });
    if (filters.type) qb.andWhere('e.employeeType = :type', { type: filters.type });
    if (filters.status) qb.andWhere('e.status = :status', { status: filters.status });
    if (filters.search) {
      qb.andWhere('(e.firstName ILIKE :s OR e.lastName ILIKE :s OR e.cnic ILIKE :s OR e.phone ILIKE :s)', {
        s: `%${filters.search}%`,
      });
    }
    return qb.orderBy('e.createdAt', 'DESC').getMany();
  }

  async stats(companyId: string) {
    const employees = await this.repo.find({ where: { companyId } });
    const total = employees.length;
    const onDuty = employees.filter((e) => e.status === EmployeeStatus.ON_DUTY).length;
    const onLeave = employees.filter((e) => e.status === EmployeeStatus.ON_LEAVE).length;
    const monthlyPayroll = employees
      .filter((e) => e.status !== EmployeeStatus.INACTIVE)
      .reduce((sum, e) => sum + Number(e.salary || 0), 0);

    const byType: Record<string, number> = {};
    for (const e of employees) byType[e.employeeType] = (byType[e.employeeType] || 0) + 1;

    return { total, onDuty, onLeave, monthlyPayroll, byType };
  }

  async findOne(id: string, companyId: string): Promise<Employee> {
    const employee = await this.repo.findOne({ where: { id, companyId } });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async update(id: string, companyId: string, patch: Partial<CreateEmployeeInput>): Promise<Employee> {
    const employee = await this.findOne(id, companyId);
    Object.assign(employee, patch);
    return this.repo.save(employee);
  }

  async remove(id: string, companyId: string): Promise<{ deleted: boolean }> {
    const employee = await this.findOne(id, companyId);
    employee.status = EmployeeStatus.INACTIVE;
    await this.repo.save(employee);
    return { deleted: true };
  }
}
