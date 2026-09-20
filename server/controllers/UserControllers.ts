import { Request,Response } from "express";
import Thumbnail from "../models/thumbnail";

// controllers to get all user thumbnails
export const getUsersThumbnails= async (req:Request, res:Response)=>{
    try {
        
        const {userId}= req.session;
        const thumbnails = await Thumbnail.find({userId}).sort({createdAt:-1})
        res.json({thumbnails})

    } catch (error:any) {
        console.log(error)
        res.status(500).json({message:error.message})
        
    }
}

// controller to get a single thumbnail of a user 
export const getThumbnailById = async(req:Request,res:Response)=>{
    try {
        const {userId}= req.session;
        const {id}= req.params;

        const thumbnail = await Thumbnail.findOne({userId,_id:id});
        res.json({thumbnail});

    } catch (error:any) {
        console.log(error)
        res.status(500).json({message:error.message})
    }
}