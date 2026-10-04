import {
  connect,
  consumerOpts,
  RetentionPolicy,
  StorageType,
  StringCodec,
  type NatsConnection,
} from 'nats';
import type { TaskQueue, TaskService } from './services/tasks.js';
export class NatsTaskQueue implements TaskQueue {
  private connection!: NatsConnection;
  private stopping = false;
  private connected = false;
  private codec = StringCodec();
  private run?: Promise<void>;
  constructor(
    private url: string,
    private token?: string,
  ) {}
  async open() {
    this.connection = await connect({
      servers: this.url,
      token: this.token,
      maxReconnectAttempts: -1,
    });
    this.connected = true;
    void this.watchStatus();
    const manager = await this.connection.jetstreamManager();
    try {
      await manager.streams.info('PATENTE_TASKS');
    } catch (e) {
      if ((e as { code?: string }).code !== '404') throw e;
      await manager.streams.add({
        name: 'PATENTE_TASKS',
        subjects: ['patente.tasks'],
        storage: StorageType.File,
        retention: RetentionPolicy.Workqueue,
        max_bytes: 4194304,
        max_msgs: 10000,
        duplicate_window: 120000000000,
      });
    }
  }
  private async watchStatus() {
    for await (const status of this.connection.status()) {
      if (status.type === 'disconnect' || status.type === 'error') this.connected = false;
      if (status.type === 'reconnect') this.connected = true;
    }
  }
  async publish(id: string) {
    await this.connection
      .jetstream()
      .publish('patente.tasks', this.codec.encode(id), { msgID: id });
  }
  healthy() {
    return (
      this.connected &&
      !this.stopping &&
      !!this.connection &&
      !this.connection.isClosed() &&
      !this.connection.isDraining()
    );
  }
  start(service: TaskService) {
    this.run = this.consume(service);
    this.run.catch((e) => {
      console.error('Worker stopped:', e.message);
      this.stopping = true;
    });
  }
  private async consume(service: TaskService) {
    const options = consumerOpts();
    options.durable('patente-worker');
    options.manualAck();
    options.ackExplicit();
    options.ackWait(60000);
    options.maxAckPending(1);
    options.deliverTo('patente.worker');
    const sub = await this.connection.jetstream().subscribe('patente.tasks', options);
    for await (const msg of sub) {
      if (this.stopping) break;
      const id = this.codec.decode(msg.data);
      try {
        await service.execute(id);
        msg.ack();
      } catch (e) {
        try {
          await service.fail(id, (e as Error).message);
          msg.ack();
        } catch {
          msg.nak(1000);
        }
      }
    }
  }
  async close() {
    this.stopping = true;
    if (this.connection) await this.connection.close();
    await this.run?.catch(() => {});
  }
}
