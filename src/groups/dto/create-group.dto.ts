import mongoose from "mongoose";

export class CreateGroupDto {
    name: string;
    leader: mongoose.Schema.Types.ObjectId;
    members: mongoose.Schema.Types.ObjectId[];
    image?: string;
}
