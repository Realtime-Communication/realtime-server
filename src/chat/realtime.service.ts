import { Inject, Injectable, Scope } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import mongoose, { Model } from "mongoose";
import { HelpersService } from "src/helpers/helpers.service";
import { Chat } from "./schemas/chat.shema";
import { UsersService } from '../users/users.service';
import { User } from "src/users/schemas/user.schema";
import { IUser } from "src/users/user.interface";
import { GroupsService } from './../groups/groups.service';
import { ResponseMessage } from "src/decorators/responseMessage.decorator";


@Injectable()
export class ChatService {
    private userId: string;
    private username: string;
    constructor(
        @InjectModel(Chat.name)
        private chatModel: Model<Chat>,
        @InjectModel(User.name)
        private userModel: Model<User>,
        private readonly helpersService: HelpersService,
        private readonly usersService: UsersService,
        private readonly groupsService: GroupsService
    ){
    }

    setUser(user_id: string, username: string) {
        this.userId = user_id;
        this.username = username;
    }

    async saveMessage(payload: any) {
        try {
            const chat = payload;
            const message = new this.chatModel(chat);
            await message.save();
            return message._id;
        } catch (error) {
            this.helpersService.responseError("Cannot save message");
        }
    }

    async getMyChats(user_id: string) {
        try {
            const chats = await this.chatModel.find({
                $or: [
                    { from_id: user_id },
                    { to_id: user_id}
                ],
                deleted: false
            }).sort({ createdAt: "asc"});
            return chats;
        } catch (error) {
            return this.helpersService.responseError(`cannot find chat of user ${user_id}`);
        }
    }

    async conversations(user: IUser) {
        try {
            const friends = await this.usersService.friends(user);
            const groups = await this.groupsService.myGroups(user);
            const result = [...[friends], ...[groups]];
            return result;
        } catch (error) {
            return this.helpersService.responseError('cannot get all friend at chat service');
        }
    }

    @ResponseMessage('Get chat with friend or group')
    async getChatWithId(to_id: string, limit: number, userId: mongoose.Schema.Types.ObjectId) {
        try {
            const otherPerson = await this.usersService.findOne(to_id);
            const group = await this.groupsService.findOne(to_id);
            const chats = otherPerson 
            ? await this.chatModel.find({
                    $or: [
                        { $and: [ {from_id: to_id}, {to_id: userId} ] },
                        { $and: [ {from_id: userId}, {to_id: to_id} ] }
                    ],
                    deleted: false
                }).sort({ createdAt: "desc"}).limit(limit).then(data => data.reverse())
            : await this.chatModel.find({
                    to_id: to_id,
                    deleted: false
                }).sort({ createdAt: "desc"}).limit(limit).then(data => data.reverse())
            return {
                chats,
                otherName: otherPerson ? otherPerson['name'] : group['name'],
                otherImage: otherPerson ? otherPerson['image'] : group['image'],
            };
        } catch (error) {
            return error;
        }
    }

    async getChatGlobal(userId: any) {
        try {
            return [];
        } catch (error) {
            return this.helpersService.responseError("cannot get chat global before !");
        }
    }

    async getLastChats(user: IUser){
        try {
            const userId = user._id;
            const myGroups = await this.groupsService.idsMyGroups(user);
            const groupIds = myGroups.map((item: any) => item._id)
            const friendIds = await this.userModel.distinct('_id');
            const ids = [[...friendIds], [...groupIds]];
            const resultId = [];
            const resultObj = [];
            for(const key in ids) {
                for(const id of ids[key]) {
                    const [lastRecord] = await this.chatModel.find({
                        $or: (key == '0' ? [ { from_id: userId, to_id: id }, { from_id: id, to_id: userId } ] : [{ to_id: id }]) ,
                        deleted: false
                    }).sort({createdAt: 'desc'}).limit(1).select('from_id content from msgTime');
                    resultId.push(id);
                    resultObj.push(lastRecord);
                }
            }
            return [resultId, resultObj];
        } catch (error) {
            this.helpersService.responseError('cannot get last chat of another friends !');
        }
    }

    async deleteChat(id: string) {
        try {
            return await this.chatModel.updateOne({ _id: id }, { $set: { deleted: true } });
        } catch (error) {
            console.log('delete msg error')
            return this.helpersService.responseError('cannot delete message');
        }
    }
}