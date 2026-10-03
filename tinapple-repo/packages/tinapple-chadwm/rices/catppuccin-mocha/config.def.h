/* See LICENSE file for copyright and license details. */
/* tinapple-chadwm configuration - Catppuccin Mocha Rice */

#ifndef CATPPUCCIN_MOCHA_CONFIG_H
#define CATPPUCCIN_MOCHA_CONFIG_H

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

/* Catppuccin Mocha Colors */
static const char ct_crust[]    = "#11111b";
static const char ct_mantle[]   = "#181825";
static const char ct_base[]     = "#1e1e2e";
static const char ct_surface0[] = "#313244";
static const char ct_surface1[] = "#45475a";
static const char ct_text[]     = "#cdd6f4";
static const char ct_subtext[]  = "#a6adc8";
static const char ct_lavender[] = "#b4befe";
static const char ct_blue[]     = "#89b4fa";
static const char ct_sapphire[] = "#74c7ec";
static const char ct_sky[]      = "#89dceb";
static const char ct_teal[]     = "#94e2d5";
static const char ct_green[]    = "#a6e3a1";
static const char ct_yellow[]   = "#f9e2af";
static const char ct_peach[]    = "#fab387";
static const char ct_red[]      = "#f38ba8";
static const char ct_mauve[]    = "#cba6f7";
static const char ct_pink[]     = "#f5c2e7";

static const char *colors[][3] = {
    /*                    fg           bg            border */
    [SchemeNorm]      = { ct_text,     ct_base,      ct_surface0 },
    [SchemeSel]       = { ct_crust,    ct_mauve,     ct_mauve },
    [SchemeTitle]     = { ct_text,     ct_base,      ct_base },
    [TabSel]          = { ct_mauve,    ct_surface0,  ct_mauve },
    [TabNorm]         = { ct_subtext,  ct_base,      ct_base },
    [SchemeTag]       = { ct_subtext,  ct_base,      ct_base },
    [SchemeTag1]      = { ct_lavender, ct_base,      ct_base },
    [SchemeTag2]      = { ct_sapphire, ct_base,      ct_base },
    [SchemeTag3]      = { ct_green,    ct_base,      ct_base },
    [SchemeTag4]      = { ct_yellow,   ct_base,      ct_base },
    [SchemeTag5]      = { ct_mauve,    ct_base,      ct_base },
    [SchemeLayout]    = { ct_teal,     ct_base,      ct_base },
    [SchemeBtnPrev]   = { ct_green,    ct_base,      ct_base },
    [SchemeBtnNext]   = { ct_yellow,   ct_base,      ct_base },
    [SchemeBtnClose]  = { ct_red,      ct_base,      ct_base },
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

    { MODKEY,                           XK_Return,  spawn,            SHCMD("foot || alacritty || xterm") },
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

    { MODKEY|ControlMask,               XK_t,       togglegaps,       {0} },
    { MODKEY|ControlMask,               XK_i,       incrgaps,         {.i = +1 } },
    { MODKEY|ControlMask,               XK_d,       incrgaps,         {.i = -1 } },
    { MODKEY|ControlMask|ShiftMask,     XK_d,       defaultgaps,      {0} },

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

#endif /* CATPPUCCIN_MOCHA_CONFIG_H */
