import mongoose from "mongoose";

export interface IUser {
    email: string;
    password: string;
    _id: BinaryType;
    name: string;
    image: string;
}
