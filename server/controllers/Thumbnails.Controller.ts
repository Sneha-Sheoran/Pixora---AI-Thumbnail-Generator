import { Request,Response } from "express"
import Thumbnail from "../models/thumbnail";
import { GenerateContentConfig, HarmBlockThreshold, HarmCategory } from "@google/genai";
import ai from "../configs/ai";

import path from "path";
import fs from "fs";
import {v2 as cloudinary } from 'cloudinary';

// Hugging Face client setup will be inside the function

const stylePrompts={
    'Bold & Graphic': 'High contrast, dramatic composition, saturated colors, bold visual elements, strong lighting, YouTube thumbnail aesthetic.',
    'Tech/Futuristic': 'Futuristic thumbnail, sleek modern design, digital UI elements, glowing accents, holographic effects, cyber-tech aesthetic, sharp lighting, high-tech atmosphere.',
    'Minimalist': 'Clean composition, simple background, limited visual elements, elegant lighting, strong focal point, negative space.',
    'Photorealistic': 'Photorealistic, natural lighting, realistic materials, detailed environment, professional photography, cinematic depth of field.',
    'Illustrated': 'Detailed digital illustration, expressive shapes, polished artwork, visually clear subject, vibrant colors.',
    'Cinematic': 'Dramatic cinematic lighting, depth of field, realistic textures, atmospheric background, professional photography.',
    '3D': 'High-quality 3D render, polished materials, cinematic lighting, depth, modern visual design.'
}

const colorSchemeDescriptions = {
    vibrant: 'vibrant and energetic colors, high saturation, bold contrasts',
    sunset: 'warm sunset tones, orange pink and purple hues, soft gradients',
    forest: 'natural green tones, earthy colors, calm and organic palette',
    neon: 'neon glow effects, electric blues and pinks, cyberpunk lighting',
    purple: 'purple-dominant color palette, magenta and violet tones, modern and stylish mood',
    monochrome: 'black and white color scheme, high contrast, dramatic lighting',
    ocean: 'cool blue and teal tones, aquatic color palette',
    pastel: 'soft pastel colors, low saturation, gentle tones',
}

interface PromptOptions {
    title: string;
    additionalPrompt: string;
    style: string;
    colorScheme: string;
    aspectRatio: string;
}

export const buildThumbnailPrompt = async (options: PromptOptions): Promise<string> => {
    const { title, additionalPrompt, style, colorScheme, aspectRatio } = options;
    
    const styleInstruction = stylePrompts[style as keyof typeof stylePrompts] || stylePrompts['Bold & Graphic'];
    const colorInstruction = colorSchemeDescriptions[colorScheme as keyof typeof colorSchemeDescriptions] || '';
    
    const systemPrompt = `You are an expert visual designer generating a prompt for an AI image generator (FLUX).
Your task is to construct a strong, semantic image-generation prompt based on the user's title and preferences.

Follow this exact conceptual process:
1. Identify the topic from the TITLE.
2. Identify the primary subject.
3. Identify relevant environment, objects, actions, and visual metaphors.
4. Apply the ADDITIONAL PROMPT creatively, but the TITLE remains the PRIMARY SUBJECT.
5. Do NOT completely change the image into something unrelated if the additional prompt conflicts.
6. A human should NOT appear just because the title is entered. Only include people if the title naturally involves them OR the additional prompt explicitly requests them.
7. Output ONLY the final highly-descriptive visual prompt string that will be sent directly to the image generator. Do not include introductory text or the structural labels.

Construct the final image prompt following this semantic hierarchy:

PRIMARY TOPIC:
The thumbnail is about: "${title}"
Treat this as the PRIMARY SUBJECT and semantic meaning of the image.

VISUAL INTERPRETATION:
Create a visually understandable scene that communicates the title immediately.

ADDITIONAL CREATIVE DIRECTION:
${additionalPrompt ? `Apply this custom directive: "${additionalPrompt}"\nIf it conflicts with the title, prioritize the title but incorporate the request creatively without losing context. Modify composition, mood, lighting, objects, people, etc. as requested.` : 'No additional prompt provided. Do not add invented user preferences.'}

THUMBNAIL STYLE:
${styleInstruction}

COLOR DIRECTION:
${colorInstruction}

ASPECT RATIO:
${aspectRatio} (Format the composition to fit this aspect ratio)

COMPOSITION:
Create a professional YouTube-thumbnail composition.
Use a strong focal point, clear subject, cinematic lighting, high contrast, depth, and visual hierarchy.
Position the main visual subject on the RIGHT side.
Leave clear, uncluttered negative space on the LEFT side and bottom-left for a large text overlay.

TEXT & QUALITY:
CRITICAL: DO NOT generate any text, words, captions, or logos inside the image.
Avoid unrelated subjects, random portraits, watermarks, or distorted objects.
The final image must clearly represent the TITLE.

Final Image Prompt:`;

    const fallbackPrompt = `${title}. ${additionalPrompt ? additionalPrompt + '. ' : ''}Style: ${styleInstruction}. Color: ${colorInstruction}. Aspect Ratio: ${aspectRatio}. Composition: Main subject on right, negative space on left. No text, no words, no watermarks, cinematic lighting.`;

    try {
        const textResponse = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: systemPrompt
        });
        return textResponse.text?.trim() || fallbackPrompt;
    } catch (error) {
        console.error("Gemini API failed during prompt generation (e.g. 503 high demand). Using fallback prompt instead.", error);
        return fallbackPrompt;
    }
}

