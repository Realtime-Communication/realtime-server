import { Injectable } from '@nestjs/common';
const bcrypt = require('bcryptjs');

export class SecutiryUtils {
  private static readonly SALT_OR_ROUNDS: number = 10;

  static responeSuccess(message: string = '', response = {}) {
    const result = {
      statusCode: 200,
      message: message,
    };
    response[0] && (result['data'] = response);
    return result;
  }

  static responseError(message: string = '') {
    const result = {
      statusCode: 400,
      message: message,
    };
    return result;
  }

  static async hashingPassword(password: string) {
    return await bcrypt.hash(password, this.SALT_OR_ROUNDS);
  }

  static decodePassword(inputPassword: string, userPassword: string) {
    return bcrypt.compareSync(inputPassword, userPassword);
  }
}
