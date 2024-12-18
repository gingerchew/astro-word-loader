import { defineCollection } from 'astro:content';
import docxLoader from "../loader";

const wordDocs = defineCollection({
    loader: docxLoader({
        sources: './src/content/word/*.docx',
        styleMap: 'p.Heading1 => h1:fresh',
        transformOptions: {
            format: 'avif'
        }
    })
})

export const collections = {
    wordDocs
}