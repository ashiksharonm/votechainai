# Free Full-Stack Deployment Guide (Vercel + Neon)

Since Heroku and Render can have paid tiers, **Vercel** is the best option. It is free and supports both your React Frontend AND Python Backend in one place!

## Prerequisites
1.  **Vercel Account**: [Sign up at vercel.com](https://vercel.com/) (Login with GitHub).
2.  **Neon Account**: [Sign up at neon.tech](https://neon.tech/) (for the Database).

---

## Step 1: Create Free Database (Neon)
1.  Log in to **Neon Console**.
2.  Click **Create Project**.
3.  Name it `votechain-db`.
4.  Copy the **Connection String** (`postgres://...`).
    *   **Keep this safe!**

---

## Step 2: Deploy to Vercel
1.  Go to **Vercel Dashboard**.
2.  Click **Add New...** -> **Project**.
3.  Import your `votechainai` repository.

### Configure Project
Vercel will auto-detect settings. We have standardized the structure for Python:
- `api/index.py` is the entry point.
- `requirements.txt` is in the root.

1.  **Framework Preset**: Vite (should be auto-detected).
2.  **Environment Variables**: Expand the section and add:

| Key | Value |
| --- | --- |
| `DATABASE_URL` | (Your Neon Connection String) |
| `SECRET_KEY` | (Random string e.g. `xyz123`) |
| `ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` |
| `VITE_API_URL` | `/api/v1` |

**Note**: We use `/api/v1` (relative path) because the backend runs on the same Vercel deployment.

3.  Click **Deploy**.

---

## Step 3: Verify
Vercel will build your site.
*   **Result**: You get a single URL (e.g., `https://votechainai.vercel.app`).
*   **Frontend**: Loads automatically.
*   **Backend**: Accessible at `https://votechainai.vercel.app/api/v1/...`

🎉 **Done!** Your app is 100% Free and Live.

---

## "Totally Free" Alternative: Hugging Face Spaces

Your project is now **Hugging Face Ready**. It includes a `Dockerfile` that builds the React Frontend and Python Backend into a single running application.

### Setup Guide
1.  **Create Space**:
    *   Go to [huggingface.co/spaces](https://huggingface.co/spaces) -> **Create new Space**.
    *   Name: `votechain-ai` (or similar).
    *   SDK: **Docker** (Crucial!).
    *   Hardware: **Free** (CPU basic · 2 vCPU · 16GB RAM).

2.  **Connect Code**:
    *   You can clone your repo into the space OR use "Sync with GitHub". 
    *   Since I'm pushing the code now, "Sync with GitHub" is easiest if you push to your main repo.

3.  **Configure Secrets** (Settings -> Variables and Secrets):
    *   `DATABASE_URL`: Your Neon Connection String.
    *   `SECRET_KEY`: Random string.
    *   `ALGORITHM`: `HS256`
    *   `ACCESS_TOKEN_EXPIRE_MINUTES`: `30`
    *   **Note**: You DO NOT need `VITE_API_URL` because the Docker build defaults it to `/api/v1` internally.

4.  **Launch**:
    *   The space will build (takes ~3-5 mins).
    *   Once "Running", your app is live at `https://huggingface.co/spaces/YOUR_USER/votechain-ai`!

### Other Alternatives
*   **Render**: Free tier sleeps after 15 mins.
*   **Railway**: Trial credits, then paid.
*   **Fly.io**: Requires credit card for signup, generous free tier.
*   **Google Cloud**: Free "e2-micro" instance (complex setup).

**Recommendation**: Stick with **Vercel** (Step 2 above) as it is the easiest and most integrated for this project structure.
