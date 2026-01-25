# Free Backend Deployment Guide (Render + Neon)

Since Heroku is no longer free, we will use **Render** (for the server) and **Neon** (for the database). Both represent the best free-tier options available today.

## Prerequisites
1.  **GitHub Account**: You already have this.
2.  **Render Account**: [Sign up at render.com](https://render.com/).
3.  **Neon Account**: [Sign up at neon.tech](https://neon.tech/) (for the database).

---

## Step 1: Create Free Database (Neon)
Since Render's free database expires after 30 days, Neon is better (persistent free tier).

1.  Log in to **Neon Console**.
2.  Click **Create Project**.
3.  Name it `votechain-db`.
4.  Copy the **Connection String** (Postgres URL) shown in the dashboard.
    *   It looks like: `postgres://user:pass@ep-xyz.us-east-2.aws.neon.tech/neondb...`
    *   **Keep this safe!**

---

## Step 2: Deploy Backend to Render
1.  Log in to **Render Dashboard**.
2.  Click **New +** -> **Web Service**.
3.  Select **"Build and deploy from a Git repository"**.
4.  Connect your `votechainai` repository.

### Configuration
Fill in these details exactly:

*   **Name**: `votechain-backend` (or unique name)
*   **Region**: Closest to you (e.g., Singapore/Oregon)
*   **Branch**: `main`
*   **Root Directory**: `backend`  <-- **CRITICAL**
*   **Runtime**: `Python 3`
*   **Build Command**: `pip install -r requirements.txt`
*   **Start Command**: `gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`
*   **Instance Type**: `Free`

### Environment Variables
Scroll down to **"Advanced"** or **"Environment Variables"** and add these:

| Key | Value |
| --- | --- |
| `DATABASE_URL` | (Paste your Neon Connection String from Step 1) |
| `SECRET_KEY` | (Generate a random string, e.g. `mysecret123`) |
| `ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` |
| `PYTHON_VERSION` | `3.12.3` |

Click **Create Web Service**.

---

## Step 3: Wait for Build
Render will clone your repo, install Python dependencies, and start the server.
*   This takes about 5-10 minutes.
*   Watch the logs. You want to see "Uvicorn running on http://0.0.0.0:10000".

## Step 4: Get Backend URL
Once live, Render gives you a URL at the top left (e.g., `https://votechain-backend.onrender.com`).
**Copy this URL.**

---

## Step 5: Connect Frontend to Backend (GitHub Pages)
Now tell your live Frontend where the Backend lives.

1.  Go to your **GitHub Repository** -> **Settings** -> **Secrets and variables** -> **Actions**.
2.  Update (or Create) the secret `VITE_API_URL`.
3.  Value: `https://votechain-backend.onrender.com/api/v1` (Don't forget `/api/v1`!)
4.  **Re-deploy Frontend**:
    *   Go to **Actions** tab.
    *   Select "Deploy Frontend".
    *   Click "Run workflow".

🎉 **Done!** Your app is 100% Free and Live.
