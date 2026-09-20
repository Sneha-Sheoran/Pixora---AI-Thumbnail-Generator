import mongoose, { mongo } from "mongoose";


export interface Iuser extends Document{
    name: string;
    email: string;
    password?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const UserSchema = new mongoose.Schema<Iuser>({
    name:{type:String,required:true,trim:true},
    email:{type:String,required:true,trim:true,unique:true, lowercase:true},
    password:{type:String ,required:true,}

},{timestamps:true})

const User=mongoose.models.user || mongoose.model<Iuser>('User',UserSchema)



export default User;