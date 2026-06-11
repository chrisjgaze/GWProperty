# GWProperty

Static Astro property listings deployed on Netlify.

## Property Admin

The `/admin/` dashboard links to the Decap CMS custom-property editor and the read-only existing
feed browser. Custom properties are stored separately from the
source feed in `public/custom-properties.json`; the listings app merges both files in the browser.
The admin's **View existing properties** link opens a searchable, read-only browser for
`public/properties.json`.

The admin uses the GitHub backend and commits changes to `main`, which triggers a Netlify rebuild.
Before using it in production, configure GitHub authentication for the Netlify site:

1. In GitHub, create an OAuth app with authorization callback URL
   `https://api.netlify.com/auth/done`.
2. In Netlify, open **Project configuration > Access & security > OAuth**, install the GitHub
   provider, and enter the OAuth client ID and secret.
3. Open `https://YOUR-SITE.netlify.app/admin/` and sign in with a GitHub account that has push
   access to the repository.

Uploaded images are committed to `public/uploads/`. Keep uploads reasonably small because they are
stored in the Git repository and shipped with every deploy.

## Development

```sh
npm create astro@latest -- --template basics
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src
│   ├── assets
│   │   └── astro.svg
│   ├── components
│   │   └── Welcome.astro
│   ├── layouts
│   │   └── Layout.astro
│   └── pages
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
