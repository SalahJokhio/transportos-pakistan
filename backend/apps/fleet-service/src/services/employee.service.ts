import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee, EmployeeStatus, EmployeeType } from '../entities/employee.entity';
import { Attendance } from '../entities/attendance.entity';

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
    @InjectRepository(Attendance) private readonly attendanceRepo: Repository<Attendance>,
  ) {}

  // ---- Attendance & payroll (#14) --------------------------------------

  /** Mark (or re-mark) an employee's attendance for a date. */
  async markAttendance(companyId: string, dto: { employeeId: string; date: string; status?: string; note?: string }) {
    const existing = await this.attendanceRepo.findOne({ where: { companyId, employeeId: dto.employeeId, date: dto.date } });
    if (existing) {
      await this.attendanceRepo.update(existing.id, { status: dto.status ?? 'PRESENT', note: dto.note });
      return this.attendanceRepo.findOne({ where: { id: existing.id } });
    }
    return this.attendanceRepo.save(this.attendanceRepo.create({ companyId, employeeId: dto.employeeId, date: dto.date, status: dto.status ?? 'PRESENT', note: dto.note }));
  }

  async listAttendance(companyId: string, date?: string) {
    const where: any = { companyId };
    if (date) where.date = date;
    return this.attendanceRepo.find({ where, order: { date: 'DESC' }, take: 500 });
  }

  /** Monthly payroll: each employee's salary + present/leave/absent day counts. */
  async payroll(companyId: string, month?: string) {
    const m = month || new Date().toISOString().slice(0, 7); // YYYY-MM
    const employees = await this.repo.find({ where: { companyId } });
    const rows = await this.attendanceRepo.query(
      `SELECT "employeeId", status, COUNT(*)::int AS n FROM attendance
       WHERE "companyId" = $1 AND to_char("date", 'YYYY-MM') = $2 GROUP BY "employeeId", status`,
      [companyId, m],
    );
    const byEmp: Record<string, any> = {};
    for (const r of rows) {
      byEmp[r.employeeId] = byEmp[r.employeeId] || { PRESENT: 0, ABSENT: 0, LEAVE: 0, HALF_DAY: 0 };
      byEmp[r.employeeId][r.status] = Number(r.n);
    }
    return {
      month: m,
      staff: employees.map((e) => ({
        employeeId: e.id,
        name: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim(),
        type: e.employeeType,
        salary: Number(e.salary),
        attendance: byEmp[e.id] || { PRESENT: 0, ABSENT: 0, LEAVE: 0, HALF_DAY: 0 },
      })),
      totalPayroll: employees.reduce((s, e) => s + Number(e.salary), 0),
    };
  }

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
