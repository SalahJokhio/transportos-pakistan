import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InboxNotification } from './inbox.entity';
import { InboxService } from './inbox.service';
import { InboxController } from './inbox.controller';

/** In-app notification inbox + bell API. */
@Module({
  imports: [TypeOrmModule.forFeature([InboxNotification])],
  controllers: [InboxController],
  providers: [InboxService],
  exports: [InboxService],
})
export class InboxModule {}
