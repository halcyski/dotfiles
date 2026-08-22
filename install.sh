#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")"

PACKAGES=(bash kitty starship nvim bin fonts tmux workflow)

if ! command -v stow >/dev/null 2>&1; then
    echo "error: stow is not installed" >&2
    exit 1
fi

install_starship() {
    echo "installing starship"
    curl -fsSL https://starship.rs/install.sh | sh -s -- --yes
}

install_mise() {
    echo "installing mise"
    curl -fsSL https://mise.run | sh
    export PATH="$HOME/.local/bin:$PATH"
}

install_mise_tool() {
    local tool="$1"
    echo "installing $tool via mise"
    mise use -g "$tool"
}

install_kitty() {
    echo "installing kitty"
    curl -fsSL https://sw.kovidgoyal.net/kitty/installer.sh | sh /dev/stdin
    mkdir -p "$HOME/.local/bin"
    ln -sf "$HOME/.local/kitty.app/bin/kitty" "$HOME/.local/bin/kitty"
    ln -sf "$HOME/.local/kitty.app/bin/kitten" "$HOME/.local/bin/kitten"
}

nvim_too_old() {
    command -v nvim >/dev/null 2>&1 || return 0
    local v
    v=$(nvim --version | head -1 | grep -oE '[0-9]+\.[0-9]+' | head -1)
    local major=${v%.*} minor=${v#*.}
    [ "$major" -eq 0 ] && [ "$minor" -lt 11 ]
}

install_neovim() {
    echo "installing neovim (stable)"
    local url="https://github.com/neovim/neovim/releases/download/stable/nvim-linux-x86_64.tar.gz"
    local tmp
    tmp=$(mktemp -d)
    curl -fsSL "$url" -o "$tmp/nvim.tar.gz"
    rm -rf "$HOME/.local/nvim"
    mkdir -p "$HOME/.local/nvim"
    tar -xzf "$tmp/nvim.tar.gz" -C "$HOME/.local/nvim" --strip-components=1
    mkdir -p "$HOME/.local/bin"
    ln -sf "$HOME/.local/nvim/bin/nvim" "$HOME/.local/bin/nvim"
    rm -rf "$tmp"
}

install_ripgrep() {
    echo "installing ripgrep"
    local url="https://github.com/BurntSushi/ripgrep/releases/download/14.1.1/ripgrep-14.1.1-x86_64-unknown-linux-musl.tar.gz"
    local tmp
    tmp=$(mktemp -d)
    curl -fsSL "$url" -o "$tmp/rg.tar.gz"
    tar -xzf "$tmp/rg.tar.gz" -C "$tmp" --strip-components=1
    mkdir -p "$HOME/.local/bin"
    install -m 0755 "$tmp/rg" "$HOME/.local/bin/rg"
    rm -rf "$tmp"
}

install_fd() {
    echo "installing fd"
    local url="https://github.com/sharkdp/fd/releases/download/v10.2.0/fd-v10.2.0-x86_64-unknown-linux-musl.tar.gz"
    local tmp
    tmp=$(mktemp -d)
    curl -fsSL "$url" -o "$tmp/fd.tar.gz"
    tar -xzf "$tmp/fd.tar.gz" -C "$tmp" --strip-components=1
    mkdir -p "$HOME/.local/bin"
    install -m 0755 "$tmp/fd" "$HOME/.local/bin/fd"
    rm -rf "$tmp"
}

if ! command -v curl >/dev/null 2>&1; then
    echo "warning: curl not found; cannot auto-install kitty/starship"
else
    command -v starship >/dev/null 2>&1 || install_starship
    command -v mise >/dev/null 2>&1 || install_mise
    command -v atuin >/dev/null 2>&1 || install_mise_tool atuin
    command -v fzf >/dev/null 2>&1 || install_mise_tool fzf
    command -v watchexec >/dev/null 2>&1 || install_mise_tool watchexec
    command -v kitty >/dev/null 2>&1 || install_kitty
    nvim_too_old && install_neovim
    command -v rg >/dev/null 2>&1 || install_ripgrep
    command -v fd >/dev/null 2>&1 || install_fd
fi

if ! command -v tmux >/dev/null 2>&1; then
    if command -v apt-get >/dev/null 2>&1; then
        echo "installing tmux (needs sudo)"
        sudo apt-get install -y tmux || \
            echo "warning: tmux install failed; run: sudo apt install tmux"
    else
        echo "warning: tmux not found and no apt-get; install it manually"
    fi
fi

backup_conflict() {
    local target="$1"
    if [ -e "$target" ] && [ ! -L "$target" ]; then
        echo "backing up $target -> $target.pre-stow"
        mv "$target" "$target.pre-stow"
    fi
}

backup_conflict "$HOME/.bashrc"

echo "stowing: ${PACKAGES[*]}"
stow -t "$HOME" "${PACKAGES[@]}"

# refresh font cache so the stowed fonts are picked up
if command -v fc-cache >/dev/null 2>&1; then
    fc-cache -f "$HOME/.local/share/fonts" >/dev/null 2>&1
fi

# sync starship palette from the current kitty theme (if one is set)
if command -v kitty-starship-sync >/dev/null 2>&1; then
    kitty-starship-sync
else
    "$HOME/.local/bin/kitty-starship-sync" 2>/dev/null || true
fi

if command -v npm >/dev/null 2>&1; then
    command -v basedpyright-langserver >/dev/null 2>&1 || \
        npm install -g basedpyright
else
    echo "warning: npm not found; skipping basedpyright (python LSP)"
fi

if command -v nvim >/dev/null 2>&1; then
    echo "installing nvim LSP servers and formatters via mason"
    nvim --headless \
        "+MasonInstall ruff clangd stylua shfmt prettierd prettier" \
        +qa >/dev/null 2>&1 || \
        echo "warning: mason install had errors; run :Mason in nvim to check"
fi

echo "yay. open a new shell or run: source ~/.bashrc"
