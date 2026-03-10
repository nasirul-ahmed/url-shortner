import { createRedisClient } from "../redis";
import { Queue } from "bullmq";

export default () => {
    return new Queue('us-queue'), {
        connection: createRedisClient()
    }
};