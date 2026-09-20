import { createContext, useContext, useEffect, useState } from "react";
import type { IUser } from "../assets/assets";
import api from "../configs/api";
import toast from "react-hot-toast";

interface AuthContextProps{
    isLoggedIn:boolean;
    setIsLoggedIn:(isLoggedIn:boolean)=> void;
    user:IUser | null;
    setUser: (user:IUser | null)=> void;
    login:(user:{email:string;password:string})=> Promise<void>;
    signup:(user:{name:string;email:string;password:string})=> Promise<void>;
    logout: () => Promise<void>;
}


const AuthContext= createContext<AuthContextProps>({
    isLoggedIn:false,
    setIsLoggedIn:()=>{},
    user:null,
    setUser:()=>{},
    login: async () => {},
    signup: async () => {},
    logout:async () => {},
})

export const AuthProvider=({children}:{children:React.ReactNode})=>{

    const [user,setUser]= useState<IUser | null>(null)
    const [isLoggedIn,setIsLoggedIn]= useState<boolean>(false)

    const signup = async ({name,email,password}:{name:string; email:string;password:string})=>{
        try {
            const {data} = await api.post('/api/auth/register',{name,email,password})
            if(data.user){
                setUser(data.user as IUser)
                setIsLoggedIn(true)
            }
            toast.success(data.message || 'Account created successfully')
        } catch (error: any) {
            console.log(error);
            const errMsg = error?.response?.data?.message || error.message || 'Signup failed';
            toast.error(errMsg);
        }

    }

    const login= async ({email,password}:{email:string;password:string})=>{
        try {
            const {data} = await api.post('/api/auth/login',{email,password})
            if(data.user){
                setUser(data.user as IUser)
                setIsLoggedIn(true)
            }
            toast.success(data.message || 'Login Successful')
        } catch (error: any) {
            console.log(error);
            const errMsg = error?.response?.data?.message || error.message || 'Login failed';
            toast.error(errMsg);
        }

    }

    const logout = async ()=>{
        try {
            const {data} = await api.post('/api/auth/logout')
            
            setUser(null)
            setIsLoggedIn(false)
            
            toast.success(data.message || 'Logout successful')
        } catch (error: any) {
            console.log(error);
            const errMsg = error?.response?.data?.message || error.message || 'Logout failed';
            toast.error(errMsg);
        }

    }

    const fetchUser = async ()=>{
        try {
            const {data} = await api.get('/api/auth/verify')
            if(data.user){
                setUser(data.user as IUser)
                setIsLoggedIn(true)
             }
        } catch (error) {
            console.log(error);
        }

    }

    useEffect(()=>{
        (async ()=>{
            await fetchUser();
        })();
    },[])

    const value={
        user,setUser,isLoggedIn,setIsLoggedIn , signup,login,logout,fetchUser
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export const UseAuth=()=> useContext(AuthContext);
