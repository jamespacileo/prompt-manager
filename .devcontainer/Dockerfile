FROM mcr.microsoft.com/vscode/devcontainers/typescript-node:0-16

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash

# Install global npm packages
RUN npm install -g typescript ts-node

# Set up non-root user
ARG USERNAME=node
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Create the user
RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME \
    && apt-get update \
    && apt-get install -y sudo \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Set the default user
USER $USERNAME

# Set up Bun for the non-root user
RUN curl -fsSL https://bun.sh/install | bash

# Set up shell
ENV SHELL /bin/bash
