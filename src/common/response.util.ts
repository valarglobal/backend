import { ResponseDto } from "./dto/response.dto";

export class ResponseUtil {
  static success<T>(statusCode: number, message: string, data?: T): ResponseDto<T> {
    return new ResponseDto(statusCode, message, data);
  }

  static error(statusCode: number, message: string): ResponseDto<null> {
    return new ResponseDto(statusCode, message, null);
  }
}