export const generateThumbnails = async(req:Request,res:Response)=>{
    try {
        const {userId}=req.session;
        const {title,prompt:user_prompt,style,aspect_ratio,color_schema,text_overlay}=req.body;

        const thumbnail= await Thumbnail.create({
            userId,
            title,
            prompt_used:user_prompt,
            user_prompt,
            style,
            aspect_ratio,
            color_schema,
            text_overlay, 
            isGenerating:true
        })

        const finalPrompt = await buildThumbnailPrompt({
            title,
            additionalPrompt: user_prompt,
            style,
            colorScheme: color_schema,
            aspectRatio: aspect_ratio
        });
        
        let width = 1280;
        let height = 720;
        if (aspect_ratio === '1:1') {
            width = 1024; height = 1024;
        } else if (aspect_ratio === '9:16') {
            width = 720; height = 1280;
        } else if (aspect_ratio === '4:3') {
            width = 1024; height = 768;
        }

        let base64Image: string | null = null;
        
        // Primary Generation: Hugging Face FLUX.1-schnell
        try {
            if (!process.env.HF_TOKEN) {
                console.warn("HF_TOKEN not found, skipping Hugging Face generation.");
                throw new Error("Missing HF_TOKEN");
            }
            
            const { HfInference } = await import("@huggingface/inference");
            const hf = new HfInference(process.env.HF_TOKEN);
            
            const hfResponse = await hf.textToImage({
                model: "black-forest-labs/FLUX.1-schnell",
                inputs: finalPrompt,
                parameters: {
                    width,
                    height,
                }
            });
            
            const arrayBuffer = await (hfResponse as any).arrayBuffer();
            base64Image = Buffer.from(arrayBuffer).toString('base64');
            
        } catch (hfError) {
            console.error("Hugging Face generation failed, falling back to Pollinations:", hfError);
            
            // Fallback: Pollinations
            const encodedPrompt = encodeURIComponent(finalPrompt);
            const randomSeed = Math.floor(Math.random() * 2147483647);
            const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${randomSeed}`;
            let retries = 3;
            let imageResponse;
            while (retries > 0) {
                try {
                    imageResponse = await fetch(imageUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                        }
                    });
                    if (imageResponse.ok) break;
                } catch (err) {
                    if (retries === 1) throw err;
                }
                retries--;
            }

            if (!imageResponse || !imageResponse.ok) {
                throw new Error('Failed to generate image from both HF and fallback. Please try again.');
            }

            const arrayBuffer = await imageResponse.arrayBuffer();
            base64Image = Buffer.from(arrayBuffer).toString('base64');
        }

        if (!base64Image) {
            throw new Error('Failed to generate image. Please try again.');
        }

        // Upload to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(`data:image/jpeg;base64,${base64Image}`, {
            folder: 'thumbnails'
        });

        thumbnail.image_url = uploadResult.secure_url;
        thumbnail.isGenerating= false;
        await thumbnail.save()

        res.json({message :'Thumbnail Generated', thumbnail})

    } catch (error:any) {
        console.error(error);
        res.status(500).json({message:error.message});
    }
}

export const deleteThumbnails = async(req:Request,res:Response)=>{
    try {
        const {id}= req.params;
        const {userId}=req.session;

        await Thumbnail.findByIdAndDelete({_id:id,userId})

        res.json({message:'Thumbnail deleted successfully'});

    } catch (error:any) {
        console.error(error)
        res.status(500).json({message:error.message})
    }
}