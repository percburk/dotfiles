# zsh plugin settings
ZSH_AUTOSUGGEST_BUFFER_MAX_SIZE="20"
ZSH_AUTOSUGGEST_USE_ASYNC=1
export KEYTIMEOUT=1

# unset eza color overrides so theme.yml controls colors
unset LS_COLORS
unset EZA_COLORS

# init homebrew
eval "$(/opt/homebrew/bin/brew shellenv)"

# shared tool config
export EZA_CONFIG_DIR="$XDG_CONFIG_HOME/eza"
export LG_CONFIG_FILE="$XDG_CONFIG_HOME/lazygit/config.yml"
export ZELLIJ_SOCKET_DIR="/tmp/zellij"

# history
HISTFILE="$XDG_STATE_HOME/zsh/history"
HISTSIZE=100000
SAVEHIST=100000

setopt APPEND_HISTORY
setopt SHARE_HISTORY
setopt HIST_IGNORE_DUPS
setopt HIST_IGNORE_SPACE
setopt HIST_EXPIRE_DUPS_FIRST
setopt HIST_FIND_NO_DUPS

# shell behavior
setopt AUTOCD
setopt NOBEEP
setopt NUMERIC_GLOB_SORT

# native zsh completion; required for fzf-tab
autoload -Uz compinit
zstyle ':completion:*' menu no
zstyle ':completion:*' matcher-list 'm:{a-z}={A-Za-z}'
compinit -d "$XDG_CACHE_HOME/zsh/zcompdump"

# bun completions
[ -s "$BUN_INSTALL/_bun" ] && source "$BUN_INSTALL/_bun"

# fzf fuzzy finder
source <(fzf --zsh)
source "$ZDOTDIR/fzf.zsh"

# fzf-tab
source "$HOMEBREW_PREFIX/opt/fzf-tab/share/fzf-tab/fzf-tab.zsh"
source "$ZDOTDIR/fzf-tab.zsh"

# other zsh plugins
source "$HOMEBREW_PREFIX/opt/zsh-vi-mode/share/zsh-vi-mode/zsh-vi-mode.plugin.zsh"
source "$HOMEBREW_PREFIX/share/zsh-autosuggestions/zsh-autosuggestions.zsh"

# theme for zsh syntax highlighting
source "$ZDOTDIR/ayu-dark-zsh-syntax-highlighting.zsh"

# fnm node version manager
eval "$(fnm env --use-on-cd --shell zsh)"

# Init Zellij terminal multiplexer on start, only for ghostty though
# if [[ $TERM_PROGRAM == "ghostty" ]]; then
#   eval "$(zellij setup --generate-auto-start zsh)"
# fi

# zoxide smart cd
eval "$(zoxide init zsh)"

# starship custom prompt
eval "$(starship init zsh)"

# custom aliases 
source "$ZDOTDIR/aliases.zsh"

# local machine-specific shell config, not tracked by dotfiles.
if [[ -f "$ZDOTDIR/.zshrc.local" ]]; then
  source "$ZDOTDIR/.zshrc.local"
fi

# zsh-syntax-highlighting should be sourced last
source "$HOMEBREW_PREFIX/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh"
