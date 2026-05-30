# re-source zsh config into the current terminal session
alias sourcezsh="source $ZDOTDIR/.zshrc"

# edit config files
alias zshconfig="nvim $ZDOTDIR/.zshrc"
alias ghosttyconfig="nvim $XDG_CONFIG_HOME/ghostty/config"

# yazi: replace cwd while traversing directories
function y() {
  local tmp="$(mktemp -t "yazi-cwd.XXXXXX")" cwd
  command yazi "$@" --cwd-file="$tmp"
  IFS= read -r -d '' cwd < "$tmp"
  [ "$cwd" != "$PWD" ] && [ -d "$cwd" ] && builtin cd -- "$cwd"
  rm -f -- "$tmp"
}

# app aliases
alias arc="open -a Arc"
alias chrome="open -a 'Google Chrome'"
alias spotify="open -a Spotify"
alias slack="open -a Slack"
alias postico="open -a Postico"
alias sourcetree="open -a Sourcetree"
alias helium="open -a Helium"

# git aliases
alias gs="git status"
alias ga="git add ."
alias gp="git push origin"
alias gc="git commit -m"
alias gpl="git pull origin"
alias gch="git checkout"
alias gb="git branch"
alias gsh="git stash"

# postgres aliases
alias startp="brew services start postgresql@14"
alias stopp="brew services stop postgresql@14"

# eza aliases
alias ls="eza -a --icons"
alias la="eza -la --icons --git"
alias lsa="eza -la --icons --git"
alias tree="eza --tree --icons"

# better cat
alias cat="bat"
# reuse ls completions for eza
compdef eza=ls

# cli aliases
alias lg="lazygit"
alias cx="codex"
alias cc="claude"

# dotfiles bare repo aliases
alias cfg="/opt/homebrew/bin/git --git-dir=$HOME/.cfg/ --work-tree=$HOME"
alias cfglg="lazygit --git-dir=$HOME/.cfg --work-tree=$HOME"
