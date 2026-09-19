# How to Test Your DevOps System

Now that your enterprise-grade DevOps environment is fully running, here is how you can interact with it and rigorously test its capabilities!

---

## 1. Testing "Self-Healing" (Health Restore)
Kubernetes is designed to be highly resilient. If your backend crashes, it will resurrect it automatically. Let's test this!

1. Open your terminal and list your pods:
   ```powershell
   .\.bin\kubectl.exe get pods -n xerox
   ```
2. Copy the name of your backend pod (e.g., `backend-7d4d4b...`).
3. **Simulate a crash** by brutally deleting the pod:
   ```powershell
   .\.bin\kubectl.exe delete pod <pod-name> -n xerox
   ```
4. Immediately run `get pods` again:
   ```powershell
   .\.bin\kubectl.exe get pods -n xerox
   ```
**Result:** You will see a brand new backend pod in the `ContainerCreating` state. Your Liveness Probes detected the crash, and Kubernetes instantly orchestrated a replacement. Your app never went offline!

---

## 2. Testing "Autoscaling" (HPA)
We configured a Horizontal Pod Autoscaler (HPA) to spin up more servers if your CPU usage spikes.

1. Check your current autoscaling status:
   ```powershell
   .\.bin\kubectl.exe get hpa -n xerox
   ```
   *You will see it currently has `1` replica running.*
2. **Simulate heavy traffic**: We will run a tiny temporary pod that endlessly spams your backend with traffic to spike the CPU.
   ```powershell
   .\.bin\kubectl.exe run -i --tty load-generator --rm --image=busybox:1.28 --restart=Never -- /bin/sh -c "while sleep 0.01; do wget -q -O- http://backend:5000/api/v1/health; done"
   ```
3. Open a second terminal window and watch the HPA:
   ```powershell
   .\.bin\kubectl.exe get hpa -n xerox -w
   ```
**Result:** After a minute or two, the Metrics Server will notice the CPU load crossing 75%. You will see the `REPLICAS` count automatically jump from 1 up to 5! Once you stop the load generator, it will wait a few minutes and scale back down to 1 to save resources.

---

## 3. Viewing the Observability Stack

### Dashboards (Grafana & Prometheus)
Because we deployed the `kube-prometheus-stack` and bound it to your Ingress controller:
1. Open your web browser.
2. Go to `http://grafana.localhost`.
3. **Login**: Username `admin` / Password `TW4fohIb0ehwEbinEaZozPVnhNJVxndQaqgjGr2t`.
4. Go to **Dashboards** (four squares icon on the left) -> **Kubernetes / Compute Resources / Namespace (Pods)**.
5. Select the `xerox` namespace at the top.
*You are now viewing real-time CPU, Memory, and network traffic for your exact application!*

### Centralized Logging (Loki)
No more searching through terminal windows or servers to find error logs.
1. In Grafana, click the **Explore** icon (the compass on the left sidebar).
2. Change the top-left dropdown from Prometheus to **Loki**.
3. Under "Label filters", select `namespace` and pick `xerox`. 
4. Click **Run Query**.
*You will see a live feed of every single `console.log` from your Frontend and Backend, all perfectly searchable!*

---

## 4. Testing the CI/CD Pipeline
Want to see the GitOps magic in action?

1. Make a tiny visible change to your Frontend or Backend code (e.g., change a console.log or a text heading).
2. Commit and push the code:
   ```powershell
   git add .
   git commit -m "Testing GitOps deployment"
   git push origin local-devops
   ```
3. **Watch the automation:**
   - Go to your GitHub repo's **Actions** tab. Watch it build your new image.
   - Once it finishes, it will automatically update the `k8s/` folder in your repo.
   - Wait ~3 minutes (or force refresh in ArgoCD), and ArgoCD will instantly swap out your old pods for the new ones, all with zero downtime!
