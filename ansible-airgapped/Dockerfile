# Repackaged Ansible image for air-gapped GitLab CI
# Build once where you have network, save, transfer, load on air-gapped side.

FROM willhallonline/ansible:latest

# Install Alpine build deps and Python deps (same as ansible_build stage)
RUN apk add --no-cache \
    gcc \
    python3-dev \
    musl-dev \
    linux-headers \
    libffi-dev \
    openssl-dev \
    make \
  && pip install --no-cache-dir --quiet openstacksdk \
  && apk del gcc musl-dev linux-headers make

# Pre-install Galaxy collection so job doesn't need network
RUN ansible-galaxy collection install fedora.linux_system_roles

# Optional: create SSH config skeleton (job can overwrite for env-specific keys)
RUN mkdir -p /root/.ssh && chmod 700 /root/.ssh
# Job will write ~/.ssh/config at runtime if needed
