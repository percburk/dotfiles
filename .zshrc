# zsh plugin settings
ZSH_AUTOSUGGEST_BUFFER_MAX_SIZE="20"
ZSH_AUTOSUGGEST_USE_ASYNC=1

# Native zsh vi mode
bindkey -v
export KEYTIMEOUT=1

# Init Homebrew
eval "$(/opt/homebrew/bin/brew shellenv)"

# Shared tool config
export EDITOR="nvim"
export EZA_CONFIG_DIR="$HOME/.config/eza"
export LG_CONFIG_FILE="$HOME/.config/lazygit/config.yml"
export ZELLIJ_SOCKET_DIR="/tmp/zellij"

# Init fnm node version manager
eval "$(fnm env --use-on-cd --shell zsh)"

# Init Zellij terminal multiplexer on start, only for ghostty though
# if [[ $TERM_PROGRAM == "ghostty" ]]; then
#   eval "$(zellij setup --generate-auto-start zsh)"
# fi

# Native zsh completion; required for fzf-tab
autoload -Uz compinit
zstyle ':completion:*' menu no
zstyle ':completion:*' matcher-list 'm:{a-z}={A-Za-z}'
compinit -d "$HOME/.zcompdump"

# fzf shell integration
source <(fzf --zsh)

# fzf-tab
source "$HOMEBREW_PREFIX/opt/fzf-tab/share/fzf-tab/fzf-tab.zsh"

# zsh-autosuggestions
source "$HOMEBREW_PREFIX/share/zsh-autosuggestions/zsh-autosuggestions.zsh"

# zoxide smart cd
eval "$(zoxide init zsh)"

# unset eza color overrides so theme.yml controls colors
unset LS_COLORS
unset EZA_COLORS

# Init starship custom prompt
eval "$(starship init zsh)"

# Re-source .zshrc config into open terminal session
alias sourcezsh="source ~/.zshrc"

# add alias of `y` for yazi and replace cwd while traversing directories
function y() {
  local tmp="$(mktemp -t "yazi-cwd.XXXXXX")" cwd
  command yazi "$@" --cwd-file="$tmp"
  IFS= read -r -d '' cwd < "$tmp"
  [ "$cwd" != "$PWD" ] && [ -d "$cwd" ] && builtin cd -- "$cwd"
  rm -f -- "$tmp"
}

# App aliases
alias arc="open -a Arc"
alias chrome="open -a 'Google Chrome'"
alias spotify="open -a Spotify"
alias slack="open -a Slack"
alias postico="open -a Postico"
alias sourcetree="open -a Sourcetree"
alias helium="open -a Helium"

# Config file aliases
alias zshconfig="nvim ~/.zshrc"
alias starshipconfig="nvim ~/.config/starship.toml"
alias ghosttyconfig="nvim ~/.config/ghostty/config"

# Git aliases
alias gs="git status"
alias ga="git add ."
alias gp="git push origin"
alias gc="git commit -m"
alias gpl="git pull origin"
alias gch="git checkout"
alias gb="git branch"
alias gsh="git stash"

# Postgres aliases
alias startp="brew services start postgresql@14"
alias stopp="brew services stop postgresql@14"

# add eza to ls commands
alias lsa="eza -a -l --icons"
alias ls="eza -a -1 --icons"

# cli aliases
alias lg="lazygit"
alias cx="codex"
alias cc="claude"

# Dotfiles bare repo aliases
alias cfg="/opt/homebrew/bin/git --git-dir=$HOME/.cfg/ --work-tree=$HOME"
alias cfglg="lazygit --git-dir=$HOME/.cfg --work-tree=$HOME"

# Local machine-specific shell config, not tracked by dotfiles.
if [[ -f "$HOME/.zshrc.local" ]]; then
  source "$HOME/.zshrc.local"
fi

# zsh-syntax-highlighting should be sourced last
source "$HOMEBREW_PREFIX/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh"
