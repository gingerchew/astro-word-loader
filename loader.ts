import mammoth from 'mammoth';
import sizeOf from 'image-size';
import { unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type Loader } from 'astro/loaders';
import * as jsdom from 'jsdom';
import { getImage } from 'astro/assets';
import { glob } from 'node:fs';

const { JSDOM } = jsdom;

type ImageConfig = Parameters<typeof getImage>[1];

interface Options {
    sources: string|string[];
    styleMap?: string|string[];
    imgConfig?: ImageConfig;
    transformOptions?: Record<string, unknown>
}

function getId(str:string):string {
    const strParts = str.split('/');
    const fileName = strParts.at(-1);
    const [ id ] = fileName!.split('.');

    return id;
}

async function parseImages(id: string, html:string, transform: Options['transformOptions'], options: ImageConfig): Promise<[string, string[]]> {
    const dom = new JSDOM(html, { resources: 'usable' });
    const images = dom.window.document.querySelectorAll('img');
    
    const imagePaths = await Promise.all(Array.from(images).map(async (img, i) => {
        const matches = img.src.match(/^data:(.+);base64,(.+)$/)
        if (!matches) {
            throw new Error('Invalid Data URI');
        }

        const [,contentType, data] = matches;

        const binary = Buffer.from(data, 'base64');
        const  outputFilePath = join(import.meta.dirname, 'public', `${id}_${i}.${contentType.split('/')[1]}`);
        await writeFile(outputFilePath, binary);
        const dimensions:Record<string, number> = {};
        await new Promise<void>(res => {
            sizeOf(outputFilePath, (err, dims) => {
                if (err) throw err;

                dimensions.height = dims!.height!;
                dimensions.width = dims!.width!;
                res();
            })
        })
        const tmp = await getImage({ src: outputFilePath, ...transform, ...dimensions }, options);
        
        img.src = tmp.src.replace(`${import.meta.dirname}/public`, '');
        img.height = tmp.attributes.height;
        img.width = tmp.attributes.width;
        if (tmp.srcSet.attribute.length > 0) img.srcset = tmp.srcSet.attribute.replaceAll(new RegExp(`${import.meta.dirname}/public`, 'g'), '');
        if ('loading' in tmp.attributes) img.setAttribute('loading', tmp.attributes.loading);
        if ('decoding' in tmp.attributes) img.setAttribute('decoding', tmp.attributes.decoding);
        img.alt = tmp.attributes.alt ?? '';
        return outputFilePath;
    }))
    
    return [dom.window.document.documentElement.outerHTML, imagePaths];
}

const defaultImageOptions = {
    endpoint: {
        route: ''
    },
    service: {
        entrypoint: '',
        config: {}
    },
    domains: [],
    remotePatterns: [],
    experimentalResponsiveImages: false
} satisfies ImageConfig

export default function docxLoader(options: Options):Loader {
    options.imgConfig = options.imgConfig ?? defaultImageOptions satisfies ImageConfig;
    options.transformOptions = options.transformOptions ?? {}
    return {
        name: 'docx-loader',
        async load({ store, generateDigest, logger }) {
            const sources = Array.isArray(options.sources) ? options.sources : [options.sources];
            const promises = sources.map(source => {
                return new Promise<void>(res => {
                    glob(source, async (err, matches) => {
                        if (err) {
                            logger.error(err.message);
                            return;
                        }
                        for await (const match of matches) {
                            const { value, messages } = await mammoth.convertToHtml({ path: match }, { styleMap: options.styleMap });
                            if (messages.length) {
                                messages.forEach((msg) => {
                                    logger.info(msg.message)
                                });
                            }
                            const id = getId(match);
                            const [parsedValue, imagePaths] = await parseImages(id, value, options.transformOptions, options.imgConfig!);
                            const data = {
                                match,
                                id
                            };
                            const digest = generateDigest({
                                id,
                                rendered: { 
                                    html: parsedValue,
                                    metadata: {
                                        imagePaths
                                    }
                                },
                                data
                            });
                            store.set({
                                rendered: { html: parsedValue },
                                id,
                                digest,
                                data
                            })
                        }
                        res();
                    })
                })
            })

            await Promise.all(promises);
        }
    }
}
