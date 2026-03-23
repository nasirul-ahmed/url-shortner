import { Job, Queue, Worker } from 'bullmq';
import { Container } from 'typedi';
import { AppLogger } from '../services/logger';
import { createRedisClient } from '../redis';
import MailerService from '../services/mailer';

export enum JobIdEnums {
  SEND_WELCOME_EMAIL = 'SEND_WELCOME_EMAIL',
  SEND_FORGOT_PASSWORD = 'SEND_FORGOT_PASSWORD',
}

export default ({ queue, logger }: { queue: Queue; logger: AppLogger }) => {
  const worker = new Worker(queue.name, processJob, {
    connection: createRedisClient() as any,
    removeOnComplete: { count: 100 }, // Keep last 100 for debugging
    removeOnFail: { count: 500 },
  });

  worker.on('completed', (job: Job) => {
    logger.info(`Job: ${job.id} [${job.name}] completed`);
  });

  worker.on('failed', (job: Job | undefined, error: Error) => {
    console.log(error);
    logger.error(`Job: ${job?.id} [${job?.name}] failed`, { error: error, context: 'Worker', data: job.data });
  });

  worker.on('error', (err) => {
    logger.error('Critical Worker Error', { error: err, context: 'Worker' });
  });
};

const processJob = async (job: Job): Promise<any> => {
  switch (job.name) {
    case JobIdEnums.SEND_WELCOME_EMAIL:
    case JobIdEnums.SEND_FORGOT_PASSWORD: {
      const mailerService = Container.get(MailerService);
      const { to, subject, template, variables } = job.data;

      console.log({ job, mailerService });
      return await mailerService.sendMail({ to, subject, template, variables });
    }

    default:
      throw new Error(`No handler found for job name: ${job.name}`);
  }
};
