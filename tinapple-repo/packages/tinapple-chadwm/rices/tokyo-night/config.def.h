/* See LICENSE file for copyright and license details. */
/* tinapple-chadwm configuration - Tokyo Night Rice */

#ifndef TOKYO_NIGHT_CONFIG_H
#define TOKYO_NIGHT_CONFIG_H

#include <X11/XF86keysym.h>

/* appearance */
static const unsigned int borderpx        = 2;
static const unsigned int default_border    = 2;
static const unsigned int snap            = 32;
static const unsigned int gappih          = 10;
static const unsigned int gappiv          = 10;
static const unsigned int gappoh          = 12;
static const unsigned int gappov          = 12;
static const int smartgaps                = 0;

/* systray patch settings */
static const unsigned int systraypinning  = 0;
static const unsigned int systrayspacing  = 6;
static const unsigned int systrayiconsize = 16;
static const int systraypinningfailfirst  = 1;
static const int showsystray              = 1;

/* bar settings */
static const int showbar                  = 1;
static const int topbar                   = 1;
static const int floatbar                 = 1;
static const int horizpadbar              = 6;
static const int vertpadbar               = 8;
static const int vertpadtab               = 32;
static const int horizpadtabi             = 12;
static const int horizpadtabo             = 12;
static const int scalepreview             = 4;
static const int tag_preview              = 0;
static const int colorfultag              = 1;
static const int new_window_attach_on_end = 0;
#define ICONSIZE 16
#define ICONSPACING 8

static const char *fonts[] = {
    "JetBrainsMono Nerd Font:style=Medium:size=10:antialias=true:autohint=true",
    "JoyPixels:style=Regular:size=10:antialias=true:autohint=true"
};

/* Tokyo Night Colors */
static const char tn_bg[]       = "#1a1b26";
static const char tn_bg_dark[]  = "#16161e";
static const char tn_bg_light[] = "#24283b";
static const char tn_gray[]     = "#565f89";
static const char tn_fg[]       = "#c0caf5";
static const char tn_white[]    = "#cfc9c2";
static const char tn_blue[]     = "#7aa2f7";
static const char tn_cyan[]     = "#7dcfff";
static const char tn_green[]    = "#9ece6a";
static const char tn_red[]      = "#f7768e";
static const char tn_orange[]   = "#ff9e64";
static const char tn_yellow[]   = "#e0af68";
static const char tn_magenta[]  = "#bb9af7";
static const char tn_border[]   = "#292e42";

static const char *colors[][3] = {
    /*                    fg          bg           border */
    [SchemeNorm]      = { tn_fg,      tn_bg,       tn_border },
    [SchemeSel]       = { tn_bg_dark, tn_blue,     tn_blue },
    [SchemeTitle]     = { tn_fg,      tn_bg,       tn_bg },
    [TabSel]          = { tn_cyan,    tn_bg_light, tn_blue },
    [TabNorm]         = { tn_gray,    tn_bg,       tn_bg },
    [SchemeTag]       = { tn_gray,    tn_bg,       tn_bg },
    [SchemeTag1]      = { tn_blue,    tn_bg,       tn_bg },
    [SchemeTag2]      = { tn_cyan,    tn_bg,       tn_bg },
    [SchemeTag3]      = { tn_green,   tn_bg,       tn_bg },
    [SchemeTag4]      = { tn_yellow,  tn_bg,       tn_bg },
    [SchemeTag5]      = { tn_magenta, tn_bg,       tn_bg },
    [SchemeLayout]    = { tn_cyan,    tn_bg,       tn_bg },
    [SchemeBtnPrev]   = { tn_green,   tn_bg,       tn_bg },
    [SchemeBtnNext]   = { tn_yellow,  tn_bg,       tn_bg },
    [SchemeBtnClose]  = { tn_red,     tn_bg,       tn_bg },
};

/* tagging */
static char *tags[] = { "󰈹", "", "󰅩", "󱗼", "󰒓" };

static const int tagschemes[] = {
    SchemeTag1, SchemeTag2, SchemeTag3, SchemeTag4, SchemeTag5
};

static const unsigned int ulinepad     = 5;
static const unsigned int ulinestroke  = 2;
static const unsigned int ulinevoffset = 0;
static const int ulineall              = 0;

/* window rules (swallow compatible) */
static const Rule rules[] = {
    { "Gimp",           NULL,       NULL,       0,            0,           1,           0,          0,        -1 },
    { "firefox",        NULL,       NULL,       1 << 0,       0,           0,           0,         -1,        -1 },
    { "tinapple-dash",  NULL,       NULL,       0,            1,           1,           0,          1,        -1 },
    { "pavucontrol",    NULL,       NULL,       0,            1,           1,           0,          1,        -1 },
    { "Rofi",           NULL,       NULL,       0,            1,           1,           0,          1,        -1 },
    { "Alacritty",      NULL,       NULL,       0,            0,           0,           1,          0,        -1 },
    { "st-256color",    NULL,       NULL,       0,            0,           0,           1,          0,        -1 },
};

/* layout(s) */
static const float mfact        = 0.52;
static const int nmaster        = 1;
static const int resizehints    = 0;
static const int lockfullscreen = 1;

#define FORCE_VSPLIT 1
#include "../../chadwm/functions.h"

