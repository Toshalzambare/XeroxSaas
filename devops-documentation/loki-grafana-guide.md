# Grafana & Loki Monitoring Guide

This guide explains how to properly monitor your XeroxSaaS Kubernetes cluster using Grafana for visual dashboards and Loki for centralized logging.

## 1. Accessing Grafana
By default, the `kube-prometheus-stack` installs Grafana inside your cluster. To access it securely from your local machine, run:
```powershell
.\.bin\kubectl.exe port-forward svc/grafana 3000:80 -n monitoring
```
Then, open your browser and go to `http://localhost:3000`.
**Default Login:**
- Username: `admin`
- Password: `prom-operator` (or whatever you set during installation)

---

## 2. Setting Up the "Important" Dashboards
Grafana installs with dozens of highly detailed dashboards. You **do not need to combine or delete them** (as they are managed automatically by Helm). Instead, simply click the **Star** icon next to the following three dashboards to pin them to your home page and ignore the rest!

**The "Holy Trinity" of Dashboards to Star:**
1. **`Kubernetes / Compute Resources / Cluster`**: The ultimate bird's-eye view. Shows total CPU and Memory usage across your entire architecture.
2. **`Kubernetes / Compute Resources / Namespace (Pods)`**: The most important one for your application. Select the `xerox` namespace in the top left dropdown to see exactly how much CPU your Frontend, Backend, and MongoDB are using individually.
3. **`Kubernetes / Persistent Volumes`**: Crucial for tracking your MongoDB database and MinIO storage space so you know if your disks are getting full.

*(You can safely ignore all the others like AIX, MacOS, Proxy, Scheduler, and Networking unless you are deeply debugging Kubernetes internal networking!)*

---

## 3. Mastering Loki (Centralized Logging)
Loki is the logging engine. Promtail collects logs from every container in Kubernetes and sends them to Loki. Grafana is just the UI used to search them.

### How to access Logs:
1. In Grafana, click the **Explore** icon (looks like a compass) on the left sidebar.
2. At the top left, change the data source dropdown from `Prometheus` to **`Loki`**.

### Using LogQL (Loki Query Language)
Loki uses "labels" to filter logs lightning-fast. You don't search the entire database; you filter by labels first, then search the text.

#### The Best Filters for XeroxSaaS:

**1. See ALL logs for the Backend Server:**
```logql
{namespace="xerox", app="backend"}
```

**2. See ALL logs for the Frontend (Nginx):**
```logql
{namespace="xerox", app="frontend"}
```

**3. See logs for MongoDB:**
```logql
{namespace="xerox", app="mongodb"}
```

**4. Find all "Errors" in the Backend:**
*(The `|~` operator allows you to search the actual log text using Regex).*
```logql
{namespace="xerox", app="backend"} |~ "(?i)error|exception|fail"
```

**5. Find logs relating to a specific Shop ID or User Email:**
```logql
{namespace="xerox", app="backend"} |= "test1@gmail.com"
```

### Pro-Tips for Monitoring
*   **Where to find what:** 
    *   If a student can't upload a file, check the `{app="backend"}` logs for AWS/S3 errors.
    *   If the website isn't loading at all, check the `{app="frontend"}` logs (or the Ingress Controller logs in the `ingress-nginx` namespace).
*   **Live Tailing:** In the top right of the Explore view, click the "Live" button. This will stream logs into your browser in real-time, exactly like running `docker logs -f` or `kubectl logs -f`, but for your entire architecture at once!
