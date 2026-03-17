import { createRedisClient } from "../redis";
import { Queue } from "bullmq";

export default () => {
    return new Queue('url-shortener-queue', {
        connection: createRedisClient() as any,
    });
};