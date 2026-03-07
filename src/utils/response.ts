// import { FastifyReply } from 'fastify';
// import { ErrorCode } from '../errors/AppError';
// import { IApiResponse } from "../interfaces"

// /**
//  * Standardized API response helpers.
//  * All responses follow the { status, message, data/error } envelope.
//  */
// export function sendSuccess<T>(reply: FastifyReply, data: T, message = 'success', httpStatus = 200): void {
//   const response: IApiResponse<T> = {
//     status: ErrorCode.SUCCESS,
//     message,
//     data,
//   };
//   reply.code(httpStatus).send(response);
// }

// export function sendError(
//   reply: FastifyReply,
//   errorCode: ErrorCode,
//   message: string,
//   httpStatus: number,
//   error?: unknown,
// ): void {
//   const response: IApiResponse = {
//     status: errorCode,
//     message,
//     error: error || {},
//   };
//   reply.code(httpStatus).send(response);
// }

// export function sendCreated<T>(reply: FastifyReply, data: T): void {
//   sendSuccess(reply, data, 'created', 201);
// }
