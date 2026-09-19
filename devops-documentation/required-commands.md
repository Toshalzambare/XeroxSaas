# 🛠️ Essential Kubernetes Commands Cheat Sheet

Managing your application in Kubernetes mostly revolves around a few core `kubectl` commands. 

> [!IMPORTANT]
> **The Namespace Rule:** Your entire XeroxSaaS application lives inside a dedicated "room" in Kubernetes called the **`xerox`** namespace. 
> If you run a command without adding `-n xerox` at the end, Kubernetes will look in the empty default room and tell you "No resources found." 

---

## 1. Checking Status (Is my app running?)

**List all running parts of your app:**
```powershell
.\.bin\kubectl.exe get pods -n xerox
```
*(This shows the frontend, backend, mongodb, redis, and minio pods. Look for `1/1 Running` under the STATUS column).*

**List all Services (Networking):**
```powershell
.\.bin\kubectl.exe get svc -n xerox
```
*(Use this to verify the internal IP addresses and ports your apps are listening on).*

**Watch the Autoscaler (HPA) live:**
```powershell
.\.bin\kubectl.exe get hpa -n xerox -w
```
*(Adding `-w` stands for "watch". It keeps your terminal open and prints a new line every time the CPU usage changes).*

---

## 2. Viewing Logs (What is my app doing?)

*Note: You must copy the exact pod name from the `get pods` command above.*

**View the last 50 lines of logs for the Backend:**
```powershell
.\.bin\kubectl.exe logs backend-xxxxxxxxx-xxxxx -n xerox --tail=50
```

**Stream logs LIVE (like a running terminal):**
```powershell
.\.bin\kubectl.exe logs -f frontend-xxxxxxxxx-xxxxx -n xerox
```
*(Hit `Ctrl + C` to stop watching).*

---

## 3. Troubleshooting (Why did it break?)

If a pod says `CrashLoopBackOff` or `Error` instead of `Running`, you need to ask Kubernetes *why* it failed to start.

**Describe the Pod (Detailed Error Report):**
```powershell
.\.bin\kubectl.exe describe pod backend-xxxxxxxxx-xxxxx -n xerox
```
*(Scroll to the very bottom of the output to the "Events" section. It will usually tell you exactly what went wrong, like "Liveness probe failed" or "ImagePullBackOff").*

---

## 4. Fixing & Restarting

Kubernetes is designed to be self-healing. The easiest way to restart a frozen app is simply to murder the pod; Kubernetes will instantly spawn a brand new, healthy one to replace it.

**Force Restart a single Pod:**
```powershell
.\.bin\kubectl.exe delete pod frontend-xxxxxxxxx-xxxxx -n xerox
```

**Restart the entire Backend Deployment (Zero-Downtime Reboot):**
```powershell
.\.bin\kubectl.exe rollout restart deployment backend -n xerox
```

---

## 5. Port Forwarding (Accessing hidden databases)
Sometimes you need to connect a GUI tool (like MongoDB Compass) to your database, but the database is securely locked inside the cluster.

**Forward MongoDB to your localhost:**
```powershell
.\.bin\kubectl.exe port-forward svc/mongodb 27017:27017 -n xerox
```
*(Keep this terminal open! As long as it's running, you can connect MongoDB Compass to `localhost:27017`).*
