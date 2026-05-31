# UI
export FZF_DEFAULT_OPTS=$'
  --color=fg:#707a8c
  --color=bg:#0b0e14
  --color=hl:#ffcc66
  --color=fg+:#cbccc6
  --color=bg+:#191e2a
  --color=hl+:#ffcc66
  --color=info:#73d0ff
  --color=prompt:#707a8c
  --color=pointer:#ff8f40
  --color=marker:#e0e1dc
  --color=spinner:#73d0ff
  --color=header:#d4bfff
  --color=border:#4a5064
  --color=gutter:#191e2a
  --height=60%
  --layout=reverse
  --border=rounded
  --preview-window=right:65%:wrap:border-left
'

export FZF_DEFAULT_COMMAND="fd --type f --hidden --strip-cwd-prefix"  # strip-cwd-prefix removes the leading ./ from results

# ctrl-t uses fd
export FZF_CTRL_T_COMMAND="$FZF_DEFAULT_COMMAND"

export _FZF_PREVIEW_CMD="bat --color=always --style=plain,numbers --line-range=:500 {}"
export FZF_CTRL_T_OPTS="--preview '$_FZF_PREVIEW_CMD'"
