import express from 'express';
import { getThumbnailById, getUsersThumbnails } from '../controllers/UserControllers';
import protect from '../middleware/auth';

const UserRouter = express.Router(); 

UserRouter.get('/thumbnails',protect, getUsersThumbnails);
UserRouter.get('/thumbnail/:id',protect,getThumbnailById);

export default UserRouter;