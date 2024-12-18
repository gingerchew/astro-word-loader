import mammoth from 'mammoth';
import { type Loader } from 'astro/loaders';
import { glob } from 'node:fs';

interface Options {
    sources: string|string[];
    styleMap?: string|string[]
}

function getId(str:string):string {
    const strParts = str.split('/');
    const fileName = strParts.at(-1);
    const [ id ] = fileName!.split('.');

    return id;
}

export default function docxLoader(options: Options):Loader {

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
                            const data = {
                                match,
                                id
                            };
                            const digest = generateDigest({
                                id,
                                rendered: { html: value },
                                data
                            });
                            store.set({
                                rendered: { html: value },
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
