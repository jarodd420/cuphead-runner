# Air-gapped Ansible CI image

Use this when your GitLab runners have no internet: build the image where you have network, transfer the tarball, then load and use it in the air-gapped environment.

## 1. Build and save (on network)

**Option 0: GitHub Actions (no local Docker/Podman/WSL)**  
Push this repo (or the `ansible-airgapped/` folder) to GitHub. Go to **Actions** → **Build Ansible air-gapped image** → **Run workflow**. When the run finishes, open it and download the **ansible-airgapped-tar** artifact. Unzip the artifact to get `ansible-airgapped.tar`, then transfer that file to the air-gapped environment.

**Option A: Podman (recommended on Windows)**  
Install: `winget install RedHat.Podman`. Then start the machine (first time only) and build:

```powershell
cd ansible-airgapped
podman machine init
podman machine start
podman build -t ansible-airgapped:latest .
podman save -o ansible-airgapped.tar ansible-airgapped:latest
```

**Option B: Docker**

```powershell
cd ansible-airgapped
docker build -t ansible-airgapped:latest .
docker save ansible-airgapped:latest -o ansible-airgapped.tar
```

**Or run the script:** `.\build.ps1` (uses Podman if available, else Docker, and creates `ansible-airgapped.tar`).

Transfer `ansible-airgapped.tar` to the air-gapped environment (USB, etc.).

## 2. Load and tag (air-gapped)

**Podman:** `podman load -i ansible-airgapped.tar`

**Docker:** `docker load -i ansible-airgapped.tar`

If you use an internal registry, tag and push the loaded image as needed.

## 3. CI job

Use the job defined in `.gitlab-ci-airgapped.yml` (or paste its contents into your `.gitlab-ci.yml`). The job uses this image and only runs `ansible --version` and SSH config setup at runtime—no `apk` or `pip` or `ansible-galaxy` in the pipeline.
