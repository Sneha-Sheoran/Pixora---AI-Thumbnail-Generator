import express from 'express';
import { deleteThumbnails, generateThumbnails } from '../controllers/Thumbnails.Controller';
import protect from '../middleware/auth';

const ThumbnailRouter=express.Router();

ThumbnailRouter.post('/generate',protect,generateThumbnails);
ThumbnailRouter.delete('/delete/:id',protect,deleteThumbnails);

export default ThumbnailRouter;