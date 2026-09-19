# 🔄 The Complete DevOps Flow (How Everything Works)

This document explains the entire lifecycle of your application code—from the moment you type `git push` on your laptop, to the moment a user accesses the website in their browser.

## The Journey of Code: Step-by-Step

### 1. 💻 The Developer (You)
You write code in VS Code. When you are finished with a feature or bug fix, you commit your code and push it to the `local-devops` branch on GitHub.
*   **Command:** `git add . && git commit -m "fix: updated css" && git push`

### 2. 🤖 Continuous Integration (GitHub Actions)
The moment your code hits GitHub, an automated robot (GitHub Actions) wakes up. 
*   **What it does:** It looks at the `.github/workflows/ci-cd.yml` file. It automatically compiles your React code and Node.js code, packages them into lightweight, isolated Linux environments called **Docker Images**.
*   **Secrets:** During this build process, it securely injects your Google Client IDs and API URLs so they are baked into the frontend.

### 3. 📦 The Container Registry (Docker Hub)
Once GitHub Actions finishes building the Docker Images, it pushes them to a public registry (Docker Hub) under your account (`toshal/xerox-frontend` and `toshal/xerox-backend`). 
*   **Tagging:** It tags the images with the unique Git commit hash (e.g., `v-a1b2c3d`) so every version is uniquely identifiable.
*   It then automatically updates the `k8s/frontend.yaml` and `k8s/backend.yaml` files in your GitHub repository with the new image tags.

### 4. 🐙 Continuous Deployment (ArgoCD & GitOps)
Meanwhile, inside your local Kubernetes cluster, **ArgoCD** is constantly watching your GitHub repository.
*   **The GitOps Magic:** As soon as GitHub Actions updates the image tags in the `k8s/` folder, ArgoCD detects a "drift" between what is in Git and what is actually running in Kubernetes.
*   **The Sync:** ArgoCD automatically tells Kubernetes: *"Hey, Git has a new version! Download the new Docker image and gracefully swap out the old containers for the new ones."* 
*   **Zero Downtime:** Kubernetes starts the new containers *before* killing the old ones, meaning users never see the website go down during an update.

### 5. 🌐 Traffic Routing (NGINX Ingress)
Now the new code is running, but how do users reach it?
*   A user opens their browser and types `http://localhost`.
*   The request hits the **NGINX Ingress Controller** (the API Gateway of your cluster).
*   **The Rules:** If the user goes to `http://localhost/api/...`, Ingress forwards the traffic to the Node.js Backend. If they go to `http://localhost/`, it forwards them to the React Frontend.

### 6. 📈 Autoscaling & Self-Healing (The Safety Net)
*   **Horizontal Pod Autoscaler (HPA):** If 1,000 students suddenly try to print documents at the same time, the `metrics-server` notices your backend CPU spiking over 75%. The HPA automatically clones your backend from 1 container up to 5 containers to handle the load. When the students leave, it scales back down to 1.
*   **Self-Healing:** If your Node.js backend crashes due to a coding error, the Kubernetes Liveness Probe detects that the app is dead and instantly restarts the container before anyone notices.
