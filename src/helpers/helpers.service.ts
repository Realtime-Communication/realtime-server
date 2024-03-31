import { Injectable } from '@nestjs/common';
const bcrypt = require('bcryptjs');

@Injectable()
export class HelpersService {

  constructor() {}

  responeSuccess (message: string = "", response = {}) {
    const result = {
      statusCode: 200,
      message: message
    }
    response[0] && (result["data"] = response);
    return result;
  }

  responseError (message: string = "") {
    const result = {
      statusCode: 400,
      message: message
    }
    return result;
  }

  async hashingPassword (password: string) {
    const saltOrRounds: number = 10;
    const hash = await bcrypt.hash(password, saltOrRounds);
    console.log(hash);
    return hash;
  }

  async decodePassword (inputPassword: string, userPassword: string) {
    const isMatch = await bcrypt.compareSync(inputPassword, userPassword);
    return await isMatch;
  }

}