static const Layout layouts[] = {
    { "[]=",      tile },
    { "[M]",      monocle },
    { "[@]",      spiral },
    { "[\\]",     dwindle },
    { "H[]",      deck },
    { "TTT",      bstack },
    { "===",      bstackhoriz },
    { "HHH",      grid },
    { ":::",      gaplessgrid },
    { "|M|",      centeredmaster },
    { "><>",      NULL },
    { NULL,       NULL },
};

/* key definitions: Mod=Super (Mod4Mask) */
#define MODKEY Mod4Mask
#define TAGKEYS(KEY,TAG) \
    { MODKEY,                       KEY,      view,           {.ui = 1 << TAG} }, \
    { MODKEY|ControlMask,           KEY,      toggleview,     {.ui = 1 << TAG} }, \
    { MODKEY|ShiftMask,             KEY,      tag,            {.ui = 1 << TAG} }, \
    { MODKEY|ControlMask|ShiftMask, KEY,      toggletag,      {.ui = 1 << TAG} },

#define SHCMD(cmd) { .v = (const char*[]){ "/bin/sh", "-c", cmd, NULL } }

static const char *upvol[]   = { "/usr/bin/pactl", "set-sink-volume", "@DEFAULT_SINK@", "+5%", NULL };
static const char *downvol[] = { "/usr/bin/pactl", "set-sink-volume", "@DEFAULT_SINK@", "-5%", NULL };
static const char *mutevol[] = { "/usr/bin/pactl", "set-sink-mute",   "@DEFAULT_SINK@", "toggle", NULL };

static const Key keys[] = {
    { 0,                                XF86XK_AudioRaiseVolume,  spawn, {.v = upvol } },
    { 0,                                XF86XK_AudioLowerVolume,  spawn, {.v = downvol } },
    { 0,                                XF86XK_AudioMute,         spawn, {.v = mutevol } },

    { MODKEY,                           XK_Return,  spawn,            SHCMD("st || alacritty") },
    { MODKEY,                           XK_d,       spawn,            SHCMD("rofi -show drun") },
    { MODKEY,                           XK_space,   spawn,            SHCMD("rofi -show drun") },
    { MODKEY,                           XK_a,       spawn,            SHCMD("rofi -show tinapple-actions") },
    { MODKEY,                           XK_Escape,  spawn,            SHCMD("rofi -show powermenu") },

    { MODKEY,                           XK_q,       killclient,       {0} },
    { MODKEY,                           XK_f,       togglefullscr,    {0} },
    { MODKEY|ShiftMask,                 XK_space,   togglefloating,   {0} },
    { MODKEY,                           XK_b,       togglebar,        {0} },

    { MODKEY,                           XK_j,       focusstack,       {.i = +1 } },
    { MODKEY,                           XK_k,       focusstack,       {.i = -1 } },
    { MODKEY|ShiftMask,                 XK_j,       movestack,        {.i = +1 } },
    { MODKEY|ShiftMask,                 XK_k,       movestack,        {.i = -1 } },
    { MODKEY|ShiftMask,                 XK_Return,  zoom,             {0} },
    { MODKEY,                           XK_Tab,     view,             {0} },

    { MODKEY,                           XK_h,       setmfact,         {.f = -0.05} },
    { MODKEY,                           XK_l,       setmfact,         {.f = +0.05} },

    /* gaps controls */
    { MODKEY|ControlMask,               XK_t,       togglegaps,       {0} },
    { MODKEY|ControlMask,               XK_i,       incrgaps,         {.i = +1 } },
    { MODKEY|ControlMask,               XK_d,       incrgaps,         {.i = -1 } },
    { MODKEY|ControlMask|ShiftMask,     XK_d,       defaultgaps,      {0} },

    /* layouts */
    { MODKEY,                           XK_t,       setlayout,        {.v = &layouts[0]} },
    { MODKEY|ShiftMask,                 XK_f,       setlayout,        {.v = &layouts[1]} },
    { MODKEY,                           XK_m,       setlayout,        {.v = &layouts[2]} },
    { MODKEY,                           XK_g,       setlayout,        {.v = &layouts[7]} },
    { MODKEY,                           XK_c,       setlayout,        {.v = &layouts[9]} },

    { MODKEY|ShiftMask,                 XK_r,       restart,          {0} },
    { MODKEY|ControlMask,               XK_q,       spawn,            SHCMD("tinapple-session toggle || killall chadwm") },

    TAGKEYS(                            XK_1,                         0)
    TAGKEYS(                            XK_2,                         1)
    TAGKEYS(                            XK_3,                         2)
    TAGKEYS(                            XK_4,                         3)
    TAGKEYS(                            XK_5,                         4)
    { MODKEY,                           XK_0,       view,             {.ui = ~0 } },
    { MODKEY|ShiftMask,                 XK_0,       tag,              {.ui = ~0 } },
};

static const Button buttons[] = {
    { ClkLtSymbol,          0,              Button1,        setlayout,      {0} },
    { ClkWinTitle,          0,              Button2,        zoom,           {0} },
    { ClkStatusText,        0,              Button2,        spawn,          SHCMD("st") },
    { ClkClientWin,         MODKEY,         Button1,        moveorplace,    {.i = 0} },
    { ClkClientWin,         MODKEY,         Button2,        togglefloating, {0} },
    { ClkClientWin,         MODKEY,         Button3,        resizemouse,    {0} },
    { ClkTagBar,            0,              Button1,        view,           {0} },
    { ClkTagBar,            0,              Button3,        toggleview,     {0} },
    { ClkTagBar,            MODKEY,         Button1,        tag,            {0} },
};

#endif /* TOKYO_NIGHT_CONFIG_H */
