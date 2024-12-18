# `astro-word-loader`

Take a glob of word files and convert them to an Astro collection.

> [!IMPORTANT]  
> This is a beta release, there are still several things that are nice about Astro that can't be used here.
> [See the Special Notes section to learn more](https://github.com/gingerchew/astro-word-loader#special-notes)

## How to use:

```ts
import { defineCollection } from 'astro:content';
import wordLoader from 'astro-word-loader';

const wordDocs = defineCollection({
    loader: wordLoader({
        sources: ['./my-word/docs/*.docx'], // file paths are run through node:glob
        styleMap: ['p[style-name="Section Title"] => h1:fresh']
    })
})
```

`styleMap` is the options passed to `mammoth`, to learn more about how `styleMap` works, check out [the documentation here](https://github.com/mwilliamson/mammoth.js#writing-style-maps).

## Special Notes

Each entry is given an id based on the file name, so if there are multiple word documents with the same file name, there will be conflict.

E.g. `sample-docx-files-sample2.docx` is retrievable with `getEntry` by using the id `sample-docx-files-sample2`.

Since mammoth only supports converting the word document into HTML, Astro's `render` function will not work as expected. For now, you can use `set:html` directive to see the result.

```astro
---
import { getEntry } from 'astro:content';

const entry = await getEntry('my-collection', 'my-file');
---
<div set:html={entry.data.content}></div>
```

I'd like to get that working before a final release is done.

## TODO

- [ ] Images
    - Currently images in word docs seem to be converted to a data-uri
    - Add in loading and decoding attributes
    - Sizing with Astro's `<Image />` component?
    - Other performance enhancements
    - Currently (12/18/24) sample4 takes too long to load for pagespeed to generate recommendations
- [ ] Better style map interface
- [ ] Performance testing?

## Thanks

- Mammoth and [Mammoth.js](https://github.com/mwilliamson/mammoth.js) specifically for powering this loader