# Tinapple OS - Default bash configuration
[[ $- != *i* ]] && return

export TERM="${TERM:-xterm-256color}"
export EDITOR=vim

# Auto-attach to unified tmux session 'tinapple' for both TTY and Terminal (foot)
# Ensures identical shared session across GUI terminal and TTY consoles
if [[ -z "$TMUX" && -n "$PS1" ]] && [[ "$TERM" != "dumb" ]] && command -v tmux >/dev/null 2>&1; then
  exec tmux new-session -A -s tinapple
fi

alias ls='ls --color=auto'
alias ll='ls -lah --color=auto'
alias grep='grep --color=auto'
alias tinapple-dash='systemctl status tinapple-dash'
alias tsession='tinapple-session'
