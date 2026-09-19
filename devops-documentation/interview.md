# XeroxSaaS DevOps & Kubernetes - Interview Preparation Guide

This document is designed to help you prepare for technical interviews by detailing the entire Local DevOps architecture, methodologies, and common interview questions related to the infrastructure built for the **XeroxSaaS** project.

## 🏗️ Architecture Overview

For the DevOps portion of this project, you designed and implemented a **production-grade, local Kubernetes environment**. Instead of paying for expensive cloud clusters (like AWS EKS or GCP GKE) during development, you utilized **KinD (Kubernetes in Docker)** to simulate a real-world enterprise infrastructure entirely on your local machine.

### Key Components:
1. **Kubernetes Cluster (KinD):** Orchestrates all microservices. Simulates a multi-node cloud environment locally.
2. **NGINX Ingress Controller:** Acts as the API Gateway. It intelligently routes incoming traffic (`/api` goes to the Express backend, `/` goes to the React frontend) and strips URL paths (URL Rewriting) to ensure the backend receives clean requests.
3. **ArgoCD (GitOps):** The core of the continuous deployment strategy. ArgoCD continuously monitors the `local-devops` Git branch. Whenever a change is detected (like a new Docker image tag), ArgoCD automatically synchronizes the Kubernetes cluster to match the Git repository state.
4. **GitHub Actions (CI/CD):** Handles Continuous Integration. On every push to the `local-devops` branch, GitHub Actions builds new Docker images for the frontend and backend, injects necessary build arguments (like Google Client IDs), and pushes the images to Docker Hub. It then updates the Kubernetes manifest files with the new image tags.
5. **Horizontal Pod Autoscaling (HPA):** Ensures the application stays highly available. By monitoring CPU utilization, HPA dynamically scales the frontend and backend pods from 1 up to 5 replicas if CPU usage crosses 75%.
6. **Stateful Services:** MongoDB (Database), Redis (Caching/PubSub), and MinIO (S3-compatible Object Storage) run inside the cluster using Persistent Volume Claims (PVCs) to ensure data isn't lost if a pod restarts.

---

## 🎯 How to Showcase This on Your Resume

Add a dedicated bullet point or section under the **XeroxSaaS Project** in your resume. Here are a few strong ways to phrase it:

**Option 1 (Focus on Full-Stack & DevOps):**
> *   Architected a local cloud-native environment using **Kubernetes (KinD)** to orchestrate MongoDB, Redis, and MinIO microservices.
> *   Implemented a complete **GitOps CI/CD pipeline** using **GitHub Actions** and **ArgoCD** for automated Docker image building, tagging, and zero-downtime cluster synchronization.
> *   Configured an **NGINX Ingress Controller** for dynamic API routing and implemented **Horizontal Pod Autoscaling (HPA)** to automatically scale services under heavy load.

**Option 2 (Focus on Infrastructure & Scaling):**
> *   Deployed a scalable microservices architecture on a local Kubernetes cluster, managing stateful applications (MongoDB/Redis) with Persistent Volumes.
> *   Automated the deployment lifecycle (CI/CD) by integrating GitHub Actions with ArgoCD, ensuring infrastructure-as-code (IaC) principles.
> *   Configured Liveness/Readiness probes and HPA rules to achieve self-healing and dynamic scaling up to 5 replicas during peak traffic simulated via load testing.

---

## 🧠 Common Interview Questions & Answers

### 1. "I see you used ArgoCD. Why did you choose GitOps over traditional push-based deployment (like deploying directly from GitHub Actions)?"
**Answer:** "Traditional push-based deployments require giving your CI pipeline direct access and credentials to your Kubernetes cluster, which is a security risk. By using ArgoCD and the GitOps methodology, the cluster pulls changes from Git. Git becomes the single source of truth. If the cluster crashes or someone manually changes a configuration, ArgoCD immediately detects the drift and reverts the cluster back to the state defined in Git. It provides better security, auditability, and automated drift reconciliation."

### 2. "How did you handle routing traffic to both your Frontend and Backend on the same domain?"
**Answer:** "I used an NGINX Ingress Controller. I defined an `Ingress` resource with two routing rules: any request starting with `/api` was routed to the backend service, and all other traffic `/` defaulted to the frontend service. This eliminated CORS issues entirely because the browser perceives the frontend and backend as running on the exact same origin."

### 3. "How did you test your Horizontal Pod Autoscaler (HPA) locally?"
**Answer:** "I deployed a `busybox` pod into the cluster and ran a shell loop (`while true; do wget -q -O- http://backend:5000/api/v1/health; done`) to bombard the backend service with requests. I monitored the HPA using `kubectl get hpa -w` and watched the CPU utilization spike past my 75% threshold, which successfully triggered the replica count to scale up from 1 to 5."

### 4. "You had stateful services like MongoDB and MinIO running in Kubernetes. How did you ensure their data wasn't deleted if the pod crashed?"
**Answer:** "I used Kubernetes Persistent Volumes (PV) and Persistent Volume Claims (PVC). When deploying MongoDB and MinIO, I attached a PVC to the deployment. This maps a local directory on the host machine to the storage inside the pod. Even if the pod crashes, is deleted, or rescheduled, the data persists safely on the disk, and the new pod instantly reattaches to the same data."

### 5. "We noticed you fixed an issue with Google Authentication returning 404s. What was the root cause?"
**Answer:** "The issue was caused by an NGINX Ingress `rewrite-target: /` annotation. The frontend was calling `/api/auth/google`, but the Ingress controller was rewriting the URL and stripping the path, so the Express backend was just receiving a request to `/` instead of the actual auth route. By removing the aggressive rewrite rule and ensuring the backend was configured to accept the `/api` prefix, the routing worked perfectly."

### 6. "How did you handle frontend environment variables (like the API URL or Google Client ID) in a Dockerized environment?"
**Answer:** "Because Vite (React) bakes environment variables into the static files at build time, I couldn't inject them at runtime like a Node.js backend. Instead, I passed the environment variables as `--build-arg`s in my GitHub Actions workflow when building the Docker image. This allowed Vite to compile the frontend with the correct production variables securely injected from GitHub Secrets."

### 7. "What was the purpose of your Liveness and Readiness probes?"
**Answer:** "Readiness probes tell Kubernetes when a pod is fully booted up and ready to accept traffic. If it fails, Kubernetes removes it from the Service load balancer. Liveness probes continuously check if the application has crashed or frozen. If my backend Node.js event loop froze, the Liveness probe would fail, and Kubernetes would automatically restart the pod to achieve self-healing."
