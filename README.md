# Van Fontanilla: portfolio and life updates

My personal website: a portfolio built from my resume, plus **Life Updates**, a photo blog (like Blogger or Tumblr) that I post to from a private admin dashboard.

- **Live site:** https://vanfontanilla.com
- **Admin dashboard:** https://vanfontanilla.com/admin/

| Page | What's on it |
| --- | --- |
| `/` | Home: photo, roles, skills, current role, status, latest life updates, what I do, interests |
| `/resume/` | Full resume with a PDF view/download button |
| `/contact/` | Email, location, resume and every social/contact link |
| `/updates/` | Life Updates feed with photo grids, captions, tags and a lightbox |
| `/updates/<post>/` | A single post with every photo and caption |
| `/feed.xml` | RSS/Atom feed so people can follow my updates |
| `/admin/` | The dashboard where I post and edit everything (only I can sign in) |

Hosting on GitHub Pages is free, there's no database or server to look after, and every post is saved in this repository's history.

---

## One-time setup (about 10 minutes)

### 1. Put the code on the `main` branch

The site publishes from `main`. On GitHub:

1. Go to **Code → Branches → New branch**. Name it `main` and create it from the branch that holds this code.
2. Go to **Settings → General → Default branch** and set it to `main`.

### 2. Turn on GitHub Pages

1. Go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Go to the **Actions** tab, open **Deploy site**, and click **Run workflow** (or push any change to `main`).

After about a minute the site is live. (It now uses the custom domain **vanfontanilla.com**; the old `vanflyhigh.github.io/vanflyhigh` address redirects there.)

### 3. Create your admin key (a GitHub access token)

The dashboard signs in with a GitHub token that can only edit this one repository. No one without write access to the repository can sign in.

1. Open **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**
   (direct link: https://github.com/settings/personal-access-tokens/new).
2. **Token name:** `website admin`. **Expiration:** choose what you like (up to 1 year).
3. **Repository access:** *Only select repositories* → `vanflyhigh/vanflyhigh`.
4. **Permissions → Repository permissions → Contents:** **Read and write**.
5. Click **Generate token** and copy it. GitHub shows it only once.

### 4. Sign in

Open **https://vanfontanilla.com/admin/**, click **Sign In Using Access Token**, and paste the token. Your browser remembers you.

> **On your phone:** once you're signed in on a computer, open your account menu (top right of the dashboard) and choose **Sign In with Mobile**, then scan the QR code with your phone. Or just paste the token on your phone.

Keep the token private, like a password. If it ever leaks, delete it on the GitHub token page and make a new one.

---

## Posting a life update

1. Open `/admin/` → **Life Updates** → **New Life Update**.
2. Give it a **Title**. The **Date** fills in automatically.
3. Under **Photos**, click **Add Photo** for each picture. Upload or drag it in, and write a **Caption**. Drag items to reorder; the first photo is the cover.
4. Optionally add **Videos & GIFs (links)**: upload a video to YouTube, Facebook, Instagram, TikTok or Vimeo, or a GIF to Imgur, GIPHY or Tenor, then paste its link. Videos play inside your post; GIFs play silently on a loop. (Don't upload video files to the site itself; they're too big.)
5. Optionally write a **Story** (the text editor supports bold, links, lists…) and add **Tags** like `travel` or `family`. Set **Story position** to *Before the photos* when your story is the introduction.
6. Click **Save**. The site updates in about a minute.

Good to know:

- **Phone photos are shrunk automatically.** Photos are resized to at most 2000 px and converted to WebP in your browser before upload, so the site stays fast.
- **Drafts:** turn on **Hide from site (draft)** to save a post without publishing it.
- **Edit or delete** any post from the same list. Changes go live the same way.
- A post can be photos only, text only, or both.

## Editing the rest of the site

In `/admin/` → **Status, Profile & Resume**:

- **Status, Profile Photo & Contacts**
  - **Status**: Open to opportunities, Busy, or On vacation, plus an optional note. *Busy* and *On vacation* hide the **Hire me** button (your resume stays in the menu).
  - **Job preference**: tick Full-time and/or Part-time; shown under your status while you're open to opportunities.
  - **Profile photo** and its position in the frame, name, job title, ribbon words, current-role description, location, email, phone.
  - **Contact & social links**: add Facebook, Facebook Page, Instagram, Steam, LinkedIn, TikTok, Discord and more. They appear on the **Contact** page; the first five with a link also show on the home page. Leave the link empty to show a username with a **Copy** button (handy for Discord).
  - **Resume PDF**: used by the **View / download PDF** button on the Resume page.
  - Highlight numbers, **What I do** cards, and **Interests** (pick an icon for each).
- **Resume**: jobs, responsibilities, education, certifications, skills, and languages.
- **Site Settings**: site title, the description shown on Google and in link previews, blog name, and intro.

> Your **phone number is hidden** on the site by default. Add it under **Phone** if you want it shown. The resume PDF includes it, so upload a copy without it if you'd rather keep it private.

---

## For developers

The site is built with [Eleventy](https://www.11ty.dev/) and the dashboard is [Sveltia CMS](https://github.com/sveltia/sveltia-cms), a Git-based CMS: every save is a commit to this repository, and `.github/workflows/deploy.yml` rebuilds and publishes the site.

```bash
npm install
npm start        # local preview at http://localhost:8080 (drafts are shown here)
npm run build    # production build into _site/
```

```
src/
  _data/profile.json     profile, contact, home page content   (edited in the CMS)
  _data/resume.json      experience, education, skills         (edited in the CMS)
  _data/site.json        site title/description, blog name     (edited in the CMS)
  updates/*.md           life update posts                     (created in the CMS)
  images/uploads/        photos uploaded from the CMS
  admin/config.yml       dashboard fields and settings
  _includes/             page layouts and partials
  assets/css, assets/js  styles, theme toggle, lightbox
```

**Custom domain:** add it under **Settings → Pages**, then change `site_url` and `logo.src` in `src/admin/config.yml`. The build reads the Pages URL automatically, so links keep working.
