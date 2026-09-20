
console.log('Starting server.ts script...');
import type { Request, Response } from 'express';
const express = require('express');
const cors = require("cors");
import 'dotenv/config';
import connectDB from './configs/db';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import AuthRouter from './routes/AuthRoutes';
import ThumbnailRouter from './routes/ThumbnailRoutes';
import UserRouter from './routes/UserRoutes';


declare module 'express-session'{
    interface SessionData{
        isLoggedIn:boolean;
        userId:string
    }
}


// Wrap server startup in an async function to avoid top-level await in CommonJS
(async function main() {
    await connectDB();

    const app = express();


    const corsOptions = {
        origin: true,
        credentials: true
    };
    app.use(cors(corsOptions));
    
    app.use((req: any, res: any, next: any) => {
        console.log(`[REQUEST] ${req.method} ${req.url} from origin: ${req.headers.origin}`);
        next();
    });

    app.set("trust proxy", 1);

    app.use(session({
        secret:process.env.SESSION_SECRET as string,
        resave:false,
        saveUninitialized:false,
        cookie:{maxAge:1000*60*60*24*7,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite:'none',
            path:'/'
        },  
        store: MongoStore.create({
            mongoUrl: process.env.MONGODB_URL as string,
            collectionName:'sessions' 
        })
    }))
    app.use(express.json());
    
    // Serve images locally
    const path = require('path');
    app.use('/images', express.static(path.join(__dirname, 'images')));

    app.get('/', (req: Request, res: Response) => {
        res.send('Server is Live!');
    });

    app.use('/api/auth',AuthRouter);
    app.use('/api/thumbnail',ThumbnailRouter);
    app.use('/api/user',UserRouter);

    const port = process.env.PORT || 3000;

    app.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}`);
    });
})();