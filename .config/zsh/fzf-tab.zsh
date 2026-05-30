zstyle ':fzf-tab:*' use-fzf-default-opts yes

# fzf-tab group colors use ANSI escape sequences
FZF_TAB_GROUP_COLORS=(
  $'\033[38;2;112;122;140m' # fg / gray
  $'\033[38;2;115;208;255m' # info / blue
  $'\033[38;2;255;204;102m' # hl / yellow
  $'\033[38;2;255;143;64m'  # pointer / orange
  $'\033[38;2;224;225;220m' # marker / white
  $'\033[38;2;212;191;255m' # header / purple
  $'\033[38;2;203;204;198m' # fg+ / bright fg
)

# color only fzf-tab's group prefix, then reset so fzf's colors control the rest
zstyle ':fzf-tab:*' prefix $'·\033[00m'
zstyle ':fzf-tab:*' group-colors $FZF_TAB_GROUP_COLORS
zstyle ':fzf-tab:*' default-color ''
