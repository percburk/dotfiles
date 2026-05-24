# oh-my-zsh and plugin settings
DISABLE_AUTO_UPDATE="true"
DISABLE_MAGIC_FUNCTIONS="true"
DISABLE_LS_COLORS="true"
ZSH_AUTOSUGGEST_BUFFER_MAX_SIZE="20"
ZSH_AUTOSUGGEST_USE_ASYNC=1

export EDITOR="nvim"

# point eza to custom config dir
export EZA_CONFIG_DIR="$HOME/.config/eza"

# point lazygit to .config
export LG_CONFIG_FILE="$HOME/.config/lazygit/config.yml"

# path to oh-my-zsh installation.
export ZSH="/Users/kevin.burk/.oh-my-zsh"

# Local bin and system paths
export PATH="$HOME/.local/bin:$PATH"

# Init homebrew, overwrites system paths
eval "$(/opt/homebrew/bin/brew shellenv)"

# commenting out pyenv code for now, I'm not writing fucking python and it's slowing shell boot time
# pyenv takes precedence over homebrew and system python installs
# export PATH="$HOME/.pyenv/shims:$PATH"

# Init pyenv if installed
# if command -v pyenv 1>/dev/null 2>&1; then
#   eval "$(pyenv init -)"
# fi

# Local bin path for user scripts
export PATH="$HOME/bin:$PATH"

# Init fnm, taking precedence over homebrew node installs
eval "$(fnm env --use-on-cd)"

# Init Zellij terminal multiplexer on start, only for ghostty though
# if [[ $TERM_PROGRAM == "ghostty" ]]; then
#   eval "$(zellij setup --generate-auto-start zsh)"
# fi

# Add autocomplete, fzf, and syntax highlighting out of Warp since these are built-in
if [[ $TERM_PROGRAM != "WarpTerminal" ]]; then
  plugins=(fzf-tab git zsh-autosuggestions zsh-syntax-highlighting zsh-vi-mode)
else 
  plugins=(git)
fi

# Init omz
source $ZSH/oh-my-zsh.sh

# unset eza color overrides so theme.yml controls colors
unset LS_COLORS
unset EZA_COLORS

# Init starship custom prompt
eval "$(starship init zsh)"

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
alias chrome="open -a Google\ Chrome"
alias spotify="open -a Spotify"
alias postico="open -a Postico"
alias sourcetree="open -a Sourcetree"
alias helium="open -a Helium"

# Re-source .zshrc config into open terminal session
alias sourcezsh="source ~/.zshrc"

# Config file aliases
alias zshconfig="cursor ~/.zshrc"
alias starshipconfig="cursor ~/.config/starship.toml"
alias ghosttyconfig="cursor ~/.config/ghostty/config"

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
alias cfg='/opt/homebrew/bin/git --git-dir=$HOME/.cfg/ --work-tree=$HOME'
alias cfglg='lazygit --git-dir=$HOME/.cfg --work-tree=$HOME'
