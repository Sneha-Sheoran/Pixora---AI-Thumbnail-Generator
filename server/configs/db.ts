import mongoose from 'mongoose';

const connectDB = async ()=>{
    try {
        console.log('Connecting to MongoDB...');
        mongoose.connection.on('connected',()=>console.log('MongoDB connected'))
        await mongoose.connect(process.env.MONGODB_URL as string, { serverSelectionTimeoutMS: 5000 })
    } catch (error) {
        console.error('Error connecting to MongoDB: ' , error)
        
    }
}

export default connectDB;