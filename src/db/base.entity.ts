import {
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  BaseEntity,
} from 'typeorm'

export class BaseClass extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
  })
  createdAt: Date

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
  })
  updatedAt: Date

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string
}
