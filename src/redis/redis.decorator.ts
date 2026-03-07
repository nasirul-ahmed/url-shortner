import Container, { ContainerInstance } from 'typedi';
import { createRedisClient } from './redis';

export function InjectRedis() {
  return function (object: any, propertyName: string, index: number) {
    Container.registerHandler({
      object,
      propertyName,
      index,
      value: (instance: ContainerInstance) => createRedisClient(),
    });
  };
}
